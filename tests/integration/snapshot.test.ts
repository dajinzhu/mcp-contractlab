import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
const execute = promisify(execFile);
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});
async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'mcpcl-snapshot-'));
  directories.push(dir);
  const config = join(dir, 'config.json'),
    baseline = join(dir, 'baseline.json'),
    trace = join(dir, 'trace');
  await writeFile(
    config,
    JSON.stringify({
      schemaVersion: 1,
      server: {
        name: 'fixture',
        transport: 'stdio',
        command: process.execPath,
        args: [resolve('dist/tests/fixtures/behavior-server.js')],
        env: ['MCPCL_TEST_TRACE'],
      },
      safety: { allowToolCalls: [] },
    }),
  );
  const run = async (command: string, args: string[] = []) => {
    try {
      const result = await execute(
        process.execPath,
        [
          resolve('dist/src/cli.js'),
          command,
          '-c',
          config,
          '--allow-exec',
          ...args,
        ],
        {
          env: { MCPCL_TEST_TRACE: trace },
          timeout: 15_000,
          maxBuffer: 256 * 1024,
        },
      );
      return { ...result, code: 0 };
    } catch (error) {
      const e = error as Error & {
        code: number;
        stdout: string;
        stderr: string;
      };
      if (typeof e.code !== 'number') throw e;
      return e;
    }
  };
  expect((await run('snapshot', ['--output', baseline])).code).toBe(0);
  return { dir, config, baseline, trace, run };
}
it('writes deterministic snapshots only explicitly and diff never calls tools', async () => {
  const { baseline, trace, run } = await setup();
  const original = await readFile(baseline, 'utf8');
  expect((await run('snapshot', ['--output', baseline])).code).toBe(2);
  expect(await readFile(baseline, 'utf8')).toBe(original);
  expect((await run('snapshot', ['--output', baseline, '--force'])).code).toBe(
    0,
  );
  expect(await readFile(baseline, 'utf8')).toBe(original);
  const result = await run('diff', ['--baseline', baseline]);
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout).changes).toEqual([]);
  expect(await readFile(baseline, 'utf8')).toBe(original);
  expect(await readFile(trace, 'utf8')).not.toContain('CALL');
});
it('fails a real removed-tool gate and preserves the baseline', async () => {
  const { baseline, trace, run } = await setup();
  const data = JSON.parse(await readFile(baseline, 'utf8'));
  data.tools.push({ name: 'removed-tool', inputSchema: { type: 'object' } });
  const text = JSON.stringify(data);
  await writeFile(baseline, text);
  const result = await run('diff', ['--baseline', baseline]);
  expect(result.code).toBe(1);
  expect(JSON.parse(result.stdout).changes).toContainEqual(
    expect.objectContaining({
      tool: 'removed-tool',
      classification: 'BREAKING',
    }),
  );
  expect(await readFile(baseline, 'utf8')).toBe(text);
  expect(await readFile(trace, 'utf8')).not.toContain('CALL');
});
it('reports REVIEW without a false breaking gate and fails strict UNKNOWN', async () => {
  const { baseline, run } = await setup();
  const data = JSON.parse(await readFile(baseline, 'utf8'));
  data.tools[0].description = 'Older description';
  await writeFile(baseline, JSON.stringify(data));
  let result = await run('diff', ['--baseline', baseline]);
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout).changes[0].classification).toBe('REVIEW');
  data.tools[0].inputSchema = { anyOf: [{ type: 'object' }] };
  await writeFile(baseline, JSON.stringify(data));
  result = await run('diff', ['--baseline', baseline, '--strict']);
  expect(result.code).toBe(1);
  expect(
    JSON.parse(result.stdout).changes.some(
      (c: { classification: string }) => c.classification === 'UNKNOWN',
    ),
  ).toBe(true);
});
it('refuses report/config or report/baseline collisions', async () => {
  const { config, baseline, run } = await setup();
  expect((await run('snapshot', ['--output', config, '--force'])).code).toBe(2);
  expect(
    (await run('diff', ['--baseline', baseline, '--output', baseline])).code,
  ).toBe(2);
});
