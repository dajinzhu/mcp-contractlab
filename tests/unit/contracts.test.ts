import { describe, expect, it } from 'vitest';
import { parseConfig } from '../../src/config/load.js';
import { lookup, assertResult } from '../../src/contracts/assertions.js';
import { redact, registerSecrets } from '../../src/reports/redact.js';
import { checkSchema } from '../../dist/src/contracts/schema.js';

const config = {
  schemaVersion: 1,
  server: { name: 'unit', transport: 'stdio', command: 'node' },
  safety: { allowToolCalls: ['sum'] },
  cases: [],
};
describe('strict configuration', () => {
  it('resolves paths against the config directory', () => {
    expect(
      parseConfig(JSON.stringify(config), '/tmp/unit/config.yaml').server.cwd,
    ).toBe('/tmp/unit');
  });
  it.each([
    { ...config, typo: true },
    { ...config, schemaVersion: 2 },
    { ...config, server: { ...config.server, transport: 'http' } },
    { ...config, safety: { ...config.safety, toolTimeoutMs: 0 } },
    {
      ...config,
      cases: [
        {
          id: 'x',
          tool: 'sum',
          arguments: {},
          expect: {
            assertions: [{ path: '/bad~2', operator: 'equals', value: 0 }],
          },
        },
      ],
    },
    {
      ...config,
      cases: [
        { id: 'x', tool: 'sum', arguments: {}, expect: {} },
        { id: 'x', tool: 'sum', arguments: {}, expect: {} },
      ],
    },
  ])('rejects invalid configuration %#', (value) => {
    expect(() =>
      parseConfig(JSON.stringify(value), '/tmp/config.yaml'),
    ).toThrow();
  });
  it.each([
    'schemaVersion: 1\nschemaVersion: 1',
    'x: &x [*x]',
    'x: !unsafe code',
  ])('rejects duplicate keys, aliases and custom tags', (source) => {
    expect(() => parseConfig(source, '/tmp/config.yaml')).toThrow();
  });
});
describe('JSON Pointer assertions', () => {
  it('handles escaped keys, arrays, root and null versus missing', () => {
    const value = { 'a/b': { '~key': [null] } };
    expect(lookup(value, '/a~1b/~0key/0')).toEqual({
      found: true,
      value: null,
    });
    expect(lookup(value, '/missing')).toEqual({ found: false });
    expect(lookup(value, '')).toEqual({ found: true, value });
    expect(lookup([1], '/01').found).toBe(false);
    expect(lookup({}, '/toString').found).toBe(false);
  });
  it('checks exists, deep equality and JSON types', () => {
    expect(
      assertResult(
        { a: null },
        { path: '/a', operator: 'exists', value: true },
      ),
    ).toBeUndefined();
    expect(
      assertResult({}, { path: '/a', operator: 'exists', value: false }),
    ).toBeUndefined();
    expect(
      assertResult([1], { path: '', operator: 'equals', value: [1] }),
    ).toBeUndefined();
    expect(
      assertResult(null, { path: '', operator: 'type', value: 'null' }),
    ).toBeUndefined();
    expect(
      assertResult(3, { path: '', operator: 'type', value: 'integer' }),
    ).toBeUndefined();
    expect(
      assertResult({}, { path: '/a', operator: 'equals', value: null }),
    ).toContain('(missing)');
  });
  it('redacts sensitive pointer values and known injected secrets', () => {
    expect(
      assertResult(
        { token: 'actual-secret' },
        { path: '/token', operator: 'equals', value: 'expected-secret' },
      ),
    ).not.toContain('actual-secret');
    registerSecrets(['custom-credential-value']);
    expect(
      redact({
        value: 'custom-credential-value',
        apiKey: 'sensitive',
        note: 'Bearer abcdefghijk',
      }),
    ).toEqual({
      value: '[REDACTED]',
      apiKey: '[REDACTED]',
      note: '[REDACTED]',
    });
  });
});
describe('bounded schema validation', () => {
  it('supports null, arrays and local references', async () => {
    expect((await checkSchema({ type: 'null' }, null)).valid).toBe(true);
    expect(
      (
        await checkSchema(
          {
            type: 'array',
            items: { $ref: '#/$defs/n' },
            $defs: { n: { type: 'number' } },
          },
          [1, 2],
        )
      ).valid,
    ).toBe(true);
    expect(
      (
        await checkSchema({ type: 'array', items: { type: 'number' } }, [
          'wrong',
        ])
      ).valid,
    ).toBe(false);
  });
  it('never fetches external schema references', async () => {
    expect(
      (await checkSchema({ $ref: 'https://untrusted.invalid/schema' }, {}))
        .valid,
    ).toBe(false);
  });
  it('terminates pathological regular-expression validation instead of hanging', async () => {
    const start = Date.now();
    const result = await checkSchema(
      { type: 'string', pattern: '^(a+)+$' },
      'a'.repeat(35) + '!',
    );
    expect(result.valid).toBe(false);
    expect(result.diagnostic).toContain('2 seconds');
    expect(Date.now() - start).toBeLessThan(5000);
  });
});
