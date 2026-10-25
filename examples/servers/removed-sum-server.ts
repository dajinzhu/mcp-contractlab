import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

// Deliberate local breaking change: same echo contract, but sum no longer exists.
// Used only for the documented before/after compatibility demonstration.
serveStdio(
  () => {
    const server = new McpServer(
      { name: 'mcp-contractlab-removed-tool-example', version: '0.0.0' },
      { supportedProtocolVersions: ['2026-07-28'] },
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
