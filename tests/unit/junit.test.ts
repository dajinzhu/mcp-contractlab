import { expect, it } from 'vitest';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { makeReport } from '../../src/runner/run-suite.js';
import { junitReport } from '../../src/reports/junit.js';
import { redact } from '../../src/reports/redact.js';
import type { Report } from '../../src/types.js';
import { readFileSync } from 'node:fs';
import { version } from '../../src/version.js';

it('reads the correct package version when imported from source', () => {
  expect(version).toBe(
    JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ).version,
  );
});

it('escapes XML and represents passing, failed, blocked and unrun cases accurately', () => {
  const report = makeReport(
    [
      { id: 'pass', tool: 'echo', status: 'passed', diagnostics: [] },
      {
        id: '<case & "quoted">',
        tool: "sum'",
        status: 'failed',
        diagnostics: ['expected <5> & actual "6"\u0000'],
      },
      {
        id: 'blocked',
        tool: 'sum',
        status: 'blocked',
        diagnostics: ['not allowed'],
      },
      { id: 'unrun', tool: 'sum', status: 'unrun', diagnostics: [] },
    ],
    3,
  );
  const text = junitReport(report);
  expect(XMLValidator.validate(text)).toBe(true);
  const suite = new XMLParser({ ignoreAttributes: false }).parse(text)
    .testsuites.testsuite;
  expect(suite['@_tests']).toBe('4');
  expect(suite['@_failures']).toBe('1');
  expect(suite['@_skipped']).toBe('2');
  expect(text).toContain('&lt;case &amp; &quot;quoted&quot;&gt;');
  expect(text).not.toContain('\u0000');
});
it('preserves a nonzero global run status even without failed cases', () => {
  const text = junitReport(makeReport([], 2, ['Transport failed']));
  expect(XMLValidator.validate(text)).toBe(true);
  expect(text).toContain('errors="1"');
  expect(text).toContain('name="run-status"');
});
it('does not leak secrets into XML failure diagnostics', () => {
  const report = makeReport(
    [
      {
        id: 'case',
        tool: 'sum',
        status: 'failed',
        diagnostics: ['token=never-expose-me'],
      },
    ],
    1,
  );
  const text = junitReport(redact(report) as Report);
  expect(text).not.toContain('never-expose-me');
  expect(text).toContain('[REDACTED]');
});
