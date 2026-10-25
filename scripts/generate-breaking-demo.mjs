import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import process from 'node:process';
import console from 'node:console';
const run = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), 'mcpcl-breaking-demo-'));
try {
  const baseline = join(directory, 'before.snapshot.json');
  const output = join(directory, 'removed-tool.diff.json');
  await run(
    process.execPath,
    [
      'dist/src/cli.js',
      'snapshot',
      '-c',
      resolve('examples/mcpcl.config.yaml'),
      '--allow-exec',
      '--output',
      baseline,
    ],
    { timeout: 15000 },
  );
  let status = 0;
  try {
    await run(
      process.execPath,
      [
        'dist/src/cli.js',
        'diff',
        '-c',
        resolve('examples/mcpcl.removed-tool.yaml'),
        '--allow-exec',
        '--baseline',
        baseline,
        '--output',
        output,
      ],
      { timeout: 15000 },
    );
  } catch (error) {
    status = error.code;
  }
  assert.equal(status, 1);
  const report = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(report.exitCode, 1);
  assert.deepEqual(report.changes, [
    {
      tool: 'sum',
      path: '',
      classification: 'BREAKING',
      reason: 'Tool removed',
    },
  ]);
  await mkdir('docs/demos', { recursive: true });
  await copyFile(output, 'docs/demos/removed-tool.diff.json');
  console.log(
    'Actual local server change: echo + sum → echo only. One BREAKING sum removal; exit 1; no tools/call.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
