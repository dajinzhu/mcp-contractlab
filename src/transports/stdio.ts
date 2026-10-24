import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import type { Config } from '../types.js';
import { Failure } from '../types.js';
import { withHttpSession } from './http.js';
import { version } from '../version.js';
import { registerSecrets } from '../reports/redact.js';

// A subclass makes SDK version probing use this same bounded transport rather
// than launching an unobserved disposable sibling process.
class BoundedStdio extends StdioClientTransport {
  constructor(
    server: Extract<Config['server'], { transport: 'stdio' }>,
    private readonly fail: () => void,
  ) {
    const env: Record<string, string> = {};
    for (const key of server.env) {
      if (process.env[key] === undefined)
        throw new Failure(
          2,
          'An explicitly allowed environment variable is missing',
        );
      env[key] = process.env[key];
    }
    registerSecrets(
      server.env
        .filter((key) => /token|secret|password|key|credential/i.test(key))
        .map((key) => env[key]!),
    );
    super({
      command: server.command,
      args: server.args,
      cwd: server.cwd,
      env,
      stderr: 'pipe',
      maxBufferSize: 64 * 1024,
    });
  }
  override async start() {
    let received = 0;
    let stderr = 0;
    const receive = this.onmessage;
    this.onmessage = (message) => {
      received += Buffer.byteLength(JSON.stringify(message));
      if (received > 2 * 1024 * 1024) {
        this.fail();
        return;
      }
      receive?.(message);
    };
    const onerror = this.onerror;
    this.onerror = (error) => {
      this.fail();
      onerror?.(error);
    };
    this.stderr?.on('data', (data: Buffer) => {
      stderr += data.length;
      if (stderr > 64 * 1024) this.fail();
      // Consume and discard; never retain or print raw server logs.
    });
    await super.start();
  }
}

async function ensureExited(pid: number | null): Promise<void> {
  if (pid === null) return;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return;
      throw new Failure(2, 'Cannot confirm server cleanup');
    }
    await delay(20);
  }
  throw new Failure(2, 'Server did not exit after cleanup');
}

export async function withSession<T>(
  config: Config,
  signal: AbortSignal,
  body: (client: Client, signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const server = config.server;
  if (server.transport === 'streamable-http')
    return withHttpSession({ ...config, server }, signal, body);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const deadline = setTimeout(
    abort,
    Math.min(
      300_000,
      config.server.timeoutMs +
        config.safety.maxToolCalls * (config.safety.toolTimeoutMs + 4000),
    ),
  );
  const client = new Client(
    { name: 'mcp-contractlab', version },
    {
      supportedProtocolVersions: ['2026-07-28'],
      versionNegotiation: {
        mode: { pin: '2026-07-28' },
        probe: { timeoutMs: config.server.timeoutMs, maxRetries: 0 },
      },
      inputRequired: { autoFulfill: false },
      listMaxPages: 16,
    },
  );
  let transport: BoundedStdio | undefined;
  let pid: number | null = null;
  try {
    transport = new BoundedStdio(server, abort);
    await client.connect(transport, {
      signal: controller.signal,
      timeout: config.server.timeoutMs,
      maxTotalTimeout: config.server.timeoutMs,
    });
    pid = transport.pid;
    return await body(client, controller.signal);
  } catch (error) {
    if (error instanceof Failure) throw error;
    throw new Failure(
      2,
      controller.signal.aborted
        ? 'Server interrupted or output/time budget exceeded'
        : 'Server launch, timeout, protocol or transport failure',
    );
  } finally {
    clearTimeout(deadline);
    signal.removeEventListener('abort', abort);
    pid ??= transport?.pid ?? null;
    await client.close();
    await transport?.close();
    await ensureExited(pid);
  }
}
