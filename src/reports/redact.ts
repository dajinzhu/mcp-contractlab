const sensitive =
  /(?:token|secret|password|passwd|authorization|api[-_]?key|credential|cookie)/i;
const knownSecrets = new Set<string>();
export function registerSecrets(values: string[]): void {
  for (const value of values) if (value.length >= 4) knownSecrets.add(value);
}

export function redact(value: unknown, key = '', depth = 0): unknown {
  if (sensitive.test(key)) return '[REDACTED]';
  if (depth > 50) return '[TRUNCATED]';
  if (typeof value === 'string') {
    for (const secret of knownSecrets)
      value = (value as string).split(secret).join('[REDACTED]');
    return (value as string)
      .replace(
        /\b(?:Bearer\s+\S+|(?:sk-|gh[pousr]_)[A-Za-z0-9_-]{8,})/gi,
        '[REDACTED]',
      )
      .replace(
        /((?:api[-_]?key|token|secret|password|authorization)\s*[:=]\s*)[^\s,;]+/gi,
        '$1[REDACTED]',
      )
      .slice(0, 2048);
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, '', depth + 1));
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, redact(v, k, depth + 1)]),
    );
  return value;
}
export function safeValue(value: unknown, key = ''): string {
  return JSON.stringify(redact(value, key))?.slice(0, 2048) ?? '(undefined)';
}
