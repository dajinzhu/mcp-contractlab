import { mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import console from 'node:console';
import process from 'node:process';
import { resolve } from 'node:path';
import { prepareCandidate } from './release/candidate.mjs';
import { verifyConsumer } from './release/consumer.mjs';
const retained = process.env.MCPCL_CANDIDATE_OUTPUT;
const directory = retained
  ? resolve(retained)
  : await mkdtemp(join(tmpdir(), 'mcpcl-package-'));
try {
  await promisify(execFile)('npm', ['run', 'build'], { timeout: 60000 });
  const tarball = await prepareCandidate(directory);
  await verifyConsumer(tarball, join(directory, 'consumer'));
  console.log(
    'Package verification passed; candidate reproducibility and complete clean-consumer matrix checked. Nothing published.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
