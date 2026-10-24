import { expect, it } from 'vitest';
import type { JSONRPCMessage } from '@modelcontextprotocol/client';
import {
  createFixtureClient,
  protocolVersion,
  requestOptions,
} from '../../dist/examples/fixture-client.js';

function expectExited(pid: number | null) {
  expect(pid).not.toBeNull();
  return expect
    .poll(() => {
      try {
        process.kill(pid!, 0);
        return false;
      } catch (error) {
        return (error as NodeJS.ErrnoException).code === 'ESRCH';
      }
    })
    .toBe(true);
}

it('discovers exactly two tools without calls or a legacy handshake', async () => {
  const { client, transport } = createFixtureClient();
  const sent: JSONRPCMessage[] = [];
  const send = transport.send.bind(transport);
  transport.send = (message) => {
    sent.push(message);
    return send(message);
  };
  let pid: number | null;
  try {
    await client.connect(transport);
    pid = transport.pid;
    expect(client.getProtocolEra()).toBe('modern');
    expect(client.getNegotiatedProtocolVersion()).toBe(protocolVersion);
    expect(client.getDiscoverResult()?.supportedVersions).toEqual([
      protocolVersion,
    ]);
    // connect() probes on an SDK-owned disposable sibling process. Explicitly
    // exercise discover on this transport too; do not implement the wire format.
    const discovery = await client.discover(requestOptions);
    expect(discovery.supportedVersions).toEqual([protocolVersion]);
    const result = await client.listTools({}, requestOptions);
    expect(result.tools.map((tool) => tool.name).sort()).toEqual([
      'echo',
      'sum',
    ]);
    const sum = result.tools.find((tool) => tool.name === 'sum');
    expect(sum?.inputSchema).toMatchObject({
      type: 'object',
      required: ['a', 'b'],
      properties: { a: { type: 'number' }, b: { type: 'number' } },
    });
    expect(sum?.outputSchema).toMatchObject({
      type: 'object',
      required: ['value'],
      properties: { value: { type: 'number' } },
    });
    const requests = sent.filter((message) => 'method' in message);
    expect(requests.map((message) => message.method)).toEqual([
      'server/discover',
      'tools/list',
    ]);
    for (const message of requests) {
      expect(message.params?._meta).toMatchObject({
        'io.modelcontextprotocol/protocolVersion': protocolVersion,
      });
    }
  } finally {
    await client.close();
    await transport.close();
  }
  await expectExited(pid);
});

it('calls only the explicitly named local sum and receives structured output', async () => {
  const { client, transport } = createFixtureClient();
  try {
    await client.connect(transport);
    const received: JSONRPCMessage[] = [];
    const receive = transport.onmessage;
    transport.onmessage = (message) => {
      received.push(message);
      receive?.(message);
    };
    await client.listTools({}, requestOptions);
    const result = await client.callTool(
      { name: 'sum', arguments: { a: 2, b: 3 } },
      requestOptions,
    );
    // v2 consumes resultType when decoding the high-level callTool result.
    expect(received).toContainEqual(
      expect.objectContaining({
        result: expect.objectContaining({
          resultType: 'complete',
          structuredContent: { value: 5 },
        }),
      }),
    );
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toEqual({ value: 5 });
    expect(result.content).toEqual([{ type: 'text', text: '{"value":5}' }]);
  } finally {
    await client.close();
    await transport.close();
  }
});

it('rejects invalid sum arguments through the official server SDK', async () => {
  const { client, transport } = createFixtureClient();
  try {
    await client.connect(transport);
    const result = await client.callTool(
      { name: 'sum', arguments: { a: 'not a number', b: 3 } },
      requestOptions,
    );
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  } finally {
    await client.close();
    await transport.close();
  }
});

it('closes the child even when the caller fails after connecting', async () => {
  const { client, transport } = createFixtureClient();
  let pid: number | null = null;
  await expect(async () => {
    try {
      await client.connect(transport);
      pid = transport.pid;
      throw new Error('deliberate caller failure');
    } finally {
      await client.close();
      await transport.close();
    }
  }).rejects.toThrow('deliberate caller failure');
  await expectExited(pid);
});
