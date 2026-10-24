import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

it('executes explicit parameter rows and reports completed versus untested tools', async () => {
  const result = await promisify(execFile)(
    process.execPath,
    [
      resolve('dist/src/cli.js'),
      'test',
      '-c',
      'examples/mcpcl.parameterized.yaml',
      '--allow-exec',
      '--report',
      'json',
    ],
    { timeout: 15000 },
  );
  const report = JSON.parse(result.stdout);
  expect(report.counts.passed).toBe(3);
  expect(report.cases.map((c: { id: string }) => c.id)).toEqual([
    'sum-table/positive',
    'sum-table/zero',
    'sum-table/negative',
  ]);
  expect(report.coverage.completedTools).toEqual(['sum']);
  expect(report.coverage.untestedTools).toEqual(['echo']);
});
it('applies the call budget to expanded rows before launching', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcpcl-table-budget-'));
  try {
    const file = join(dir, 'config.yaml');
    await writeFile(
      file,
      (await readFile('examples/mcpcl.parameterized.yaml', 'utf8')).replace(
        'maxToolCalls: 3',
        'maxToolCalls: 2',
      ),
    );
    await expect(
      promisify(execFile)(
        process.execPath,
        [
          resolve('dist/src/cli.js'),
          'test',
          '-c',
          file,
          '--allow-exec',
          '--report',
          'json',
        ],
        { timeout: 15000 },
      ),
    ).rejects.toMatchObject({ code: 3 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it('uses separate HTTP consent and blocks private endpoints even when explicitly named', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcpcl-http-policy-'));
  try {
    const file = join(dir, 'config.json');
    await writeFile(
      file,
      JSON.stringify({
        schemaVersion: 1,
        server: {
          name: 'blocked-http',
          transport: 'streamable-http',
          url: 'https://127.0.0.1/mcp',
        },
        safety: { allowToolCalls: ['sum'], allowedHttpHosts: ['127.0.0.1'] },
        cases: [
          { id: 'sum', tool: 'sum', arguments: { a: 2, b: 3 }, expect: {} },
        ],
      }),
    );
    for (const flag of ['--allow-exec', '--allow-http'])
      await expect(
        promisify(execFile)(
          process.execPath,
          [
            resolve('dist/src/cli.js'),
            'test',
            '-c',
            file,
            flag,
            '--report',
            'json',
          ],
          { timeout: 15000 },
        ),
      ).rejects.toMatchObject({ code: 3 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
