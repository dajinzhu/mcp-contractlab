import { open, link, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import * as z from 'zod/v4';
import { Failure } from '../types.js';

const definition = z.strictObject({
  name: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  inputSchema: z.union([z.record(z.string(), z.json()), z.boolean()]),
  outputSchema: z
    .union([z.record(z.string(), z.json()), z.boolean()])
    .optional(),
  annotations: z.record(z.string(), z.json()).optional(),
});
const schema = z.strictObject({
  snapshotVersion: z.literal(1),
  protocolVersion: z.literal('2026-07-28'),
  tools: z.array(definition).max(1000),
});
export type Snapshot = z.infer<typeof schema>;

export function canonical(value: unknown, depth = 0): unknown {
  if (depth > 50)
    throw new Failure(2, 'Contract exceeds canonicalization depth limit');
  if (Array.isArray(value)) return value.map((v) => canonical(v, depth + 1));
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, canonical(v, depth + 1)]),
    );
  return value;
}
export function createSnapshot<
  T extends {
    name: string;
    title?: string | undefined;
    description?: string | undefined;
    inputSchema: unknown;
    outputSchema?: unknown;
    annotations?: unknown;
  },
>(tools: T[]): Snapshot {
  const data = {
    snapshotVersion: 1,
    protocolVersion: '2026-07-28',
    tools: tools
      .map((t) => ({
        name: t.name,
        ...(t.title === undefined ? {} : { title: t.title }),
        ...(t.description === undefined ? {} : { description: t.description }),
        inputSchema: t.inputSchema,
        ...(t.outputSchema === undefined
          ? {}
          : { outputSchema: t.outputSchema }),
        ...(t.annotations === undefined ? {} : { annotations: t.annotations }),
      }))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
  };
  return parseSnapshot(JSON.stringify(canonical(data)));
}
export function parseSnapshot(source: string): Snapshot {
  try {
    if (Buffer.byteLength(source) > 2 * 1024 * 1024) throw new Error();
    const value = schema.parse(JSON.parse(source));
    if (new Set(value.tools.map((t) => t.name)).size !== value.tools.length)
      throw new Error();
    canonical(value);
    return value;
  } catch {
    throw new Failure(2, 'Invalid, unsupported or oversized snapshot');
  }
}
export async function readSnapshot(path: string): Promise<Snapshot> {
  let file;
  try {
    file = await open(path, 'r');
    const buffer = Buffer.alloc(2 * 1024 * 1024 + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await file.read(
        buffer,
        offset,
        buffer.length - offset,
        null,
      );
      if (!bytesRead) break;
      offset += bytesRead;
    }
    return parseSnapshot(buffer.subarray(0, offset).toString('utf8'));
  } catch (e) {
    if (e instanceof Failure) throw e;
    throw new Failure(2, 'Cannot read baseline');
  } finally {
    await file?.close();
  }
}
export async function writeSnapshot(
  path: string,
  value: Snapshot,
  force: boolean,
): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    const file = await open(temporary, 'wx', 0o600);
    try {
      await file.writeFile(JSON.stringify(canonical(value), null, 2) + '\n');
    } finally {
      await file.close();
    }
    if (force) await rename(temporary, path);
    else await link(temporary, path);
  } catch {
    throw new Failure(
      2,
      'Cannot write snapshot; destination must exist only with --force and its parent directory must already exist',
    );
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
