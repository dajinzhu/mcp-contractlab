import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import console from 'node:console';
const run = promisify(execFile);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const { stdout } = await run(
  'npm',
  ['ls', '--omit=dev', '--all', '--parseable'],
  { timeout: 30000 },
);
await mkdir('third-party-licenses', { recursive: true });
const packages = [];
for (const directory of stdout.trim().split('\n').slice(1)) {
  const manifest = JSON.parse(
    await readFile(join(directory, 'package.json'), 'utf8'),
  );
  const notices = [];
  for (const file of (await readdir(directory, { withFileTypes: true })).filter(
    (entry) =>
      entry.isFile() && /^(licen[cs]e|copying|notice)(\.|$)/i.test(entry.name),
  )) {
    const bytes = await readFile(join(directory, file.name));
    assert(bytes.byteLength <= 200 * 1024);
    const digest = sha(bytes);
    const path = `third-party-licenses/${digest}.txt`;
    await writeFile(path, bytes);
    notices.push({ sourceFile: file.name, path, sha256: digest });
  }
  const installHooks = ['preinstall', 'install', 'postinstall'].filter(
    (hook) => manifest.scripts?.[hook],
  );
  packages.push({
    name: manifest.name,
    version: manifest.version,
    declaredLicense: manifest.license ?? 'UNKNOWN',
    installHooks,
    notices,
  });
}
packages.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
assert(
  packages.every((entry) => entry.notices.length > 0),
  'Missing runtime license text: manual review required',
);
const inventory = {
  scope:
    'npm ls --omit=dev --all; dependency declarations are not legal conclusions',
  lockfileSha256: sha(await readFile('package-lock.json')),
  packages,
};
await mkdir('docs/releases', { recursive: true });
await writeFile(
  'docs/releases/runtime-inventory.json',
  JSON.stringify(inventory, null, 2) + '\n',
);
const lines = [
  '# Third-party runtime notices',
  '',
  'MCP ContractLab itself remains MIT-licensed. These separately installed runtime',
  'dependencies retain their own licenses; this inventory does not relicense them.',
  'Original license/notice texts, including copyright notices, are preserved verbatim',
  'in the linked files. Source: the committed npm lockfile and installed package files.',
  '',
  '**Review gate:** the MCP SDK declares Apache-2.0, but its actual license text',
  'describes an Apache/MIT transition and CC-BY-4.0 documentation. A maintainer must',
  'review applicable obligations before release; the table is not a legal clearance.',
  'Test-only independent fixtures are not redistributed in this tarball; see',
  '[their provenance and limitations](docs/releases/independent-validation.md).',
  '',
  '| Package | Declared license | Original texts |',
  '| --- | --- | --- |',
  ...packages.map(
    (entry) =>
      `| \`${entry.name}@${entry.version}\` | ${entry.declaredLicense} | ${entry.notices.map((notice) => `[${notice.sourceFile}](${notice.path})`).join(', ')} |`,
  ),
  '',
  'Regenerate with `npm run release:notices` after a clean `npm ci`. Full package',
  'versions, hashes and install-hook observations are in',
  '[runtime-inventory.json](docs/releases/runtime-inventory.json).',
  'No install hooks were added to the project. A zero-vulnerability scan is not a',
  'guarantee of safety; review vulnerability and supply-chain evidence separately.',
  '',
];
await writeFile('THIRD_PARTY_NOTICES.md', lines.join('\n'));
console.log(
  `Runtime inventory: ${packages.length} packages; ${packages.filter((entry) => entry.installHooks.length).length} packages with install hooks. Original license texts retained.`,
);
