import { createHash } from 'node:crypto';
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
  symlink,
  link,
  stat,
  readdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { htmlReport, escapeHtml } from '../../src/reports/html.js';
import { htmlScript, htmlStyle } from '../../src/reports/html-assets.js';
import { prepareHtmlOutput, writeHtml } from '../../src/reports/html-file.js';
import { makeReport } from '../../src/runner/run-suite.js';
import { message, texts } from '../../src/i18n/message.js';
import { registerSecrets } from '../../src/reports/redact.js';
import { reportLimit } from '../../src/i18n/presentation.js';

it('escapes text and attribute delimiters without interpreting null as markup', () => {
  expect(escapeHtml(`<img src="x" onerror='alert(1)'>&`)).toBe(
    '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;',
  );
  expect(escapeHtml(null)).toBe('');
  expect(escapeHtml(undefined)).toBe('');
});
it('treats malicious ids, names, diagnostics and coverage as text and redacts secrets', () => {
  registerSecrets(['html-known-private-value']);
  const attack =
    '</script><script>globalThis.pwned=1</script><img src=https://attacker.invalid onerror=alert(1)><svg onload=alert(2)>';
  const report = makeReport(
    [
      {
        id: attack,
        tool: '工具' + attack,
        status: 'failed',
        diagnostics: [
          attack,
          'token=do-not-emit',
          'html-known-private-value',
          '\u001b[31m中文\u001b[0m',
        ],
      },
    ],
    1,
  );
  report.coverage = {
    discoveryComplete: true,
    advertisedTools: [attack],
    attemptedTools: [attack],
    completedTools: [],
    untestedTools: [attack],
    enumBranches: [
      { tool: attack, path: '/' + attack, total: 2, observed: [] },
    ],
    limitations: [attack],
  };
  for (const locale of ['en', 'zh-CN'] as const) {
    const html = htmlReport(report, locale);
    expect(html).not.toContain(attack);
    expect(html).toContain('&lt;/script&gt;');
    expect(html).not.toContain('do-not-emit');
    expect(html).not.toContain('html-known-private-value');
    expect(html).not.toContain('\u001b');
    expect(html).toContain('[REDACTED]');
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html).not.toMatch(/<(img|svg|iframe|a|link|form)\b/);
    for (const tag of html.match(/<[^>]+>/g) ?? [])
      expect(tag).not.toMatch(/\s(?:onerror|onload|src|href|style)=/);
  }
});
it('hashes only fixed executable assets and denies network, framing, forms and base URLs', () => {
  const html = htmlReport(makeReport([]));
  for (const asset of [htmlScript, htmlStyle]) {
    expect(html).toContain(
      'sha256-' + createHash('sha256').update(asset).digest('base64'),
    );
  }
  expect(html).toContain('Content-Security-Policy');
  expect(html).toContain('connect-src &#39;none&#39;');
  expect(html).toContain('base-uri &#39;none&#39;');
  expect(html).toContain('form-action &#39;none&#39;');
  expect(html).not.toContain('unsafe-inline');
  expect(html).not.toMatch(/https?:\/\//);
  expect(htmlScript).not.toMatch(
    /innerHTML|eval\(|new Function|fetch\(|XMLHttpRequest|localStorage/,
  );
});
it('reuses typed bilingual diagnostics while leaving identical opaque strings untouched', () => {
  const diagnostic = texts(message('run.isError', false, true));
  const report = makeReport(
    [
      {
        id: '中文用例',
        tool: '原始工具',
        status: 'failed',
        diagnostics: diagnostic,
      },
    ],
    1,
  );
  const html = htmlReport(report, 'zh-CN');
  expect(html).toContain('<html lang="zh-CN">');
  expect(html).toContain('/isError: expected false, actual true');
  expect(html).toContain('/isError：预期 false，实际 true');
  expect(html).toContain('中文用例');
  expect(JSON.stringify(report)).not.toContain('预期');
  const raw = htmlReport(
    makeReport(
      [
        {
          id: 'raw',
          tool: 'raw',
          status: 'failed',
          diagnostics: [...diagnostic],
        },
      ],
      1,
    ),
  );
  expect(raw).not.toContain('/isError：预期');
});
it.each([2, 3] as const)(
  'does not imply success or measured coverage for exit %s',
  (code) => {
    const html = htmlReport(
      makeReport(
        [
          {
            id: 'not-run',
            tool: 'unknown',
            status: code === 3 ? 'blocked' : 'unrun',
            diagnostics: [],
          },
        ],
        code,
      ),
    );
    expect(html).toContain(`id="exit-code">${code}`);
    expect(html).toContain('coverage-unknown');
    expect(html).toContain('Coverage is unknown, not 0% or 100%.');
    expect(html).toContain(
      code === 3
        ? 'Execution blocked by safety policy'
        : 'Execution incomplete',
    );
  },
);
it('bounds the entire bilingual document at 4 MiB with the same gate for both locales', () => {
  const report = makeReport(
    [
      {
        id: 'large',
        tool: 'large',
        status: 'failed',
        diagnostics: Array.from({ length: 400 }, () => '<'.repeat(2000)),
      },
    ],
    1,
  );
  expect(Buffer.byteLength(JSON.stringify(report))).toBeLessThan(reportLimit);
  for (const lang of ['en', 'zh-CN'] as const)
    expect(() => htmlReport(report, lang)).toThrow('HTML report exceeds 4 MiB');
  report.errors = Array.from({ length: 2200 }, () => 'x'.repeat(2000));
  expect(() => htmlReport(report)).toThrow('Report exceeds 4 MiB');
});
it('publishes complete private files atomically and never replaces files or aliases', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcpcl-html-write-'));
  try {
    const target = join(directory, 'report.html');
    await writeHtml(target, '<!doctype html>complete');
    expect((await stat(target)).mode & 0o777).toBe(0o600);
    const protectedFile = join(directory, 'config.json');
    await writeFile(protectedFile, 'protected');
    await symlink(protectedFile, join(directory, 'symlink'));
    await symlink(join(directory, 'absent'), join(directory, 'dangling'));
    await link(protectedFile, join(directory, 'hardlink'));
    await symlink(directory, join(directory, 'parent-alias'));
    for (const path of [
      target,
      protectedFile,
      join(directory, 'symlink'),
      join(directory, 'hardlink'),
      join(directory, 'dangling'),
      join(directory, 'parent-alias/config.json'),
      directory,
    ]) {
      await expect(prepareHtmlOutput(path)).rejects.toMatchObject({ code: 2 });
      await expect(writeHtml(path, 'replacement')).rejects.toMatchObject({
        code: 2,
      });
    }
    const raced = await prepareHtmlOutput(join(directory, 'race.html'));
    await writeFile(raced, 'created after preflight');
    await expect(writeHtml(raced, 'replacement')).rejects.toMatchObject({
      code: 2,
    });
    const results = await Promise.allSettled([
      writeHtml(join(directory, 'concurrent'), 'one'),
      writeHtml(join(directory, 'concurrent'), 'two'),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(await readFile(protectedFile, 'utf8')).toBe('protected');
    expect(await readFile(target, 'utf8')).toBe('<!doctype html>complete');
    expect(
      (await readdir(directory)).some((name) => name.endsWith('.tmp')),
    ).toBe(false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('ships readable generated examples with current hash-authorized assets and bounded size', async () => {
  for (const [name, code] of [
    ['passed', 0],
    ['failed', 1],
    ['blocked', 3],
    ['incomplete', 2],
  ] as const) {
    const html = await readFile(`docs/examples/html/${name}.html`, 'utf8');
    expect(html.match(/<style>([\s\S]*?)<\/style>/)?.[1]).toBe(htmlStyle);
    expect(html.match(/<script>([\s\S]*?)<\/script>/)?.[1]).toBe(htmlScript);
    expect(html).toContain(`id="exit-code">${code}`);
    expect(Buffer.byteLength(html)).toBeLessThanOrEqual(reportLimit);
  }
});
