import { tmpdir } from 'node:os';
import { checkArtifacts } from './check-artifacts.mjs';
import { codeBlocks } from '../presentation-lib.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { validateManifest, prepareCandidate } from './candidate.mjs';
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
test('candidate retains the private package, exact bin, version and supported engines', () =>
  validateManifest(manifest));
test('rejects publication guard removal and unexpected lifecycle hooks', () => {
  assert.throws(() => validateManifest({ ...manifest, private: false }));
  for (const name of ['preinstall', 'install', 'postinstall', 'prepare'])
    assert.throws(() =>
      validateManifest({
        ...manifest,
        scripts: { ...manifest.scripts, [name]: 'unexpected-hook' },
      }),
    );
});
test('rejects bin/version/engine drift and loose direct dependencies', () => {
  for (const change of [
    { version: '1.0.0' },
    { bin: { mcpcl: 'missing.js' } },
    { engines: { node: '>=18' } },
    { dependencies: { unsafe: '^1.0.0' } },
  ])
    assert.throws(() => validateManifest({ ...manifest, ...change }));
});
test('refuses candidate output inside the checkout before writing or packing', async () => {
  await assert.rejects(prepareCandidate(resolve('.')), /outside the checkout/);
  await assert.rejects(
    prepareCandidate(resolve('docs/candidate')),
    /outside the checkout/,
  );
});

test('future installation drafts retain matching commands and explicit non-publication', async () => {
  const english = await readFile('docs/releases/installation.en.md', 'utf8');
  const chinese = await readFile('docs/releases/installation.zh-CN.md', 'utf8');
  assert.deepEqual(codeBlocks(english), codeBlocks(chinese));
  assert(english.includes('NOT PUBLISHED'));
  assert(chinese.includes('尚未发布'));
  for (const document of [english, chinese])
    for (const value of [
      '0.1.0-beta.1',
      '2026-07-28',
      '>=22.13.0',
      '--ignore-scripts',
    ])
      assert(document.includes(value));
});

test('missing candidate artifacts cannot be accepted for upload', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcpcl-missing-artifacts-'));
  try {
    await assert.rejects(checkArtifacts(directory), /ENOENT/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
