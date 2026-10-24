import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { sum } from './sum.js';

// The SDK owns protocol metadata and lifecycle. Never log on MCP stdout.
serveStdio(
  () => {
    const server = new McpServer(
      { name: 'mcp-contractlab-local-example', version: '0.0.0' },
      { supportedProtocolVersions: ['2026-07-28'] },
    );
    server.registerTool(
      'sum',
      {
        description: 'Add two finite numbers and return their sum as value.',
        inputSchema: z.object({ a: z.number(), b: z.number() }),
        outputSchema: z.object({ value: z.number() }),
      },
      ({ a, b }) => {
        const output = sum(a, b);
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
          isError: false,
        };
      },
    );
    server.registerTool(
      'echo',
      {
        description: 'Return a bounded local string without external effects.',
        inputSchema: z.object({ message: z.string().max(1024) }),
        outputSchema: z.object({ message: z.string().max(1024) }),
      },
      ({ message }) => ({
        content: [{ type: 'text', text: message }],
        structuredContent: { message },
        isError: false,
      }),
    );
    return server;
  },
  { legacy: 'reject' },
);
