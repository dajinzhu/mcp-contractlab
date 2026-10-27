import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import process from 'node:process';
import console from 'node:console';
import { pathToFileURL } from 'node:url';
const run = promisify(execFile);
const sha = (value) => createHash('sha256').update(value).digest('hex');
export function validateManifest(manifest) {
  assert.equal(manifest.name, 'mcp-contractlab');
  assert.equal(manifest.private, true);
  assert.equal(manifest.version, '0.1.0-beta.1');
  assert.equal(manifest.license, 'MIT');
  assert.equal(manifest.bin.mcpcl, 'dist/src/cli.js');
  assert.equal(manifest.engines.node, '>=22.13.0');
  for (const hook of ['preinstall', 'install', 'postinstall', 'prepare'])
    assert.equal(manifest.scripts[hook], undefined);
  assert.equal(manifest.scripts.prepack, 'npm run build');
  for (const value of Object.values(manifest.dependencies))
    assert(
      /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(value),
      'Direct runtime versions must be pinned',
    );
}
export async function prepareCandidate(destination) {
  const directory = resolve(destination);
  const root = resolve('.');
  assert(
    directory !== root && !directory.startsWith(root + '/'),
    'Candidate output must be outside the checkout',
  );
  await mkdir(directory, { recursive: true });
  const manifest = JSON.parse(await readFile('package.json', 'utf8'));
  validateManifest(manifest);
  assert(
    (await readFile(manifest.bin.mcpcl, 'utf8')).startsWith(
      '#!/usr/bin/env node\n',
    ),
  );
  const pack = async (args) =>
    JSON.parse(
      (
        await run('npm', ['pack', '--ignore-scripts', '--json', ...args], {
          timeout: 60000,
          maxBuffer: 4 * 1024 * 1024,
        })
      ).stdout,
    )[0];
  const inventory = JSON.parse(
    await readFile('docs/releases/runtime-inventory.json', 'utf8'),
  );
  assert.equal(
    inventory.lockfileSha256,
    sha(await readFile('package-lock.json')),
    'Runtime attribution inventory is stale',
  );
  for (const entry of inventory.packages)
    for (const notice of entry.notices) {
      assert(/^third-party-licenses\/[a-f0-9]{64}\.txt$/.test(notice.path));
      assert.equal(
        sha(await readFile(notice.path)),
        notice.sha256,
        'Original license bytes changed',
      );
    }
  const dryRun = await pack(['--dry-run']);
  const packed = await pack(['--pack-destination', directory]);
  const files = packed.files.map((file) => file.path);
  for (const path of [
    'LICENSE',
    'THIRD_PARTY_NOTICES.md',
    'README.md',
    'README.zh-CN.md',
    'assets/brand/logo-icon.svg',
    'assets/brand/logo-horizontal.svg',
    'assets/brand/logo-dark.svg',
    'dist/src/cli.js',
    'dist/src/contracts/schema-worker.js',
    'dist/src/i18n/en.js',
    'dist/src/i18n/zh-CN.js',
    'dist/src/reports/html.js',
    'dist/src/reports/html-assets.js',
    'dist/src/reports/html-file.js',
    'dist/examples/servers/echo-server.js',
    'dist/examples/servers/removed-sum-server.js',
    'examples/mcpcl.config.yaml',
    'examples/mcpcl.broken.yaml',
    'examples/mcpcl.removed-tool.yaml',
  ])
    assert(files.includes(path), `Missing tarball file ${path}`);
  assert(files.some((path) => path.startsWith('third-party-licenses/')));
  for (const entry of inventory.packages)
    for (const notice of entry.notices)
      assert(files.includes(notice.path), 'Missing packaged attribution text');
  assert(
    !files.some((path) =>
      /(^|\/)(node_modules|tests|\.git|\.npm)(\/|$)|(^|\/)\.env(?:\.|$)|\.tgz$|\.npmrc$|\.pem$/.test(
        path,
      ),
    ),
    'Unsafe tarball inclusion',
  );
  assert(
    packed.size <= 2 * 1024 * 1024 && packed.unpackedSize <= 8 * 1024 * 1024,
    'Candidate exceeds review size budget',
  );
  assert.deepEqual(dryRun.files, packed.files);
  const scratch = await mkdtemp(join(tmpdir(), 'mcpcl-repack-'));
  const tarball = join(directory, packed.filename);
  const digest = sha(await readFile(tarball));
  try {
    const repeated = await pack(['--pack-destination', scratch]);
    assert.equal(
      sha(await readFile(join(scratch, repeated.filename))),
      digest,
      'Repeated pack differs',
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
  const sourceCommit = (await run('git', ['rev-parse', 'HEAD'])).stdout.trim();
  const sourceDirty = Boolean(
    (await run('git', ['status', '--porcelain'])).stdout.trim(),
  );
  const evidence = {
    sourceCommit,
    sourceDirty,
    candidateOnly: true,
    publishApproved: false,
    node: process.version,
    version: manifest.version,
    private: manifest.private,
    filename: packed.filename,
    sha256: digest,
    integrity: packed.integrity,
    compressedBytes: packed.size,
    unpackedBytes: packed.unpackedSize,
    fileCount: files.length,
    repeatedPackIdentical: true,
  };
  await writeFile(
    join(directory, 'candidate.json'),
    JSON.stringify(evidence, null, 2) + '\n',
  );
  await writeFile(
    join(directory, 'pack-dry-run.json'),
    JSON.stringify(dryRun, null, 2) + '\n',
  );
  await writeFile(
    join(directory, 'SHA256SUMS'),
    `${digest}  ${packed.filename}\n`,
  );
  console.log(JSON.stringify(evidence));
  return tarball;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await prepareCandidate(process.argv[2] ?? '/tmp/mcpcl-beta-candidate');
