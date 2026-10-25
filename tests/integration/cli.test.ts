import { execFile, spawn, type ExecFileException } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, expect, it } from 'vitest';
import type { Report } from '../../src/types.js';

const execute = promisify(execFile);
const cli = resolve('dist/src/cli.js');
const fixture = resolve('dist/tests/fixtures/behavior-server.js');
const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporary.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});

function testCase(tool: string, value: unknown = 5) {
  return {
    id: tool,
    tool,
    arguments: tool === 'sum' ? { a: 2, b: 3 } : {},
    expect: {
      isError: false,
      assertions: [
        { path: '/structuredContent/value', operator: 'equals', value },
      ],
    },
  };
}
async function run(
  cases = [testCase('sum')],
  options: {
    allow?: boolean;
    command?: string;
    safety?: object;
    server?: object;
    inspect?: boolean;
    secret?: string;
  } = {},
) {
  const dir = await mkdtemp(join(tmpdir(), 'mcpcl-cli-'));
  temporary.push(dir);
  const trace = join(dir, 'trace');
  const config = {
    schemaVersion: 1,
    server: {
      name: 'test',
      transport: 'stdio',
      command: options.command ?? process.execPath,
      args: [fixture],
      cwd: dir,
      timeoutMs: 2000,
      env: [
        'MCPCL_TEST_TRACE',
        ...(options.secret ? ['MCPCL_TEST_SECRET'] : []),
      ],
      ...options.server,
    },
    safety: {
      allowToolCalls: cases.map((c) => c.tool),
      maxToolCalls: 10,
      toolTimeoutMs: 500,
      ...options.safety,
    },
    cases,
  };
  const path = join(dir, 'config.json');
  await writeFile(path, JSON.stringify(config));
  const args = [
    cli,
    options.inspect ? 'inspect' : 'test',
    '-c',
    path,
    '--report',
    'json',
    ...(options.allow === false ? [] : ['--allow-exec']),
  ];
  let stdout: string, stderr: string;
  let code = 0;
  try {
    ({ stdout, stderr } = await execute(process.execPath, args, {
      timeout: 12_000,
      maxBuffer: 256 * 1024,
      env: {
        MCPCL_TEST_TRACE: trace,
        ...(options.secret ? { MCPCL_TEST_SECRET: options.secret } : {}),
      },
    }));
  } catch (error) {
    const e = error as ExecFileException & { stdout: string; stderr: string };
    if (typeof e.code !== 'number') throw error;
    ({ stdout, stderr } = e);
    code = e.code;
  }
  const log = await readFile(trace, 'utf8').catch(() => '');
  for (const match of log.matchAll(/PID (\d+)/g)) {
    await expect
      .poll(() => {
        try {
          process.kill(Number(match[1]), 0);
          return false;
        } catch (e) {
          return (e as NodeJS.ErrnoException).code === 'ESRCH';
        }
      })
      .toBe(true);
  }
  return {
    stdout,
    stderr,
    code,
    log,
    report: stdout ? (JSON.parse(stdout) as Report) : undefined,
  };
}

it('passes three actual contracts and calls exactly the explicit cases', async () => {
  const cases = [
    testCase('sum'),
    { ...testCase('sum', 0), id: 'zero', arguments: { a: 0, b: 0 } },
    { ...testCase('sum', -3), id: 'negative', arguments: { a: -4, b: 1 } },
  ];
  const result = await run(cases);
  expect(result.code).toBe(0);
  expect(result.report?.counts).toEqual({
    passed: 3,
    failed: 0,
    blocked: 0,
    unrun: 0,
  });
  expect(result.log.match(/CALL sum/g)).toHaveLength(3);
});
it.each(['wrong', 'error', 'missing', 'type'])(
  'rejects broken %s with contract exit 1',
  async (tool) => {
    const result = await run([testCase(tool)]);
    expect(result.code).toBe(1);
    expect(result.report?.counts.failed).toBe(1);
    expect(result.report?.cases[0]?.diagnostics.join(' ')).toContain(
      tool === 'error' ? '/isError' : '/structuredContent',
    );
  },
);
it('discovers tools and schemas with zero tool invocations', async () => {
  const result = await run([], { inspect: true });
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout).tools).toHaveLength(11);
  expect(result.log).not.toContain('CALL');
});

it('rejects a zero-case test run instead of reporting a false success', async () => {
  const result = await run([]);
  expect(result.code).toBe(2);
  expect(result.log).toBe('');
  expect(result.report?.errors.join(' ')).toContain('No test cases');
});
it.each([
  { allow: false },
  { safety: { allowToolCalls: [] } },
  { safety: { maxToolCalls: 0 } },
])('blocks the entire run before launching or calling %#', async (options) => {
  const result = await run([testCase('sum')], options);
  expect(result.code).toBe(3);
  expect(result.report?.counts.blocked).toBe(1);
  expect(result.log).toBe('');
});
it('does not silently skip or call unknown tools', async () => {
  const result = await run([testCase('unknown')]);
  expect(result.code).toBe(2);
  expect(result.report?.counts.unrun).toBe(1);
  expect(result.log).not.toContain('CALL');
});
it('validates all inputs before any tool calls', async () => {
  const c = testCase('sum');
  const result = await run([
    { ...c, arguments: { a: 'bad', b: 3 } } as unknown as typeof c,
  ]);
  expect(result.code).toBe(1);
  expect(result.log).not.toContain('CALL');
  expect(result.report?.cases[0]?.diagnostics.join(' ')).toContain(
    '/arguments',
  );
});
it.each(['hang', 'crash', 'flood'])(
  'bounds %s and cleans up the process',
  async (tool) => {
    const result = await run([testCase(tool), testCase('sum')]);
    expect(result.code).toBe(2);
    expect(result.log).not.toContain('CALL sum');
    expect(result.report?.counts.unrun).toBe(1);
  },
);
it('reports launch failures without leaking executable data', async () => {
  const result = await run([testCase('sum')], { command: '/does-not-exist' });
  expect(result.code).toBe(2);
  expect(result.log).toBe('');
});
it('accepts non-object structured outputs when their schemas permit them', async () => {
  const cases = ['null', 'array'].map((tool) => ({
    ...testCase(tool),
    expect: {
      isError: false,
      assertions: [
        {
          path: '/structuredContent',
          operator: 'equals',
          value: tool === 'null' ? null : [1, 2],
        },
      ],
    },
  }));
  const result = await run(cases);
  expect(result.code).toBe(0);
  expect(result.report?.counts.passed).toBe(2);
});
it('redacts injected secrets, secret keys and raw server stderr from diagnostics', async () => {
  const c = testCase('secret');
  c.expect.assertions = [
    { path: '/structuredContent', operator: 'equals', value: {} },
  ];
  const result = await run([c], { secret: 'custom-sensitive-fixture-value' });
  expect(result.code).toBe(1);
  const emitted = result.stdout + result.stderr;
  for (const value of [
    'custom-sensitive-fixture-value',
    'never-print-this-token',
    'never-print-this-log',
  ])
    expect(emitted).not.toContain(value);
  expect(emitted).toContain('[REDACTED]');
});

it('cleans up a real running server after SIGINT and leaves remaining cases unrun', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcpcl-interrupt-'));
  temporary.push(dir);
  const trace = join(dir, 'trace');
  const path = join(dir, 'config.json');
  await writeFile(
    path,
    JSON.stringify({
      schemaVersion: 1,
      server: {
        name: 'interrupt',
        transport: 'stdio',
        command: process.execPath,
        args: [fixture],
        env: ['MCPCL_TEST_TRACE'],
      },
      safety: {
        allowToolCalls: ['hang', 'sum'],
        maxToolCalls: 2,
        toolTimeoutMs: 5000,
      },
      cases: [testCase('hang'), testCase('sum')],
    }),
  );
  const child = spawn(
    process.execPath,
    [cli, 'test', '-c', path, '--allow-exec', '--report', 'json'],
    {
      shell: false,
      env: { MCPCL_TEST_TRACE: trace },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let stdout = '';
  child.stdout.on('data', (b: Buffer) => {
    stdout += b.toString();
  });
  child.stderr.resume();
  const exited = once(child, 'exit');
  try {
    await expect
      .poll(
        async () =>
          (await readFile(trace, 'utf8').catch(() => '')).includes('CALL hang'),
        // Readiness includes process startup, discovery and schema workers on CI.
        // Keep the actual SIGINT and cleanup assertions unchanged.
        { timeout: 5000 },
      )
      .toBe(true);
    child.kill('SIGINT');
    expect((await exited)[0]).toBe(2);
    const report = JSON.parse(stdout) as Report;
    expect(report.counts.unrun).toBe(1);
    const log = await readFile(trace, 'utf8');
    expect(log).not.toContain('CALL sum');
    const pid = Number(log.match(/PID (\d+)/)?.[1]);
    expect(() => process.kill(pid, 0)).toThrow();
  } finally {
    child.kill('SIGKILL');
  }
});
