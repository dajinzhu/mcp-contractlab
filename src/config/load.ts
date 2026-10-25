import { message } from '../i18n/message.js';
import { open } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { LineCounter, parseDocument } from 'yaml';
import * as z from 'zod/v4';
import { Failure, type Config } from '../types.js';

const positive = z.number().int().min(1).max(60_000);
const pointer = z
  .string()
  .max(2048)
  .refine(
    (s) => (s === '' || s.startsWith('/')) && !/~(?:[^01]|$)/.test(s),
    'Expected an RFC 6901 JSON Pointer',
  );
const assertion = z.discriminatedUnion('operator', [
  z.strictObject({
    path: pointer,
    operator: z.literal('equals'),
    value: z.json(),
  }),
  z.strictObject({
    path: pointer,
    operator: z.literal('exists'),
    value: z.boolean().default(true),
  }),
  z.strictObject({
    path: pointer,
    operator: z.literal('type'),
    value: z.enum([
      'object',
      'array',
      'string',
      'number',
      'boolean',
      'null',
      'integer',
    ]),
  }),
]);
const testCase = z.strictObject({
  id: z.string().min(1).max(128),
  tool: z.string().min(1).max(256),
  arguments: z.record(z.string(), z.json()),
  expect: z.strictObject({
    isError: z.boolean().default(false),
    assertions: z.array(assertion).max(100).default([]),
  }),
});
const parameterized = z.strictObject({
  id: z.string().min(1).max(128),
  tool: z.string().min(1).max(256),
  rows: z
    .array(testCase.omit({ tool: true }))
    .min(1)
    .max(1000),
});
const schema = z.strictObject({
  schemaVersion: z.literal(1),
  server: z.discriminatedUnion('transport', [
    z.strictObject({
      name: z.string().min(1).max(128),
      transport: z.literal('stdio'),
      command: z.string().min(1).max(4096),
      args: z.array(z.string().max(4096)).max(100).default([]),
      cwd: z.string().default('.'),
      timeoutMs: positive.default(10_000),
      env: z
        .array(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/))
        .max(100)
        .default([]),
    }),
    z.strictObject({
      name: z.string().min(1).max(128),
      transport: z.literal('streamable-http'),
      url: z.url().max(4096),
      timeoutMs: positive.default(10_000),
      authEnv: z
        .string()
        .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
        .optional(),
    }),
  ]),
  safety: z.strictObject({
    allowToolCalls: z.array(z.string().min(1)).max(1000),
    maxToolCalls: z.number().int().min(0).max(1000).default(10),
    toolTimeoutMs: positive.default(5000),
    allowedHttpHosts: z.array(z.string().min(1).max(253)).max(100).default([]),
  }),
  cases: z
    .array(z.union([testCase, parameterized]))
    .max(1000)
    .default([]),
});

export function parseConfig(source: string, filename: string): Config {
  if (Buffer.byteLength(source) > 1024 * 1024)
    throw new Failure(2, message('config.large'));
  const lineCounter = new LineCounter();
  const doc = parseDocument(source, {
    lineCounter,
    uniqueKeys: true,
    customTags: [],
  });
  if (doc.errors.length || doc.warnings.length) {
    const issue = doc.errors[0] ?? doc.warnings[0];
    const location = issue?.pos ? lineCounter.linePos(issue.pos[0]) : undefined;
    throw new Failure(2, message('config.yaml', location?.line, location?.col));
  }
  let data: unknown;
  try {
    data = doc.toJS({ maxAliasCount: 0 });
  } catch {
    throw new Failure(2, message('config.aliases'));
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    throw new Failure(
      2,
      message('config.invalid', i?.path.map(String).join('/') ?? '', i?.code),
    );
  }
  const config = parsed.data;
  if (new Set(config.cases.map((c) => c.id)).size !== config.cases.length)
    throw new Failure(2, message('config.duplicateIds'));
  const cases = config.cases.flatMap((c) =>
    'rows' in c
      ? c.rows.map((row) => ({ ...row, id: `${c.id}/${row.id}`, tool: c.tool }))
      : [c],
  );
  if (
    cases.length > 1000 ||
    new Set(cases.map((c) => c.id)).size !== cases.length
  )
    throw new Failure(2, message('config.expandedIds'));
  if (config.server.transport === 'stdio')
    config.server.cwd = resolve(dirname(resolve(filename)), config.server.cwd);
  return { ...config, cases };
}

export async function loadConfig(filename: string): Promise<Config> {
  let source: string;
  try {
    const file = await open(filename, 'r');
    try {
      const buffer = Buffer.alloc(1024 * 1024 + 1);
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
      if (offset > 1024 * 1024) throw new Failure(2, message('config.large'));
      source = buffer.subarray(0, offset).toString('utf8');
    } finally {
      await file.close();
    }
  } catch (error) {
    if (error instanceof Failure) throw error;
    throw new Failure(2, message('config.readFailed'));
  }
  return parseConfig(source, filename);
}
