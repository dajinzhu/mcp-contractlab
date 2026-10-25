import { isDeepStrictEqual } from 'node:util';
import type { Assertion } from '../types.js';
import { safeValue } from '../reports/redact.js';
import { message, english, type Message } from '../i18n/message.js';

export function lookup(
  value: unknown,
  path: string,
): { found: boolean; value?: unknown } {
  if (path === '') return { found: true, value };
  let current = value;
  for (const segment of path.slice(1).split('/')) {
    const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
    if (
      current === null ||
      typeof current !== 'object' ||
      !Object.hasOwn(current, key)
    )
      return { found: false };
    if (Array.isArray(current) && !/^(0|[1-9]\d*)$/.test(key))
      return { found: false };
    current = (current as Record<string, unknown>)[key];
  }
  return { found: true, value: current };
}

export function assertionDiagnostic(
  result: unknown,
  assertion: Assertion,
): Message | undefined {
  const actual = lookup(result, assertion.path);
  const type =
    actual.value === null
      ? 'null'
      : Array.isArray(actual.value)
        ? 'array'
        : typeof actual.value;
  const passes =
    assertion.operator === 'exists'
      ? actual.found === assertion.value
      : actual.found &&
        (assertion.operator === 'equals'
          ? isDeepStrictEqual(actual.value, assertion.value)
          : assertion.value === 'integer'
            ? Number.isInteger(actual.value)
            : assertion.value === type);
  if (passes) return;
  return message(
    'assert.failure',
    assertion.path,
    assertion.operator,
    safeValue(assertion.value, assertion.path),
    actual.found ? safeValue(actual.value, assertion.path) : '',
    !actual.found,
  );
}
export function assertResult(
  result: unknown,
  assertion: Assertion,
): string | undefined {
  const diagnostic = assertionDiagnostic(result, assertion);
  return diagnostic ? english(diagnostic) : undefined;
}
