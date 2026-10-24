import { afterEach, expect, it, vi } from 'vitest';
import {
  approvedEndpoint,
  publicAddresses,
  guardedHttp,
} from '../../src/transports/http.js';

const server = {
  name: 'http-fixture',
  transport: 'streamable-http' as const,
  url: 'https://fixture.example/mcp',
  timeoutMs: 500,
};
const resolve = async () => [{ address: '93.184.216.34', family: 4 }];
afterEach(() => vi.unstubAllEnvs());
it.each([
  '127.0.0.1',
  '10.1.2.3',
  '172.16.0.1',
  '192.168.1.1',
  '169.254.169.254',
  '100.64.0.1',
  '0.0.0.0',
  '224.0.0.1',
  '::1',
  'fe80::1',
  'fc00::1',
  '::ffff:127.0.0.1',
  '2001:db8::1',
])('blocks nonpublic address %s', (address) => {
  expect(() =>
    publicAddresses([{ address, family: address.includes(':') ? 6 : 4 }]),
  ).toThrow();
});
it('allows public addresses but rejects mixed safe/unsafe DNS answers', () => {
  expect(
    publicAddresses([{ address: '93.184.216.34', family: 4 }]),
  ).toHaveLength(1);
  expect(() =>
    publicAddresses([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]),
  ).toThrow();
});
it.each([
  'http://fixture.example/mcp',
  'https://unapproved.example/mcp',
  'https://user:password@fixture.example/mcp',
  'https://fixture.example/mcp?token=value',
  'https://fixture.example/mcp#fragment',
])('blocks unauthorized endpoint %#', (endpoint) => {
  expect(() => approvedEndpoint(endpoint, ['fixture.example'])).toThrow();
});
it('pins resolved public addresses once and confines requests to the exact endpoint', async () => {
  const dns = vi.fn(resolve);
  const send = vi.fn(async (_request: Request, addresses: unknown) => {
    expect(addresses).toEqual([{ address: '93.184.216.34', family: 4 }]);
    return new Response('{}');
  });
  const gate = await guardedHttp(
    server,
    ['fixture.example'],
    new AbortController().signal,
    { resolve: dns, send },
  );
  try {
    await (await gate.fetch(server.url, { method: 'POST', body: '{}' })).text();
    await (await gate.fetch(server.url, { method: 'POST', body: '{}' })).text();
    expect(dns).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(2);
    await expect(
      gate.fetch('https://fixture.example/other', { method: 'POST' }),
    ).rejects.toMatchObject({ code: 3 });
    expect(send).toHaveBeenCalledTimes(2);
  } finally {
    await gate.close();
  }
});
it('blocks redirects without sending credentials to their destination', async () => {
  vi.stubEnv('MCPCL_HTTP_TOKEN', 'fictional-http-credential');
  const send = vi.fn(async (request: Request) => {
    expect(request.headers.get('authorization')).toBe(
      'Bearer fictional-http-credential',
    );
    return new Response(null, {
      status: 307,
      headers: { location: 'https://other.example/mcp' },
    });
  });
  const gate = await guardedHttp(
    { ...server, authEnv: 'MCPCL_HTTP_TOKEN' },
    ['fixture.example'],
    new AbortController().signal,
    { resolve, send },
  );
  try {
    await expect(
      gate.fetch(server.url, { method: 'POST', body: '{}' }),
    ).rejects.toMatchObject({ code: 3 });
    expect(send).toHaveBeenCalledTimes(1);
  } finally {
    await gate.close();
  }
});
it('bounds response bodies and records the failure', async () => {
  const gate = await guardedHttp(
    server,
    ['fixture.example'],
    new AbortController().signal,
    { resolve, send: async () => new Response('x'.repeat(70 * 1024)) },
  );
  try {
    const response = await gate.fetch(server.url, { method: 'POST' });
    await expect(response.text()).rejects.toThrow('budget');
    expect(gate.issue()?.code).toBe(2);
  } finally {
    await gate.close();
  }
});
it('bounds DNS resolution time without contacting a server', async () => {
  const send = vi.fn(async () => new Response('{}'));
  await expect(
    guardedHttp(
      { ...server, timeoutMs: 50 },
      ['fixture.example'],
      new AbortController().signal,
      { resolve: () => new Promise(() => {}), send },
    ),
  ).rejects.toMatchObject({ code: 2 });
  expect(send).not.toHaveBeenCalled();
});
it('requires an explicitly configured credential binding when requested', async () => {
  vi.stubEnv('MCPCL_HTTP_TOKEN', '');
  await expect(
    guardedHttp(
      { ...server, authEnv: 'MCPCL_HTTP_TOKEN' },
      ['fixture.example'],
      new AbortController().signal,
      { resolve, send: async () => new Response('{}') },
    ),
  ).rejects.toMatchObject({ code: 2 });
});
