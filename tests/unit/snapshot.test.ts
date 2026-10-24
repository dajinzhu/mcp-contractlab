import { expect, it } from 'vitest';
import {
  createSnapshot,
  parseSnapshot,
  canonical,
} from '../../src/contracts/snapshot.js';
import { compareSnapshots } from '../../src/contracts/diff.js';

it('does not falsely call type narrowing breaking when old constraints already imply the new type', () => {
  const before = createSnapshot([tool({ type: 'number', enum: [1, 2] })]);
  const after = createSnapshot([tool({ type: 'integer', enum: [1, 2] })]);
  expect(compareSnapshots(before, after).map((c) => c.classification)).toEqual([
    'UNKNOWN',
  ]);
});
it('does not mistake a repeated composed requirement for a provable new requirement', () => {
  const before = createSnapshot([
    tool({ type: 'object', allOf: [{ required: ['a'] }] }),
  ]);
  const after = createSnapshot([
    tool({ type: 'object', allOf: [{ required: ['a'] }], required: ['a'] }),
  ]);
  expect(compareSnapshots(before, after).map((c) => c.classification)).toEqual([
    'UNKNOWN',
  ]);
});

it('does not claim added object requirements break non-object or uninhabited old inputs', () => {
  for (const inputSchema of [
    false,
    { type: 'number' },
    { type: 'object', required: ['a'], properties: { a: false } },
  ]) {
    const before = createSnapshot([{ name: 'sum', inputSchema }]);
    const after = createSnapshot([
      {
        name: 'sum',
        inputSchema:
          typeof inputSchema === 'object'
            ? { ...inputSchema, required: ['a', 'b'] }
            : { type: 'object', required: ['b'] },
      },
    ]);
    expect(
      compareSnapshots(before, after).map((c) => c.classification),
    ).toEqual(['UNKNOWN']);
  }
});

it('treats oversized or invalid type unions as unknown without quadratic type comparisons', () => {
  const before = createSnapshot([
    tool({ type: Array(10000).fill('not-a-json-type') }),
  ]);
  const after = createSnapshot([tool({ type: 'object', required: ['a'] })]);
  expect(compareSnapshots(before, after).map((c) => c.classification)).toEqual([
    'UNKNOWN',
  ]);
});

const tool = (
  inputSchema: object = {
    type: 'object',
    properties: { a: { type: 'number' } },
  },
) => ({ name: 'sum', description: 'Add numbers', inputSchema });
it('canonicalizes object keys and stable tool fields without volatile metadata', () => {
  const a = createSnapshot([{ ...tool(), _meta: { volatile: 'ignored' } }]);
  const b = createSnapshot([
    tool({ properties: { a: { type: 'number' } }, type: 'object' }),
  ]);
  expect(canonical(a)).toEqual(canonical(b));
  expect(compareSnapshots(a, b)).toEqual([]);
});
it('detects removed/renamed tools and additions', () => {
  const changes = compareSnapshots(
    createSnapshot([tool()]),
    createSnapshot([{ ...tool(), name: 'renamed' }]),
  );
  expect(changes.map((c) => c.classification).sort()).toEqual([
    'BREAKING',
    'NON_BREAKING',
  ]);
});
it('detects newly required and optional-to-required inputs', () => {
  const changes = compareSnapshots(
    createSnapshot([tool()]),
    createSnapshot([
      tool({
        type: 'object',
        properties: { a: { type: 'number' } },
        required: ['a'],
      }),
    ]),
  );
  expect(changes).toContainEqual(
    expect.objectContaining({
      classification: 'BREAKING',
      path: '/inputSchema/required',
    }),
  );
});
it('classifies description-only changes as REVIEW', () => {
  const changes = compareSnapshots(
    createSnapshot([tool()]),
    createSnapshot([{ ...tool(), description: 'Reworded' }]),
  );
  expect(changes.map((c) => c.classification)).toEqual(['REVIEW']);
});
it.each([
  [{ type: 'string' }, { type: 'number' }, 'BREAKING'],
  [{ type: 'number' }, { type: 'integer' }, 'BREAKING'],
  [{ type: 'integer' }, { type: 'number' }, 'UNKNOWN'],
  [{ anyOf: [{ type: 'number' }] }, { anyOf: [{ type: 'string' }] }, 'UNKNOWN'],
  [
    { type: 'object' },
    { $ref: '#/$defs/a', $defs: { a: { type: 'object' } } },
    'UNKNOWN',
  ],
])(
  'conservatively compares schema change %#',
  (before, after, classification) => {
    expect(
      compareSnapshots(
        createSnapshot([tool(before as object)]),
        createSnapshot([tool(after as object)]),
      ),
    ).toContainEqual(expect.objectContaining({ classification }));
  },
);
it('rejects unsupported versions, duplicate tools and malformed baselines', () => {
  for (const text of [
    '{}',
    '{"snapshotVersion":9}',
    JSON.stringify({ ...createSnapshot([tool()]), tools: [tool(), tool()] }),
  ])
    expect(() => parseSnapshot(text)).toThrow();
});
