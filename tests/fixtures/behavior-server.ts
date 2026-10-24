import { appendFileSync } from 'node:fs';
import { Server } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';

// Deliberately nonconforming *local* outputs exercise the runner's checks.
const trace = (message: string) => {
  if (process.env.MCPCL_TEST_TRACE)
    appendFileSync(process.env.MCPCL_TEST_TRACE, message + '\n');
};
trace(`PID ${process.pid}`);
const names = [
  'sum',
  'wrong',
  'error',
  'missing',
  'type',
  'null',
  'array',
  'hang',
  'secret',
  'crash',
  'flood',
];
serveStdio(
  () => {
    const server = new Server(
      { name: 'local-negative-fixture', version: '1.0.0' },
      {
        capabilities: { tools: {} },
        supportedProtocolVersions: ['2026-07-28'],
      },
    );
    server.setRequestHandler('tools/list', () => ({
      tools: names.map((name) => ({
        name,
        inputSchema:
          name === 'sum'
            ? {
                type: 'object',
                required: ['a', 'b'],
                properties: { a: { type: 'number' }, b: { type: 'number' } },
              }
            : { type: 'object' },
        outputSchema:
          name === 'array'
            ? { type: 'array', items: { type: 'number' } }
            : name === 'null'
              ? { type: 'null' }
              : name === 'secret'
                ? { type: 'object' }
                : {
                    type: 'object',
                    required: ['value'],
                    properties: { value: { type: 'number' } },
                  },
      })),
    }));
    server.setRequestHandler('tools/call', async (request) => {
      const name = request.params.name;
      trace(`CALL ${name}`);
      if (name === 'hang') await new Promise(() => {});
      if (name === 'crash') process.exit(7);
      if (name === 'flood') process.stderr.write('x'.repeat(128 * 1024));
      if (name === 'secret') {
        console.error('password=never-print-this-log');
        return {
          content: [],
          structuredContent: {
            token: 'never-print-this-token',
            value:
              process.env.MCPCL_TEST_SECRET ?? 'Bearer fixture-secret-value',
          },
        };
      }
      if (name === 'missing') return { content: [] };
      const content =
        name === 'array'
          ? [1, 2]
          : name === 'null'
            ? null
            : {
                value:
                  name === 'wrong'
                    ? 6
                    : name === 'type'
                      ? 'five'
                      : name === 'sum'
                        ? Number(request.params.arguments?.a) +
                          Number(request.params.arguments?.b)
                        : 5,
              };
      return {
        content: [],
        structuredContent: content,
        isError: name === 'error',
      };
    });
    return server;
  },
  { legacy: 'reject' },
);
