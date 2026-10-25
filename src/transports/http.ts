import { message } from '../i18n/message.js';
import { lookup } from 'node:dns/promises';
import type { LookupAddress, LookupOptions } from 'node:dns';
import ipaddr from 'ipaddr.js';
import { Agent, fetch as networkFetch } from 'undici';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { Failure, type Config } from '../types.js';
import { registerSecrets } from '../reports/redact.js';
import { version } from '../version.js';

type HttpServer = Extract<Config['server'], { transport: 'streamable-http' }>;
interface HttpDependencies {
  resolve?: (host: string) => Promise<LookupAddress[]>;
  send?: (request: Request, addresses: LookupAddress[]) => Promise<Response>;
}
export function publicAddresses(addresses: LookupAddress[]): LookupAddress[] {
  if (!addresses.length) throw new Failure(2, message('http.noAddresses'));
  return addresses.map(({ address }) => {
    let ip;
    try {
      ip = ipaddr.process(address);
    } catch {
      throw new Failure(3, message('http.invalidAddress'));
    }
    if (ip.range() !== 'unicast')
      throw new Failure(3, message('http.privateAddress'));
    return { address: ip.toString(), family: ip.kind() === 'ipv4' ? 4 : 6 };
  });
}
export function approvedEndpoint(endpoint: string, hosts: string[]): URL {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Failure(2, message('http.invalidEndpoint'));
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    !hosts.map((h) => h.toLowerCase()).includes(url.hostname.toLowerCase())
  )
    throw new Failure(3, message('http.endpointPolicy'));
  return url;
}

/** Test injection is internal: CLI always uses real DNS and the pinned TLS agent. */
export async function guardedHttp(
  server: HttpServer,
  hosts: string[],
  signal: AbortSignal,
  dependencies: HttpDependencies = {},
) {
  const endpoint = approvedEndpoint(server.url, hosts);
  const hostname = endpoint.hostname.replace(/^\[|\]$/g, '');
  const dnsSignal = AbortSignal.any([
    signal,
    AbortSignal.timeout(server.timeoutMs),
  ]);
  let removeAbort = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    const stop = () => reject(new Failure(2, message('http.dnsTimeout')));
    dnsSignal.addEventListener('abort', stop, { once: true });
    removeAbort = () => dnsSignal.removeEventListener('abort', stop);
    if (dnsSignal.aborted) stop();
  });
  let addresses: LookupAddress[];
  try {
    addresses = publicAddresses(
      await Promise.race([
        (
          dependencies.resolve ??
          ((host) => lookup(host, { all: true, verbatim: true }))
        )(hostname),
        cancelled,
      ]),
    );
  } finally {
    removeAbort();
  }
  let issue: Failure | undefined;
  const token = server.authEnv ? process.env[server.authEnv] : undefined;
  if (server.authEnv && (!token || /[\r\n]/.test(token)))
    throw new Failure(2, message('http.credentials'));
  if (token) registerSecrets([token]);
  // DNS is resolved and checked once; the connector can only dial these addresses.
  const agent = dependencies.send
    ? undefined
    : new Agent({
        connect: {
          lookup: (
            _host: string,
            options: LookupOptions,
            callback: (
              error: NodeJS.ErrnoException | null,
              address: string | LookupAddress[],
              family?: number,
            ) => void,
          ) => {
            if (_host.toLowerCase() !== hostname.toLowerCase()) {
              callback(new Error('Unexpected connector host'), '');
              return;
            }
            if (options.all) callback(null, addresses);
            else callback(null, addresses[0]!.address, addresses[0]!.family);
          },
        },
      });
  let total = 0;
  const fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    try {
      const request = new Request(input, init);
      if (
        request.url !== endpoint.href ||
        !['POST', 'GET', 'DELETE'].includes(request.method)
      )
        throw new Failure(3, message('http.outsideEndpoint'));
      const headers = new Headers(request.headers);
      headers.delete('authorization');
      if (token) headers.set('authorization', `Bearer ${token}`);
      const body = request.body ? await request.arrayBuffer() : undefined;
      if (body && body.byteLength > 1024 * 1024)
        throw new Failure(2, message('http.requestLarge'));
      const safeRequest = new Request(endpoint, {
        method: request.method,
        headers,
        signal: AbortSignal.any([signal, request.signal]),
        ...(body ? { body } : {}),
      });
      const response = dependencies.send
        ? await dependencies.send(safeRequest, addresses)
        : ((await networkFetch(endpoint, {
            method: safeRequest.method,
            headers: Object.fromEntries(headers),
            signal: safeRequest.signal,
            redirect: 'manual',
            dispatcher: agent!,
            ...(body ? { body: new Uint8Array(body) } : {}),
          })) as unknown as Response);
      if (response.status >= 300 && response.status < 400) {
        void response.body?.cancel();
        throw new Failure(3, message('http.redirect'));
      }
      if (!response.body)
        return new Response(null, {
          status: response.status,
          headers: response.headers,
        });
      const reader = response.body.getReader();
      let bytes = 0;
      const cancel = () => {
        void reader.cancel().catch(() => {});
      };
      safeRequest.signal.addEventListener('abort', cancel, { once: true });
      const bodyStream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const next = await reader.read();
            if (next.done) {
              safeRequest.signal.removeEventListener('abort', cancel);
              controller.close();
              return;
            }
            bytes += next.value.byteLength;
            total += next.value.byteLength;
            if (bytes > 64 * 1024 || total > 2 * 1024 * 1024)
              throw new Failure(2, message('http.responseLarge'));
            controller.enqueue(next.value);
          } catch (error) {
            issue =
              error instanceof Failure
                ? error
                : new Failure(2, message('http.streamFailed'));
            safeRequest.signal.removeEventListener('abort', cancel);
            cancel();
            controller.error(issue);
          }
        },
        cancel() {
          safeRequest.signal.removeEventListener('abort', cancel);
          cancel();
        },
      });
      return new Response(bodyStream, {
        status: response.status,
        headers: response.headers,
      });
    } catch (error) {
      issue =
        error instanceof Failure
          ? error
          : new Failure(2, message('http.requestFailed'));
      throw issue;
    }
  };
  return {
    fetch,
    issue: () => issue,
    close: async () => {
      await agent?.close();
    },
  };
}

export async function withHttpSession<T>(
  config: Config & { server: HttpServer },
  signal: AbortSignal,
  body: (client: Client, signal: AbortSignal) => Promise<T>,
  dependencies: HttpDependencies = {},
): Promise<T> {
  const controller = new AbortController();
  const combined = AbortSignal.any([signal, controller.signal]);
  const timer = setTimeout(
    () => controller.abort(),
    Math.min(
      300_000,
      config.server.timeoutMs +
        config.safety.maxToolCalls * (config.safety.toolTimeoutMs + 4000),
    ),
  );
  let gate: Awaited<ReturnType<typeof guardedHttp>> | undefined;
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
  try {
    gate = await guardedHttp(
      config.server,
      config.safety.allowedHttpHosts ?? [],
      combined,
      dependencies,
    );
    const transport = new StreamableHTTPClientTransport(
      new URL(config.server.url),
      {
        fetch: gate.fetch,
        requestInit: { redirect: 'manual' },
        reconnectionOptions: {
          maxRetries: 0,
          initialReconnectionDelay: 1000,
          maxReconnectionDelay: 1000,
          reconnectionDelayGrowFactor: 1,
        },
      },
    );
    await client.connect(transport, {
      signal: combined,
      timeout: config.server.timeoutMs,
      maxTotalTimeout: config.server.timeoutMs,
    });
    const result = await body(client, combined);
    if (gate.issue()) throw gate.issue();
    if (combined.aborted) throw new Failure(2, message('http.sessionTimeout'));
    return result;
  } catch (error) {
    throw (
      gate?.issue() ??
      (error instanceof Failure
        ? error
        : new Failure(2, message('http.failed')))
    );
  } finally {
    clearTimeout(timer);
    controller.abort();
    await client.close();
    await gate?.close();
  }
}
