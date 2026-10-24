import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it.each(['2025-11-25', '2025-06-18'])(
  'rejects legacy %s clients against the modern-only fixture without tool calls',
  async (revision) => {
    // Intentional compatibility experiment, not an application fallback path.
    const client = new Client(
      { name: 'negative-compatibility-check', version: '1.0.0' },
      {
        supportedProtocolVersions: [revision],
        versionNegotiation: { mode: 'legacy' },
      },
    );
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [resolve('dist/examples/servers/echo-server.js')],
      stderr: 'ignore',
      maxBufferSize: 64 * 1024,
    });
    const methods: string[] = [];
    const send = transport.send.bind(transport);
    transport.send = (message) => {
      if ('method' in message) methods.push(message.method);
      return send(message);
    };
    try {
      await expect(
        client.connect(transport, { timeout: 1000, maxTotalTimeout: 1000 }),
      ).rejects.toThrow();
      expect(methods).toContain('initialize');
      expect(methods).not.toContain('tools/call');
    } finally {
      await client.close();
      await transport.close();
    }
  },
);
