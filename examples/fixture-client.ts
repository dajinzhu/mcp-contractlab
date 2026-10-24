import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

export const protocolVersion = '2026-07-28';
export const requestOptions = { timeout: 3_000, maxTotalTimeout: 3_000 };

/** Only the checked-in, compiled local fixture can be launched by this demo. */
export function createFixtureClient() {
  const client = new Client(
    { name: 'mcp-contractlab-smoke', version: '0.0.0' },
    {
      supportedProtocolVersions: [protocolVersion],
      versionNegotiation: {
        mode: { pin: protocolVersion },
        probe: { timeoutMs: 3_000, maxRetries: 0 },
      },
      inputRequired: { autoFulfill: false },
    },
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('./servers/echo-server.js', import.meta.url))],
    // Discard fixture stderr instead of exposing potentially sensitive data.
    stderr: 'ignore',
    maxBufferSize: 64 * 1024,
  });
  return { client, transport };
}
