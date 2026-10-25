import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  validateSvg,
  pngDimensions,
  codeBlocks,
  markdownAnchors,
} from './presentation-lib.mjs';
const source = await readFile('assets/brand/logo-icon.svg', 'utf8');
test('original passive SVG passes and retains its intrinsic icon size', () => {
  assert.deepEqual(validateSvg(source), { width: 96, height: 96 });
});
test('rejects scripts, event handlers, external/raster references and foreign markup', () => {
  for (const value of [
    source.replace('</svg>', '<script>alert(1)</script></svg>'),
    source.replace('<svg ', '<svg onload="alert(1)" '),
    source.replace(
      '</svg>',
      '<image href="https://invalid.example/pixel"/></svg>',
    ),
    source.replace('</svg>', '<foreignObject>HTML</foreignObject></svg>'),
    source.replace('</svg>', '<use href="#title"/></svg>'),
    source.replace('fill="#17243e"', 'fill="url(#hidden)"'),
  ])
    assert.throws(() => validateSvg(value));
});
test('rejects entity declarations and oversized or malformed SVG', () => {
  assert.throws(() =>
    validateSvg(
      '<!DOCTYPE svg [<!ENTITY a SYSTEM "file:///etc/passwd">]>' + source,
    ),
  );
  assert.throws(() => validateSvg(source + ' '.repeat(8192)));
  assert.throws(() =>
    validateSvg(source.replace('width="96"', 'width="9999999"')),
  );
  assert.throws(() => validateSvg(source.replace('</svg>', '')));
});
test('checks actual PNG dimensions and rejects non-PNG data', async () => {
  assert.deepEqual(
    pngDimensions(await readFile('assets/brand/logo-icon-32.png')),
    [32, 32],
  );
  assert.throws(() => pngDimensions(Buffer.from('not a png')));
});
test('compares localized README commands without changing protocol/config semantics', () => {
  assert.deepEqual(
    codeBlocks('```sh\nnpm run cli -- --lang zh-CN\n```'),
    codeBlocks('```sh\nnpm run cli -- --lang en\n```'),
  );
  assert.notDeepEqual(
    codeBlocks('```sh\nnpm run build\n```'),
    codeBlocks('```sh\nnpm run demo\n```'),
  );
});
test('recognizes headings and duplicate anchors for local links', () => {
  const anchors = markdownAnchors(
    '## Offline HTML reports\n## Offline HTML reports\n<a id="custom"></a>',
  );
  assert(anchors.has('offline-html-reports'));
  assert(anchors.has('offline-html-reports-1'));
  assert(anchors.has('custom'));
});
