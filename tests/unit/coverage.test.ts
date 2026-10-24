import { expect, it } from 'vitest';
import { coverageTracker } from '../../src/runner/coverage.js';
import { parseConfig } from '../../src/config/load.js';

it('reports only measured enum branches without echoing enum values', () => {
  const tracker = coverageTracker();
  tracker.discover([
    {
      name: 'choose',
      inputSchema: {
        type: 'object',
        properties: {
          mode: { enum: ['secret-choice-one', 'secret-choice-two'] },
        },
      },
    },
    { name: 'untested', inputSchema: { type: 'object' } },
  ]);
  tracker.attempt('choose');
  tracker.complete('choose', { mode: 'secret-choice-one' });
  const result = tracker.report();
  expect(result.completedTools).toEqual(['choose']);
  expect(result.untestedTools).toEqual(['untested']);
  expect(result.enumBranches).toEqual([
    { tool: 'choose', path: '/mode', total: 2, observed: [0] },
  ]);
  expect(JSON.stringify(result)).not.toContain('secret-choice');
  expect(result.limitations.length).toBeGreaterThan(0);
});
it('expands explicit table rows with stable unique case IDs', () => {
  const base = {
    schemaVersion: 1,
    server: { name: 'table', transport: 'stdio', command: 'node' },
    safety: { allowToolCalls: ['sum'] },
    cases: [
      {
        id: 'table',
        tool: 'sum',
        rows: [
          { id: 'one', arguments: { a: 2, b: 3 }, expect: {} },
          { id: 'two', arguments: { a: 0, b: 0 }, expect: {} },
        ],
      },
    ],
  };
  const config = parseConfig(JSON.stringify(base), '/tmp/config.json');
  expect(config.cases.map((c) => c.id)).toEqual(['table/one', 'table/two']);
  base.cases[0]!.rows[1]!.id = 'one';
  expect(() => parseConfig(JSON.stringify(base), '/tmp/config.json')).toThrow(
    'unique',
  );
});
