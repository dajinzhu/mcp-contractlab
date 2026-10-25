import { execFile, type ExecFileException } from 'node:child_process';
import { promisify } from 'node:util';
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  symlink,
  link,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
const execute = promisify(execFile);
async function cli(args: string[], env: NodeJS.ProcessEnv = {}) {
  try {
    return {
      ...(await execute(
        process.execPath,
        [resolve('dist/src/cli.js'), ...args],
        { timeout: 15000, env: { ...process.env, MCPCL_LANG: 'en', ...env } },
      )),
      code: 0,
    };
  } catch (error) {
    const result = error as ExecFileException & {
      stdout: string;
      stderr: string;
    };
    if (typeof result.code !== 'number') throw error;
    return { stdout: result.stdout, stderr: result.stderr, code: result.code };
  }
}
it.each(['en', 'zh-CN'])(
  'generates actual pass, fail and blocked HTML with unchanged exits (%s)',
  async (lang) => {
    const dir = await mkdtemp(join(tmpdir(), 'mcpcl-html-cli-'));
    try {
      for (const [name, allow, code] of [
        ['mcpcl.config.yaml', true, 0],
        ['mcpcl.broken.yaml', true, 1],
        ['mcpcl.config.yaml', false, 3],
      ] as const) {
        const output = join(dir, `${code}.html`);
        const result = await cli([
          'test',
          '-c',
          resolve('examples', name),
          '--report',
          'html',
          '--output',
          output,
          '--lang',
          lang,
          ...(allow ? ['--allow-exec'] : []),
        ]);
        expect(result.code).toBe(code);
        expect(result.stdout).toBe('');
        expect(result.stderr).toBe('');
        const html = await readFile(output, 'utf8');
        expect(html).toContain(`<html lang="${lang}">`);
        expect(html).toContain(`id="exit-code">${code}`);
        expect(html).toContain('Content-Security-Policy');
        if (code === 3) expect(html).toContain('coverage-unknown');
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
);
it('requires a new explicit output path before launching tools and protects aliases/baselines', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcpcl-html-protected-'));
  const config = join(dir, 'config.json');
  const baseline = join(dir, 'baseline.json');
  const trace = join(dir, 'trace');
  try {
    const source = JSON.stringify({
      schemaVersion: 1,
      server: {
        name: 'html',
        transport: 'stdio',
        command: process.execPath,
        args: [resolve('dist/tests/fixtures/behavior-server.js')],
        env: ['MCPCL_TEST_TRACE'],
      },
      safety: { allowToolCalls: ['sum'] },
      cases: [
        {
          id: 'sum',
          tool: 'sum',
          arguments: { a: 2, b: 3 },
          expect: { isError: false, assertions: [] },
        },
      ],
    });
    await writeFile(config, source);
    await writeFile(baseline, 'baseline must survive');
    await symlink(config, join(dir, 'symlink'));
    await link(config, join(dir, 'hardlink'));
    await symlink(dir, join(dir, 'parent-alias'));
    const base = ['test', '-c', config, '--allow-exec', '--report', 'html'];
    for (const output of [
      undefined,
      config,
      baseline,
      join(dir, 'symlink'),
      join(dir, 'hardlink'),
      join(dir, 'parent-alias/config.json'),
      join(dir, 'missing-parent/report.html'),
    ]) {
      const result = await cli(
        [...base, ...(output ? ['--output', output] : [])],
        { MCPCL_TEST_TRACE: trace },
      );
      expect(result.code).toBe(2);
      expect(result.stdout).toBe('');
      expect(await readFile(trace, 'utf8').catch(() => '')).toBe('');
    }
    expect(await readFile(config, 'utf8')).toBe(source);
    expect(await readFile(baseline, 'utf8')).toBe('baseline must survive');
    for (const command of ['inspect', 'diff']) {
      const result = await cli(
        [
          command,
          '-c',
          config,
          '--allow-exec',
          '--report',
          'html',
          '--output',
          join(dir, command),
          ...(command === 'diff' ? ['--baseline', baseline] : []),
        ],
        { MCPCL_TEST_TRACE: trace },
      );
      expect(result.code).toBe(2);
      expect(await readFile(trace, 'utf8').catch(() => '')).toBe('');
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it('renders Chinese, malicious strings, null/missing diagnostics and interrupted coverage from actual fixtures', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcpcl-html-fixtures-'));
  const path = join(dir, 'config.json');
  const trace = join(dir, 'trace');
  const attack =
    '</script><script>globalThis.pwned=1</script><img src=x onerror=alert(1)>';
  try {
    for (const tool of ['null', 'missing', 'secret', 'crash']) {
      const id = '中文用例 ' + attack;
      const config = {
        schemaVersion: 1,
        server: {
          name: 'html',
          transport: 'stdio',
          command: process.execPath,
          args: [resolve('dist/tests/fixtures/behavior-server.js')],
          env: ['MCPCL_TEST_TRACE', 'MCPCL_TEST_SECRET'],
        },
        safety: { allowToolCalls: [tool, 'sum'], maxToolCalls: 2 },
        cases: [
          {
            id,
            tool,
            arguments: {},
            expect: {
              isError: false,
              assertions: [
                {
                  path: '/structuredContent',
                  operator: 'equals',
                  value: attack,
                },
              ],
            },
          },
          {
            id: 'after',
            tool: 'sum',
            arguments: { a: 2, b: 3 },
            expect: { isError: false, assertions: [] },
          },
        ],
      };
      await writeFile(path, JSON.stringify(config));
      await rm(trace, { force: true });
      const output = join(dir, tool + '.html');
      const result = await cli(
        [
          'test',
          '-c',
          path,
          '--allow-exec',
          '--report',
          'html',
          '--output',
          output,
          '--lang',
          'zh-CN',
        ],
        {
          MCPCL_TEST_TRACE: trace,
          MCPCL_TEST_SECRET: 'html-sensitive-fixture',
        },
      );
      expect(result.code).toBe(tool === 'crash' ? 2 : 1);
      const html = await readFile(output, 'utf8');
      expect(html).toContain('中文用例');
      expect(html).toContain('&lt;/script&gt;');
      expect(html).not.toContain(attack);
      for (const secret of [
        'html-sensitive-fixture',
        'never-print-this-token',
        'never-print-this-log',
      ])
        expect(html).not.toContain(secret);
      const log = await readFile(trace, 'utf8');
      expect(log.match(/CALL /g)).toHaveLength(tool === 'crash' ? 1 : 2);
      if (tool === 'null') expect(html).toContain('null');
      if (tool === 'missing') expect(html).toContain('（缺失）');
      if (tool === 'crash') {
        expect(html).toContain('Execution incomplete');
        expect(html).toContain('data-status="unrun"');
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
