import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
const tags = new Set([
  'svg',
  'title',
  'desc',
  'rect',
  'g',
  'path',
  'circle',
  'text',
]);
const attributes = new Set([
  'xmlns',
  'width',
  'height',
  'viewBox',
  'role',
  'aria-labelledby',
  'id',
  'x',
  'y',
  'rx',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'd',
  'cx',
  'cy',
  'r',
  'transform',
  'font-family',
  'font-size',
  'font-weight',
  'letter-spacing',
]);
/** Strict allowlist for our passive vector artwork, not a general SVG sanitizer. */
export function validateSvg(svg) {
  assert(Buffer.byteLength(svg) <= 8192, 'SVG exceeds 8 KiB');
  assert(
    !/<!|<\?|\b(?:url\s*\(|javascript:|data:|https?:)/i.test(
      svg.replace('http://www.w3.org/2000/svg', ''),
    ),
    'Active/external SVG content',
  );
  assert.equal(XMLValidator.validate(svg), true, 'Malformed SVG');
  const parsed = new XMLParser({
    ignoreAttributes: false,
    processEntities: false,
  }).parse(svg);
  assert.deepEqual(Object.keys(parsed), ['svg']);
  const root = parsed.svg;
  assert.equal(root['@_xmlns'], 'http://www.w3.org/2000/svg');
  assert.equal(root['@_role'], 'img');
  assert.equal(root['@_aria-labelledby'], 'title desc');
  assert(root.title && root.desc, 'Accessible name and description required');
  for (const dimension of [root['@_width'], root['@_height']]) {
    assert(
      Number.isSafeInteger(Number(dimension)) &&
        Number(dimension) > 0 &&
        Number(dimension) <= 1024,
      'SVG dimensions must be bounded integers',
    );
  }
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (node === null || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('@_'))
        assert(attributes.has(key.slice(2)), `Unsafe SVG attribute: ${key}`);
      else if (key !== '#text') {
        assert(tags.has(key), `Unsafe SVG element: ${key}`);
        visit(value);
      }
    }
  };
  visit(parsed);
  return { width: Number(root['@_width']), height: Number(root['@_height']) };
}
export function pngDimensions(buffer) {
  assert.equal(
    buffer.subarray(0, 8).toString('hex'),
    '89504e470d0a1a0a',
    'Invalid PNG signature',
  );
  assert.equal(buffer.subarray(12, 16).toString(), 'IHDR');
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}
export function codeBlocks(markdown) {
  return [...markdown.matchAll(/```sh\n([\s\S]*?)```/g)].map((match) =>
    match[1].replaceAll('--lang zh-CN', '--lang en').trim(),
  );
}
export function markdownAnchors(markdown) {
  const counts = new Map();
  return new Set([
    ...[...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => {
      const base = match[1]
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, '')
        .replaceAll(' ', '-');
      const count = counts.get(base) ?? 0;
      counts.set(base, count + 1);
      return base + (count ? '-' + count : '');
    }),
    ...[...markdown.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]),
  ]);
}
