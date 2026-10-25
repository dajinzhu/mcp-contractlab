import { URL } from 'node:url';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import assert from 'node:assert/strict';
import console from 'node:console';
import {
  validateSvg,
  pngDimensions,
  codeBlocks,
  markdownAnchors,
} from './presentation-lib.mjs';
const root = resolve('.');
async function markdownFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', '.npm'].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await markdownFiles(path)));
    else if (entry.name.endsWith('.md')) result.push(path);
  }
  return result;
}
let references = 0;
for (const file of await markdownFiles(root)) {
  const markdown = (await readFile(file, 'utf8'))
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]+`/g, '');
  const links = [
    ...markdown.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g),
  ].map((match) => match[1]);
  links.push(
    ...[...markdown.matchAll(/\b(?:src|srcset)="([^"]+)"/g)].map(
      (match) => match[1],
    ),
  );
  for (const link of links) {
    if (/^https:\/\//.test(link)) {
      new URL(link);
      continue;
    }
    if (/^(https?:|mailto:)/.test(link)) continue;
    const [path, anchor] = decodeURIComponent(link).split('#');
    const target = path ? resolve(dirname(file), path) : file;
    assert(
      target.startsWith(root + '/') || target === root,
      `Out-of-repo link: ${link}`,
    );
    const info = await stat(target).catch(() => null);
    assert(info, `Broken local link in ${file}: ${link}`);
    if (anchor && extname(target) === '.md')
      assert(
        markdownAnchors(await readFile(target, 'utf8')).has(anchor),
        `Missing anchor in ${file}: ${link}`,
      );
    references++;
  }
}
const english = await readFile('README.md', 'utf8');
const chinese = await readFile('README.zh-CN.md', 'utf8');
assert.deepEqual(
  codeBlocks(english),
  codeBlocks(chinese),
  'README shell commands must match except locale',
);
assert.equal(
  (english.match(/^## /gm) ?? []).length,
  (chinese.match(/^## /gm) ?? []).length,
  'README section parity',
);
assert.equal(
  (english.match(/^\*\*.+\?\*\*/gm) ?? []).length,
  (chinese.match(/^\*\*.+？\*\*/gm) ?? []).length,
  'FAQ parity',
);
for (const readme of [english, chinese]) {
  for (const token of [
    'README.md',
    'README.zh-CN.md',
    '2026-07-28',
    '2.4.0',
    '>=22.13.0',
    'private: true',
    '4 MiB',
    '--allow-exec',
    'safety.allowToolCalls',
    'UNKNOWN',
    'OAuth',
    'docs/security.md',
    'docs/roadmap.md',
  ])
    assert(readme.includes(token), `Missing shared README reference: ${token}`);
  assert(
    !codeBlocks(readme).some((block) =>
      /npx\s+mcp-contractlab|npm\s+(?:i|install)\s+-g/.test(block),
    ),
    'No unpublished public-install examples',
  );
}
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
for (const command of [
  ...english.matchAll(/npm run ([\w:-]+)/g),
  ...chinese.matchAll(/npm run ([\w:-]+)/g),
])
  assert(command[1] in manifest.scripts, `Unknown npm script ${command[1]}`);
for (const name of ['logo-icon', 'logo-horizontal', 'logo-dark'])
  validateSvg(await readFile(`assets/brand/${name}.svg`, 'utf8'));
for (const [name, width, height] of [
  ['logo-icon-32', 32, 32],
  ['logo-icon-64', 64, 64],
  ['logo-icon-256', 256, 256],
  ['logo-icon', 512, 512],
  ['logo-horizontal', 840, 224],
  ['logo-dark', 840, 224],
  ['preview', 1024, 480],
]) {
  const buffer = await readFile(`assets/brand/${name}.png`);
  assert.deepEqual(pngDimensions(buffer), [width, height]);
  assert(buffer.byteLength < 160 * 1024, `${name}: oversized PNG`);
}
console.log(
  `Presentation checks passed: ${references} local references, paired README sections/commands/FAQ, safe bounded SVGs and sized PNGs. External HTTPS references checked syntactically, not fetched.`,
);
