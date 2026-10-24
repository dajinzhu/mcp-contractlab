import console from 'node:console';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
const run = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), 'mcpcl-package-'));
try {
  const { stdout } = await run(
    'npm',
    ['pack', '--json', '--pack-destination', directory],
    { timeout: 60_000, maxBuffer: 1024 * 1024 },
  );
  const start = stdout.indexOf('[\n');
  const packed = JSON.parse(stdout.slice(start))[0];
  const files = packed.files.map((f) => f.path);
  for (const path of [
    'dist/src/cli.js',
    'dist/src/contracts/schema-worker.js',
    'dist/examples/servers/echo-server.js',
    'LICENSE',
  ])
    assert(files.includes(path), `Missing package file ${path}`);
  assert(
    !files.some(
      (f) =>
        f.startsWith('tests/') ||
        f.startsWith('node_modules/') ||
        f.includes('.env'),
    ),
    'Unexpected package content',
  );
  await run(
    'npm',
    [
      'install',
      '--prefix',
      directory,
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--cache',
      join(directory, 'npm-cache'),
      join(directory, packed.filename),
    ],
    { timeout: 120_000, maxBuffer: 1024 * 1024 },
  );
  const installed = join(directory, 'node_modules', 'mcp-contractlab');
  const manifest = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
  const binary = join(directory, 'node_modules', '.bin', 'mcpcl');
  const version = await run(binary, ['--version'], { timeout: 15_000 });
  assert.equal(version.stdout.trim(), manifest.version);
  const config = join(installed, 'examples', 'mcpcl.config.yaml');
  const passed = await run(
    binary,
    ['test', '-c', config, '--allow-exec', '--report', 'json'],
    { cwd: directory, timeout: 30_000 },
  );
  assert.equal(JSON.parse(passed.stdout).counts.passed, 3);
  let failed = false;
  try {
    await run(
      binary,
      [
        'test',
        '-c',
        join(installed, 'examples', 'mcpcl.broken.yaml'),
        '--allow-exec',
      ],
      { cwd: directory, timeout: 30_000 },
    );
  } catch (error) {
    assert.equal(error.code, 1);
    assert.match(error.stdout, /3 failed/);
    failed = true;
  }
  assert(failed, 'Broken packaged example unexpectedly passed');
  console.log(
    `Package verified: ${packed.filename}; ${files.length} files; installed CLI passes 3 contracts and rejects 3 broken contracts.`,
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
