import { execFile, type ExecFileException } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
const execute = promisify(execFile);
const cli = resolve('dist/src/cli.js');
async function run(lang: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  try {
    return {
      ...(await execute(process.execPath, [cli, ...args, '--lang', lang], {
        env: { ...process.env, LC_ALL: 'C', NO_COLOR: '1', ...env },
        timeout: 15000,
      })),
      code: 0,
    };
  } catch (error) {
    const e = error as ExecFileException & { stdout: string; stderr: string };
    if (typeof e.code !== 'number') throw e;
    return { stdout: e.stdout, stderr: e.stderr, code: e.code };
  }
}
it.each(['inspect', 'test', 'snapshot', 'diff'])(
  'localizes %s help and keeps flags stable',
  async (command) => {
    const en = await run('en', [command, '--help']);
    const zh = await run('zh-CN', [command, '--help']);
    expect(en.code).toBe(0);
    expect(zh.code).toBe(0);
    expect(zh.stdout).toContain('--lang');
    expect(zh.stdout).toMatch(/[\u4e00-\u9fff]/);
    expect(zh.stdout).not.toBe(en.stdout);
    expect(zh.stdout + zh.stderr).not.toContain('\u001b');
  },
);
it.each(['json', 'junit'])(
  'preserves %s bytes and exits for pass, failure and blocked runs',
  async (format) => {
    for (const [file, allow, code] of [
      ['mcpcl.config.yaml', true, 0],
      ['mcpcl.broken.yaml', true, 1],
      ['mcpcl.config.yaml', false, 3],
    ] as const) {
      const args = [
        'test',
        '-c',
        resolve('examples', file),
        '--report',
        format,
        ...(allow ? ['--allow-exec'] : []),
      ];
      const en = await run('en', args);
      const zh = await run('zh-CN', args);
      expect(en.code).toBe(code);
      expect(zh.code).toBe(code);
      expect(zh.stdout).toBe(en.stdout);
      expect(zh.stderr).toBe(en.stderr);
    }
  },
);
it('localizes human results and errors while retaining exit codes', async () => {
  for (const [file, allow, code] of [
    ['mcpcl.config.yaml', true, 0],
    ['mcpcl.broken.yaml', true, 1],
    ['mcpcl.config.yaml', false, 3],
  ] as const) {
    const args = [
      'test',
      '-c',
      resolve('examples', file),
      ...(allow ? ['--allow-exec'] : []),
    ];
    const en = await run('en', args);
    const zh = await run('zh-CN', args);
    expect(en.code).toBe(code);
    expect(zh.code).toBe(code);
    expect(zh.stdout).toMatch(/[\u4e00-\u9fff]/);
    expect(zh.stdout).not.toBe(en.stdout);
  }
  const en = await run('en', ['test', '-c', '/missing-config']);
  const zh = await run('zh', ['test', '-c', '/missing-config']);
  expect(en.code).toBe(2);
  expect(zh.code).toBe(2);
  expect(zh.stdout).toBe('');
  expect(zh.stderr).toMatch(/[\u4e00-\u9fff]/);
});
it('keeps inspect defaults and snapshot bytes canonical across languages', async () => {
  const args = [
    'inspect',
    '-c',
    resolve('examples/mcpcl.config.yaml'),
    '--allow-exec',
  ];
  const en = await run('en', args);
  const zh = await run('zh', args);
  expect(JSON.parse(zh.stdout)).toEqual(JSON.parse(en.stdout));
  const human = await run('zh', [...args, '--report', 'console']);
  expect(human.stdout).toMatch(/[\u4e00-\u9fff]/);
  const dir = await mkdtemp(join(tmpdir(), 'mcpcl-i18n-'));
  try {
    for (const lang of ['en', 'zh']) {
      const result = await run(lang, [
        'snapshot',
        '-c',
        resolve('examples/mcpcl.config.yaml'),
        '--allow-exec',
        '--output',
        join(dir, lang + '.json'),
      ]);
      expect(result.code).toBe(0);
    }
    const baseline = join(dir, 'en.json');
    const diffArgs = [
      'diff',
      '-c',
      resolve('examples/mcpcl.config.yaml'),
      '--allow-exec',
      '--baseline',
      baseline,
    ];
    const diffEn = await run('en', diffArgs);
    const diffZh = await run('zh', diffArgs);
    expect(diffZh.stdout).toBe(diffEn.stdout);
    expect(JSON.parse(diffZh.stdout).exitCode).toBe(0);
    const snapshot = JSON.parse(await readFile(baseline, 'utf8'));
    snapshot.tools.push({
      name: 'removed-tool',
      inputSchema: { type: 'object' },
    });
    await (
      await import('node:fs/promises')
    ).writeFile(baseline, JSON.stringify(snapshot));
    for (const lang of ['en', 'zh']) {
      const result = await run(lang, [...diffArgs, '--report', 'console']);
      expect(result.code).toBe(1);
      expect(result.stdout).toContain('BREAKING');
      expect(result.stdout).toContain('removed-tool');
      if (lang === 'zh') expect(result.stdout).toMatch(/[\u4e00-\u9fff]/);
    }
    // Restore the baseline before comparing the snapshot bytes.
    snapshot.tools.pop();
    await (
      await import('node:fs/promises')
    ).writeFile(baseline, await readFile(join(dir, 'zh.json')));
    expect(await readFile(join(dir, 'zh.json'), 'utf8')).toBe(
      await readFile(join(dir, 'en.json'), 'utf8'),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it('preserves transport failure, call counts, safety blocks and secret redaction in both languages', async () => {
  const { writeFile } = await import('node:fs/promises');
  const dir = await mkdtemp(join(tmpdir(), 'mcpcl-i18n-safety-'));
  const path = join(dir, 'config.json');
  const trace = join(dir, 'trace');
  try {
    for (const tool of ['sum', 'type', 'error', 'missing', 'secret', 'crash']) {
      const config = {
        schemaVersion: 1,
        server: {
          name: 'locale-test',
          transport: 'stdio',
          command: process.execPath,
          args: [resolve('dist/tests/fixtures/behavior-server.js')],
          env: ['MCPCL_TEST_TRACE', 'MCPCL_TEST_SECRET'],
        },
        safety: {
          allowToolCalls: [tool],
          maxToolCalls: 1,
          toolTimeoutMs: 1000,
        },
        cases: [
          {
            id: tool,
            tool,
            arguments: tool === 'sum' ? { a: 2, b: 3 } : {},
            expect: {
              isError: false,
              assertions: [
                {
                  path: '/structuredContent/value',
                  operator: 'equals',
                  value: 5,
                },
              ],
            },
          },
        ],
      };
      await writeFile(path, JSON.stringify(config));
      for (const lang of ['en', 'zh']) {
        await rm(trace, { force: true });
        const result = await run(lang, ['test', '-c', path, '--allow-exec'], {
          MCPCL_TEST_TRACE: trace,
          MCPCL_TEST_SECRET: 'locale-sensitive-value',
          FORCE_COLOR: '1',
        });
        expect(result.code).toBe(tool === 'sum' ? 0 : tool === 'crash' ? 2 : 1);
        const log = await readFile(trace, 'utf8');
        expect(log.match(/CALL /g)).toHaveLength(1);
        for (const secret of [
          'locale-sensitive-value',
          'never-print-this-token',
          'never-print-this-log',
          '\u001b',
        ])
          expect(result.stdout + result.stderr).not.toContain(secret);
        if (lang === 'zh') expect(result.stdout).toMatch(/[\u4e00-\u9fff]/);
        await rm(trace, { force: true });
        const blocked = await run(lang, ['test', '-c', path]);
        expect(blocked.code).toBe(3);
        expect(await readFile(trace, 'utf8').catch(() => '')).toBe('');
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 30000);

it('honors command-line precedence and quietly falls back for unknown locales', async () => {
  const before = await execute(
    process.execPath,
    [cli, '--lang', 'zh-CN', 'test', '--help'],
    { env: { ...process.env, MCPCL_LANG: 'en' } },
  );
  const after = await run('zh-CN', ['test', '--help'], { MCPCL_LANG: 'en' });
  expect(before.stdout).toBe(after.stdout);
  const unknown = await run('not-a-locale', ['test', '--help'], {
    MCPCL_LANG: 'zh',
  });
  const english = await run('en', ['test', '--help']);
  expect(unknown.stdout).toBe(english.stdout);
  expect(unknown.stderr).toBe('');
});
