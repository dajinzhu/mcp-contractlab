import { canonical, type Snapshot } from './snapshot.js';
export interface Change {
  tool: string;
  path: string;
  classification: 'BREAKING' | 'NON_BREAKING' | 'REVIEW' | 'UNKNOWN';
  reason: string;
}
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function types(value: unknown): string[] {
  const type = object(value).type;
  return typeof type === 'string'
    ? [type]
    : Array.isArray(type) && type.every((t) => typeof t === 'string')
      ? type
      : [];
}
function required(value: unknown): string[] {
  const r = object(value).required;
  return Array.isArray(r) && r.every((t) => typeof t === 'string') ? r : [];
}

/** Deliberately incomplete: unproven schema changes are UNKNOWN, never safe. */
export function compareSnapshots(before: Snapshot, after: Snapshot): Change[] {
  const changes: Change[] = [];
  const old = new Map(before.tools.map((t) => [t.name, t]));
  const next = new Map(after.tools.map((t) => [t.name, t]));
  for (const name of [...new Set([...old.keys(), ...next.keys()])].sort()) {
    const a = old.get(name),
      b = next.get(name);
    const add = (
      path: string,
      classification: Change['classification'],
      reason: string,
    ) => changes.push({ tool: name, path, classification, reason });
    if (!b) {
      add('', 'BREAKING', 'Tool removed');
      continue;
    }
    if (!a) {
      add('', 'NON_BREAKING', 'Tool added');
      continue;
    }
    for (const key of ['description', 'title'] as const)
      if (!equal(a[key], b[key]))
        add('/' + key, 'REVIEW', 'Display text changed');
    if (!equal(a.annotations, b.annotations))
      add(
        '/annotations',
        'REVIEW',
        'Untrusted tool annotations changed; review effects',
      );
    if (!equal(a.outputSchema, b.outputSchema))
      add('/outputSchema', 'UNKNOWN', 'Output compatibility not proven');
    if (equal(a.inputSchema, b.inputSchema)) continue;
    const added = required(b.inputSchema).filter(
      (k) => !required(a.inputSchema).includes(k),
    );
    if (added.length)
      add('/inputSchema/required', 'BREAKING', 'New required input properties');
    const was = types(a.inputSchema),
      now = types(b.inputSchema);
    const narrowed =
      was.length > 0 &&
      now.length > 0 &&
      was.some(
        (t) => !now.includes(t) && !(t === 'integer' && now.includes('number')),
      );
    if (narrowed)
      add(
        '/inputSchema/type',
        'BREAKING',
        'Root input type rejects previously allowed types',
      );
    // Remove only the differences explicitly classified above. All residual
    // constraints (including combinators, nested required, refs) remain unknown.
    const residualA = { ...object(a.inputSchema) },
      residualB = { ...object(b.inputSchema) };
    if (added.length) {
      delete residualA.required;
      delete residualB.required;
    }
    if (narrowed) {
      delete residualA.type;
      delete residualB.type;
    }
    if (!equal(residualA, residualB) || (!added.length && !narrowed))
      add('/inputSchema', 'UNKNOWN', 'Schema compatibility not proven');
  }
  return changes;
}
