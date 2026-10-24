import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

const execute = promisify(execFile);
const demoPath = fileURLToPath(
  new URL('../../dist/examples/smoke-client.js', import.meta.url),
);

async function demo(args: string[]) {
  try {
    const result = await execute(process.execPath, [demoPath, ...args], {
      timeout: 12_000,
      maxBuffer: 64 * 1024,
      env: {},
    });
    return { ...result, code: 0 };
  } catch (error) {
    const failure = error as Error & {
      code: number | string;
      stdout: string;
      stderr: string;
    };
    // Timeouts/signals/launch errors must not masquerade as expected exit codes.
    if (typeof failure.code !== 'number') throw error;
    return failure;
  }
}

it('runs the README local SDK demo', async () => {
  const result = await demo(['--allow-exec']);
  expect(result.code).toBe(0);
  expect(result.stdout).toContain('PASS discovery: echo, sum (MCP 2026-07-28)');
  expect(result.stdout).toContain(
    'PASS sum(2, 3): /structuredContent/value = 5',
  );
  expect(result.stderr).toBe('');
});

it('reports a deliberately wrong expectation with exit 1', async () => {
  const result = await demo(['--allow-exec', '--expect-sum', '6']);
  expect(result.code).toBe(1);
  expect(result.stderr).toContain(
    'FAIL: sum /structuredContent/value: expected 6, actual 5',
  );
});

it('requires process-launch consent before starting the fixture', async () => {
  const result = await demo([]);
  expect(result.code).toBe(3);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain('BLOCKED: pass --allow-exec');
});

it('shows accurate Phase 0 help without launching anything', async () => {
  const result = await demo(['--help']);
  expect(result.code).toBe(0);
  expect(result.stdout).toContain('Phase 0 local SDK smoke demo');
  expect(result.stdout).toContain('--allow-exec');
  expect(result.stdout).not.toContain('PASS discovery');
});

it.each([
  ['--allow-exec', '--unknown'],
  ['--allow-exec', '--expect-sum', 'NaN'],
  ['--allow-exec', '--expect-sum', ''],
  ['--allow-exec', 'arbitrary-server'],
])('rejects invalid demo arguments %j with exit 2', async (...args) => {
  const result = await demo(args);
  expect(result.code).toBe(2);
  expect(result.stdout).toBe('');
});
