import { expect, it } from 'vitest';
import { en } from '../../src/i18n/en.js';
import { zhCN } from '../../src/i18n/zh-CN.js';
import { normalizeLocale, resolveLocale } from '../../src/i18n/locale.js';
import {
  appendText,
  arrayTexts,
  message,
  texts,
} from '../../src/i18n/message.js';
import {
  boundedHuman,
  plain,
  reportLimit,
  translate,
} from '../../src/i18n/presentation.js';

it.each(['zh', 'zh_CN.UTF-8', 'ZH-hans-CN', 'zh-Hans@custom'])(
  'normalizes %s',
  (value) => {
    expect(normalizeLocale(value)).toBe('zh-CN');
  },
);
it('resolves explicit flags and environment priority without changing the environment', () => {
  const env = Object.freeze({ MCPCL_LANG: 'en', LC_ALL: 'zh_CN.UTF-8' });
  expect(resolveLocale(['test', '--lang=zh', '--lang', 'en'], env)).toBe('en');
  expect(resolveLocale(['test', '--lang', 'zh'], env)).toBe('zh-CN');
  expect(resolveLocale(['--', '--lang=zh'], env)).toBe('en');
  expect(resolveLocale([], { MCPCL_LANG: ' ', LC_ALL: 'zh' })).toBe('zh-CN');
  expect(resolveLocale([], { MCPCL_LANG: 'unknown', LANG: 'zh' })).toBe('en');
  expect(resolveLocale(['--lang='], { LANG: 'zh' })).toBe('en');
  expect(resolveLocale([], {}, 'zh')).toBe('zh-CN');
  expect(resolveLocale([], { LC_MESSAGES: 'zh', LANG: 'en' })).toBe('zh-CN');
});
it('keeps catalogs complete and canonical strings free of serialized metadata', () => {
  expect(Object.keys(zhCN).sort()).toEqual(Object.keys(en).sort());
  const diagnostics = texts(message('view.tools', 2));
  expect(JSON.stringify(diagnostics)).toBe(
    JSON.stringify([en['view.tools'](2)]),
  );
  expect(translate(arrayTexts(diagnostics)[0]!, 'zh-CN')).toBe(
    zhCN['view.tools'](2),
  );
  expect(translate(en['view.tools'](2), 'zh-CN')).toBe(en['view.tools'](2));
});
it('strips terminal escapes and bounds Chinese expansion without losing the result', () => {
  expect(plain('\u001b[31msecret\u001b[0m')).toBe('secret');
  const summary = '退出码 1';
  const result = boundedHuman(
    `${'中'.repeat(reportLimit)}\n${summary}`,
    'zh-CN',
  );
  expect(Buffer.byteLength(result)).toBeLessThanOrEqual(reportLimit);
  expect(result).toContain(summary);
  expect(result).not.toContain('\ufffd');
});

it('redacts localized diagnostics and keeps oversized canonical reports rejected in both languages', async () => {
  const { output, consoleReport } = await import('../../src/reports/output.js');
  const { mkdtemp, rm, readFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const report: import('../../src/types.js').Report = {
    reportVersion: 1,
    protocolVersion: '2026-07-28',
    exitCode: 1,
    counts: { passed: 0, failed: 1, blocked: 0, unrun: 0 },
    errors: [],
    cases: [
      {
        id: 'opaque-id',
        tool: 'opaque-tool',
        status: 'failed',
        diagnostics: texts(
          message(
            'assert.failure',
            '/value',
            'equals',
            'token=private-value',
            'password=private-password',
            false,
          ),
        ),
      },
    ],
  };
  for (const lang of ['en', 'zh-CN'] as const) {
    const rendered = consoleReport(report, lang);
    expect(rendered).not.toContain('private-value');
    expect(rendered).not.toContain('private-password');
    expect(rendered).toContain('opaque-tool');
  }
  const dir = await mkdtemp(join(tmpdir(), 'mcpcl-i18n-budget-'));
  try {
    // Each diagnostic is below the field limit; total canonical output exceeds 4 MiB.
    report.errors = Array.from({ length: 2200 }, () => 'x'.repeat(2000));
    for (const lang of ['en', 'zh-CN'] as const) {
      await expect(
        output(report, 'console', join(dir, lang), lang),
      ).rejects.toMatchObject({ code: 2 });
    }
    report.errors = [];
    for (let index = 0; index < 125000; index++)
      appendText(report.errors, message('http.noAddresses'));
    expect(Buffer.byteLength(consoleReport(report, 'en'))).toBeLessThan(
      reportLimit,
    );
    expect(Buffer.byteLength(consoleReport(report, 'zh-CN'))).toBeGreaterThan(
      reportLimit,
    );
    await output(report, 'console', join(dir, 'expanded'), 'zh-CN');
    const expanded = await readFile(join(dir, 'expanded'), 'utf8');
    expect(Buffer.byteLength(expanded)).toBeLessThanOrEqual(reportLimit + 1);
    expect(expanded).toContain('退出码 1');
    expect(expanded).not.toContain('\ufffd');
    report.errors = [];
    await output(report, 'console', join(dir, 'zh'), 'zh-CN');
    expect(await readFile(join(dir, 'zh'), 'utf8')).toContain('退出码 1');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it('keeps JSON Schema annotation keys opaque to localization', async () => {
  const { compareSnapshots } = await import('../../src/contracts/diff.js');
  const make = (
    required: string[],
  ): import('../../src/contracts/snapshot.js').Snapshot => ({
    snapshotVersion: 1,
    protocolVersion: '2026-07-28',
    tools: [
      {
        name: 'opaque',
        inputSchema: {
          type: 'object',
          default: {},
          properties: { x: { type: 'string', default: 'opaque-value' } },
          required,
        },
      },
    ],
  });
  expect(compareSnapshots(make([]), make(['x']))).toEqual([
    {
      tool: 'opaque',
      path: '/inputSchema/required',
      classification: 'BREAKING',
      reason: 'New required input properties',
    },
  ]);
});
