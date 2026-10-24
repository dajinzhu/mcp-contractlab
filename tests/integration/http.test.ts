import { afterEach, expect, it, vi } from 'vitest';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { withHttpSession } from '../../src/transports/http.js';
import { discover } from '../../src/runner/run-suite.js';

afterEach(() => vi.unstubAllEnvs());
const config = {
  schemaVersion: 1 as const,
  server: {
    name: 'http',
    transport: 'streamable-http' as const,
    url: 'https://fixture.example/mcp',
    timeoutMs: 2000,
    authEnv: 'MCPCL_HTTP_TOKEN',
  },
  safety: {
    allowToolCalls: ['sum'],
    allowedHttpHosts: ['fixture.example'],
    maxToolCalls: 1,
    toolTimeoutMs: 2000,
  },
  cases: [],
};
it('uses the real official modern HTTP client/server APIs with explicit bearer authentication', async () => {
  vi.stubEnv('MCPCL_HTTP_TOKEN', 'fictional-http-secret-value');
  const methods: string[] = [];
  let calls = 0;
  const handler = createMcpHandler(
    () => {
      const server = new McpServer(
        { name: 'http-fixture', version: '1.0.0' },
        { supportedProtocolVersions: ['2026-07-28'] },
      );
      server.registerTool(
        'sum',
        {
          inputSchema: z.object({ a: z.number(), b: z.number() }),
          outputSchema: z.object({ value: z.number() }),
        },
        ({ a, b }) => {
          calls++;
          return { content: [], structuredContent: { value: a + b } };
        },
      );
      return server;
    },
    { legacy: 'reject', responseMode: 'json' },
  );
  try {
    await withHttpSession(
      config,
      new AbortController().signal,
      async (client, signal) => {
        expect(client.getProtocolEra()).toBe('modern');
        const tools = await discover(client, config, signal);
        expect(tools.map((t) => t.name)).toEqual(['sum']);
        expect(calls).toBe(0);
        const result = await client.request(
          {
            method: 'tools/call',
            params: { name: 'sum', arguments: { a: 2, b: 3 } },
          },
          { signal, timeout: 2000 },
        );
        expect(result.structuredContent).toEqual({ value: 5 });
      },
      {
        resolve: async () => [{ address: '93.184.216.34', family: 4 }],
        send: async (request) => {
          expect(request.headers.get('authorization')).toBe(
            'Bearer fictional-http-secret-value',
          );
          if (request.method === 'POST') {
            const message = await request.clone().json();
            methods.push(message.method);
            expect(
              message.params._meta['io.modelcontextprotocol/protocolVersion'],
            ).toBe('2026-07-28');
          }
          return handler.fetch(request);
        },
      },
    );
    expect(calls).toBe(1);
    expect(methods).toContain('tools/list');
    expect(methods).not.toContain('initialize');
  } finally {
    await handler.close();
  }
});
it('does not follow redirects or invoke an OAuth discovery destination', async () => {
  vi.stubEnv('MCPCL_HTTP_TOKEN', 'fixture-only-secret');
  let requests = 0;
  await expect(
    withHttpSession(config, new AbortController().signal, async () => {}, {
      resolve: async () => [{ address: '93.184.216.34', family: 4 }],
      send: async () => {
        requests++;
        return new Response(null, {
          status: 307,
          headers: { location: 'http://169.254.169.254/' },
        });
      },
    }),
  ).rejects.toMatchObject({ code: 3 });
  expect(requests).toBe(1);
});

it('does not perform OAuth discovery or credential refresh after a 401', async () => {
  vi.stubEnv('MCPCL_HTTP_TOKEN', 'fixture-only-secret');
  let requests = 0;
  await expect(
    withHttpSession(config, new AbortController().signal, async () => {}, {
      resolve: async () => [{ address: '93.184.216.34', family: 4 }],
      send: async () => {
        requests++;
        return new Response(null, {
          status: 401,
          headers: {
            'www-authenticate':
              'Bearer resource_metadata="http://169.254.169.254/metadata"',
          },
        });
      },
    }),
  ).rejects.toMatchObject({ code: 2 });
  expect(requests).toBe(1);
});

it('times out an unresponsive HTTP exchange and aborts its request', async () => {
  vi.stubEnv('MCPCL_HTTP_TOKEN', 'fixture-only-secret');
  let aborted = false;
  await expect(
    withHttpSession(
      { ...config, server: { ...config.server, timeoutMs: 100 } },
      new AbortController().signal,
      async () => {},
      {
        resolve: async () => [{ address: '93.184.216.34', family: 4 }],
        send: (request) =>
          new Promise((_, reject) => {
            request.signal.addEventListener(
              'abort',
              () => {
                aborted = true;
                reject(new Error('cancelled'));
              },
              { once: true },
            );
          }),
      },
    ),
  ).rejects.toMatchObject({ code: 2 });
  expect(aborted).toBe(true);
});
