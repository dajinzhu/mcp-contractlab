import { execFile } from 'node:child_process';
import {
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  link,
  writeFile,
  readdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, expect, it } from 'vitest';
import { parseConfig } from '../../src/config/load.js';

const execute = promisify(execFile);
const cli = resolve('dist/src/cli.js');
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});
async function dir() {
  const d = await mkdtemp(join(tmpdir(), 'mcpcl-init-'));
  dirs.push(d);
  return d;
}
async function run(args: string[], cwd: string) {
  try {
    const r = await execute(process.execPath, [cli, ...args], {
      cwd,
      env: { ...process.env, MCPCL_LANG: 'en' },
      timeout: 10000,
    });
    return { code: 0, ...r };
  } catch (e) {
    const error = e as { code: number; stdout: string; stderr: string };
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  }
}

it.each(['en', 'zh-CN'] as const)(
  'creates a deterministic inert %s template',
  async (lang) => {
    const d = await dir();
    expect(
      (await run(['init', '--output', 'one.yaml', '--lang', lang], d)).code,
    ).toBe(0);
    expect(
      (await run(['init', '--output', 'two.yaml', '--lang', lang], d)).code,
    ).toBe(0);
    const text = await readFile(join(d, 'one.yaml'), 'utf8');
    expect(text).toBe(await readFile(join(d, 'two.yaml'), 'utf8'));
    expect(text).toMatchSnapshot();
    const config = parseConfig(text, join(d, 'one.yaml'));
    expect(config.cases).toEqual([]);
    expect(config.safety.allowToolCalls).toEqual([]);
    expect(config.safety.maxToolCalls).toBe(0);
    expect((await stat(join(d, 'one.yaml'))).mode & 0o777).toBe(0o600);
    expect((await run(['test', '-c', 'one.yaml'], d)).code).not.toBe(0);
    expect(
      (await run(['test', '-c', 'one.yaml', '--allow-exec'], d)).code,
    ).toBe(2);
    expect(await readdir(d)).toEqual(['one.yaml', 'two.yaml']);
  },
);

it('rejects missing output, existing files, links, path aliases and malformed paths', async () => {
  const d = await dir();
  await writeFile(join(d, 'existing'), 'original');
  await symlink('existing', join(d, 'symbolic'));
  await symlink('missing', join(d, 'dangling'));
  await link(join(d, 'existing'), join(d, 'hard'));
  await symlink(d, join(d, 'alias'));
  for (const args of [
    [],
    ['--output', 'existing'],
    ['--output', 'symbolic'],
    ['--output', 'dangling'],
    ['--output', 'hard'],
    ['--output', 'alias/new'],
    ['--output', '../escape'],
    ['--output', './new'],
    ['--output', 'alias//new'],
    ['--output', 'unsafe\nname'],
    ['--output', 'missing/new'],
  ]) {
    expect((await run(['init', ...args], d)).code).toBe(2);
  }
  expect(await readFile(join(d, 'existing'), 'utf8')).toBe('original');
});

it('publishes exactly one complete file under concurrent attempts', async () => {
  const d = await dir();
  const results = await Promise.all(
    Array.from({ length: 12 }, () => run(['init', '--output', 'race.yaml'], d)),
  );
  expect(results.filter((r) => r.code === 0)).toHaveLength(1);
  expect(results.filter((r) => r.code === 2)).toHaveLength(11);
  expect(
    parseConfig(
      await readFile(join(d, 'race.yaml'), 'utf8'),
      join(d, 'race.yaml'),
    ).cases,
  ).toEqual([]);
  expect(await readdir(d)).toEqual(['race.yaml']);
});

it('does not launch processes or access the network during init', async () => {
  const d = await dir();
  const guard = join(d, 'guard.cjs');
  await writeFile(
    guard,
    `
    const child = require('node:child_process');
    const net = require('node:net');
    const dns = require('node:dns');
    const deny = () => { throw new Error('unexpected side effect'); };
    for (const key of ['spawn', 'exec', 'execFile', 'fork', 'spawnSync', 'execSync', 'execFileSync']) child[key] = deny;
    net.connect = net.createConnection = deny;
    dns.lookup = dns.resolve = deny;
    require('node:module').syncBuiltinESMExports();
  `,
  );
  const result = await execute(
    process.execPath,
    [cli, 'init', '--output', 'safe.yaml'],
    {
      cwd: d,
      env: {
        PATH: process.env.PATH,
        NODE_OPTIONS: `--require=${guard}`,
        MCPCL_LANG: 'en',
      },
      timeout: 10000,
    },
  );
  expect(result.stdout).toContain('review');
  expect(
    parseConfig(
      await readFile(join(d, 'safe.yaml'), 'utf8'),
      join(d, 'safe.yaml'),
    ).cases,
  ).toEqual([]);
});

it('preserves language precedence for help, template and errors', async () => {
  const d = await dir();
  const env = { ...process.env, MCPCL_LANG: 'zh-CN' };
  const local = await execute(
    process.execPath,
    [cli, 'init', '--output', 'zh.yaml'],
    { cwd: d, env },
  );
  expect(local.stdout).toContain('审查');
  expect(await readFile(join(d, 'zh.yaml'), 'utf8')).toContain('配置模板');
  const english = await execute(
    process.execPath,
    [cli, 'init', '--output', 'en.yaml', '--lang', 'en'],
    { cwd: d, env },
  );
  expect(english.stdout).toContain('review');
  const help = await execute(process.execPath, [cli, 'init', '--help'], {
    cwd: d,
    env,
  });
  expect(help.stdout).toContain('配置模板');
  await expect(
    execute(process.execPath, [cli, 'init', '--output', 'zh.yaml'], {
      cwd: d,
      env,
    }),
  ).rejects.toMatchObject({
    code: 2,
    stderr: expect.stringContaining('无法创建配置'),
  });
});

it('never overwrites a file racing the final publication', async () => {
  const d = await dir();
  for (let i = 0; i < 8; i++) {
    const name = `race-${i}.yaml`;
    const other = writeFile(join(d, name), 'external', { flag: 'wx' }).then(
      () => true,
      () => false,
    );
    const [result, otherWon] = await Promise.all([
      run(['init', '--output', name], d),
      other,
    ]);
    const contents = await readFile(join(d, name), 'utf8');
    if (otherWon) {
      expect(result.code).toBe(2);
      expect(contents).toBe('external');
    } else {
      expect(result.code).toBe(0);
      expect(parseConfig(contents, join(d, name)).cases).toEqual([]);
    }
  }
});
