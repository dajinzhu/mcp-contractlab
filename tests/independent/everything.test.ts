import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, it } from 'vitest';

it('discovers and explicitly calls only echo on the independent Everything server v2.0.0', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcpcl-independent-'));
  try {
    const config = join(dir, 'config.json');
    await writeFile(
      config,
      JSON.stringify({
        schemaVersion: 1,
        server: {
          name: 'independent-everything',
          transport: 'stdio',
          command: process.execPath,
          args: [
            resolve(
              'tests/fixtures/independent/node_modules/@modelcontextprotocol/server-everything/dist/index.js',
            ),
            'stdio',
          ],
          timeoutMs: 5000,
        },
        safety: {
          allowToolCalls: ['echo'],
          maxToolCalls: 1,
          toolTimeoutMs: 5000,
        },
        cases: [
          {
            id: 'independent-echo',
            tool: 'echo',
            arguments: { message: 'fixture-value' },
            expect: {
              assertions: [
                {
                  path: '/content/0/text',
                  operator: 'equals',
                  value: 'Echo: fixture-value',
                },
              ],
            },
          },
        ],
      }),
    );
    const result = await promisify(execFile)(
      process.execPath,
      [
        resolve('dist/src/cli.js'),
        'test',
        '-c',
        config,
        '--allow-exec',
        '--report',
        'json',
      ],
      { timeout: 15000, maxBuffer: 128 * 1024 },
    );
    const report = JSON.parse(result.stdout);
    expect(report.exitCode).toBe(0);
    expect(report.counts.passed).toBe(1);
    expect(report.cases).toHaveLength(1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
