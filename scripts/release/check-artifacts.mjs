import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import assert from 'node:assert/strict';
import console from 'node:console';
export async function checkArtifacts(directory) {
  const candidate = JSON.parse(
    await readFile(join(directory, 'candidate.json'), 'utf8'),
  );
  assert.equal(candidate.private, true);
  assert.equal(candidate.publishApproved, false);
  assert(/^mcp-contractlab-[\w.-]+\.tgz$/.test(candidate.filename));
  const tarball = await readFile(join(directory, candidate.filename));
  assert.equal(
    createHash('sha256').update(tarball).digest('hex'),
    candidate.sha256,
  );
  assert.equal(tarball.byteLength, candidate.compressedBytes);
  assert(
    (await readFile(join(directory, 'SHA256SUMS'), 'utf8')).includes(
      candidate.sha256 + '  ' + candidate.filename,
    ),
  );
  const consumer = JSON.parse(
    await readFile(join(directory, 'consumer/consumer.json'), 'utf8'),
  );
  assert.equal(consumer.tarballSha256, candidate.sha256);
  assert.equal(consumer.offlineDefaultLifecycleReinstall, true);
  assert.equal(consumer.consumerAudit.vulnerabilities.total, 0);
  for (const path of [
    'pack-dry-run.json',
    'consumer/consumer-package-lock.json',
    'consumer/passed.json',
    'consumer/failed.xml',
    'consumer/blocked.json',
    'consumer/snapshot.json',
    'consumer/passed-zh.html',
    'consumer/failed-zh.html',
    'consumer/blocked-zh.html',
    'audit/readiness-audit.json',
  ])
    assert(
      (await stat(join(directory, path))).size > 0,
      `Missing evidence ${path}`,
    );
  console.log(
    `Complete candidate artifacts verified before upload: ${candidate.filename}, ${tarball.byteLength} bytes, matching consumer hash and reports.`,
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await checkArtifacts(resolve(process.argv[2] ?? '/tmp/mcpcl-beta-candidate'));
