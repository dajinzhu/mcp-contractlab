import { message, english, rememberText, type Text } from '../i18n/message.js';
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
  const values =
    typeof type === 'string'
      ? [type]
      : Array.isArray(type) && type.length <= 7
        ? type
        : [];
  return values.length &&
    values.every((t) =>
      [
        'object',
        'array',
        'string',
        'number',
        'integer',
        'boolean',
        'null',
      ].includes(t),
    ) &&
    new Set(values).size === values.length
    ? values
    : [];
}
function required(value: unknown): string[] {
  const r = object(value).required;
  return Array.isArray(r) && r.every((t) => typeof t === 'string')
    ? [...new Set(r)]
    : [];
}

const annotations = new Set([
  'type',
  '$schema',
  '$id',
  '$anchor',
  'title',
  'description',
  '$comment',
  'default',
  'examples',
]);
function composed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(composed);
  if (value === null || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, child]) =>
      [
        '$ref',
        '$dynamicRef',
        'oneOf',
        'anyOf',
        'allOf',
        'not',
        'if',
        'then',
        'else',
        'dependentSchemas',
        'dependentRequired',
        'unevaluatedProperties',
        'unevaluatedItems',
      ].includes(key) || composed(child),
  );
}
function inhabitedSimpleRoot(schema: unknown): boolean {
  if (schema === false) return false;
  const root = object(schema),
    rootTypes = types(schema);
  if (root.type !== undefined && !rootTypes.length) return false;
  if (rootTypes.length && !rootTypes.includes('object')) return false;
  if (
    !Object.keys(root).every(
      (key) =>
        annotations.has(key) ||
        ['properties', 'required', 'additionalProperties'].includes(key),
    )
  )
    return false;
  const properties = object(root.properties);
  return required(schema).every((key) => {
    const property = Object.hasOwn(properties, key)
      ? properties[key]
      : (root.additionalProperties ?? true);
    if (property === true) return true;
    if (!property || typeof property !== 'object' || Array.isArray(property))
      return false;
    const definition = object(property);
    if (!Object.keys(definition).every((key) => annotations.has(key)))
      return false;
    return (
      definition.type === undefined ||
      (types(property).length > 0 &&
        types(property).every((type) =>
          [
            'object',
            'array',
            'string',
            'number',
            'integer',
            'boolean',
            'null',
          ].includes(type),
        ))
    );
  });
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
      reason: Text,
    ) => {
      const change = {
        tool: name,
        path,
        classification,
        reason: english(reason),
      };
      rememberText(change, reason);
      changes.push(change);
    };
    if (!b) {
      add('', 'BREAKING', message('diff.removed'));
      continue;
    }
    if (!a) {
      add('', 'NON_BREAKING', message('diff.added'));
      continue;
    }
    for (const key of ['description', 'title'] as const)
      if (!equal(a[key], b[key]))
        add('/' + key, 'REVIEW', message('diff.text'));
    if (!equal(a.annotations, b.annotations))
      add('/annotations', 'REVIEW', message('diff.annotations'));
    if (!equal(a.outputSchema, b.outputSchema))
      add('/outputSchema', 'UNKNOWN', message('diff.outputUnknown'));
    if (equal(a.inputSchema, b.inputSchema)) continue;
    if (composed(a.inputSchema) || composed(b.inputSchema)) {
      add('/inputSchema', 'UNKNOWN', message('diff.composedUnknown'));
      continue;
    }
    const oldRequired = new Set(required(a.inputSchema));
    const added = required(b.inputSchema).filter((k) => !oldRequired.has(k));
    // An object made of the old required fields must be a demonstrably valid
    // old witness; otherwise the new root requirement is only UNKNOWN.
    const simpleRequired = inhabitedSimpleRoot(a.inputSchema);
    const knownAdded = simpleRequired ? added : [];
    if (knownAdded.length)
      add('/inputSchema/required', 'BREAKING', message('diff.required'));
    const was = types(a.inputSchema),
      now = types(b.inputSchema);
    const narrowed =
      Object.keys(object(a.inputSchema)).every((key) => annotations.has(key)) &&
      was.length > 0 &&
      now.length > 0 &&
      was.some(
        (t) => !now.includes(t) && !(t === 'integer' && now.includes('number')),
      );
    if (narrowed) add('/inputSchema/type', 'BREAKING', message('diff.type'));
    // Remove only the differences explicitly classified above. All residual
    // constraints (including combinators, nested required, refs) remain unknown.
    const residualA = { ...object(a.inputSchema) },
      residualB = { ...object(b.inputSchema) };
    if (knownAdded.length) {
      delete residualA.required;
      delete residualB.required;
    }
    if (narrowed) {
      delete residualA.type;
      delete residualB.type;
    }
    if (!equal(residualA, residualB) || (!knownAdded.length && !narrowed))
      add('/inputSchema', 'UNKNOWN', message('diff.unknown'));
  }
  return changes;
}
