import { createHash } from 'node:crypto';
import { Failure, type Report, type CaseResult } from '../types.js';
import {
  arrayTexts,
  message,
  type MessageId,
  type Text,
} from '../i18n/message.js';
import type { Locale } from '../i18n/locale.js';
import { plain, reportLimit, t, translate } from '../i18n/presentation.js';
import { redact } from './redact.js';
import { htmlScript, htmlStyle } from './html-assets.js';

/** Only text/quoted-attribute contexts. Never embed untrusted values in scripts. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );
}
const hash = (value: string) =>
  createHash('sha256').update(value).digest('base64');
export const htmlCsp = `default-src 'none'; script-src 'sha256-${hash(htmlScript)}'; style-src 'sha256-${hash(htmlStyle)}'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; media-src 'none'; worker-src 'none'; manifest-src 'none'`;
const statuses = ['passed', 'failed', 'blocked', 'unrun'] as const;
type StaticId = {
  [K in MessageId]: Parameters<
    (typeof import('../i18n/en.js').en)[K]
  > extends []
    ? K
    : never;
}[MessageId];
const pair = (english: string, chinese: string) =>
  `<span class="locale-en" lang="en">${escapeHtml(english)}</span><span class="locale-zh" lang="zh-CN">${escapeHtml(chinese)}</span>`;
const label = (id: StaticId) => pair(t('en', id), t('zh-CN', id));
const statusLabel = (status: CaseResult['status']) =>
  pair(t('en', 'view.status', status), t('zh-CN', 'view.status', status));
const diagnostic = (value: Text) =>
  pair(
    plain(String(redact(translate(value, 'en')))),
    plain(String(redact(translate(value, 'zh-CN')))),
  );
const opaque = (value: string) =>
  `<span data-opaque>${escapeHtml(plain(value))}</span>`;
function accessible(id: StaticId): string {
  return `data-label-en="${escapeHtml(t('en', id))}" data-label-zh="${escapeHtml(t('zh-CN', id))}"`;
}
function coverageHtml(coverage: Report['coverage']): string {
  const list = (values: string[]) =>
    values.length
      ? values.map((value) => `<code>${opaque(value)}</code>`).join(', ')
      : label('html.noTools');
  const measured = coverage?.discoveryComplete
    ? `<div class="coverage-heading"><strong>${label('html.measured')}</strong></div><dl>${(
        [
          ['html.advertised', coverage.advertisedTools],
          ['html.attempted', coverage.attemptedTools],
          ['html.completed', coverage.completedTools],
          ['html.untested', coverage.untestedTools],
        ] as const
      )
        .map(
          ([id, values]) =>
            `<dt>${label(id)} (${values.length})</dt><dd>${list(values)}</dd>`,
        )
        .join('')}</dl><p>${label('html.coverageDetail')}</p>
      <div class="coverage-heading"><strong>${label('html.enums')}</strong></div>
      ${coverage.enumBranches.length ? coverage.enumBranches.map((branch) => `<div class="enum-row"><code>${opaque(branch.tool)} ${opaque(branch.path)}</code><div>${label('html.enumIndices')}: <code>${escapeHtml(branch.observed.join(', ') || '—')} / ${escapeHtml(branch.total)}</code></div></div>`).join('') : `<p>${label('html.noEnums')}</p>`}`
    : `<p class="coverage-unknown">${label('html.noCoverage')}</p>`;
  return `<aside class="coverage" aria-labelledby="coverage-title"><h2 id="coverage-title">${label('html.coverage')}</h2>${measured}<div class="warning"><div class="coverage-heading"><strong>${label('html.unmeasured')}</strong></div><p>${label('html.coverageLimits')}</p></div>${coverage?.limitations.length ? `<details><summary>${label('html.rawLimits')}</summary><ul>${coverage.limitations.map((value) => `<li>${opaque(value)}</li>`).join('')}</ul></details>` : ''}</aside>`;
}

/** Complete static document. Both languages are bounded and escaped before writing. */
export function htmlReport(report: Report, locale: Locale = 'en'): string {
  // Retain the canonical report guard in addition to the complete HTML budget.
  const safe = redact(report) as Report;
  if (Buffer.byteLength(JSON.stringify(safe, null, 2)) > reportLimit)
    throw new Failure(2, message('output.large'));
  const kind =
    report.exitCode === 3
      ? 'blocked'
      : report.exitCode === 2 || report.counts.unrun > 0
        ? 'incomplete'
        : report.exitCode === 1
          ? 'failure'
          : 'success';
  const heading = {
    blocked: 'html.blocked',
    incomplete: 'html.incomplete',
    failure: 'html.failure',
    success: 'html.success',
  } as const;
  const detail = {
    blocked: 'html.blockedDetail',
    incomplete: 'html.incompleteDetail',
    failure: 'html.failureDetail',
    success: 'html.successDetail',
  } as const;
  const cards = safe.cases
    .map((result, index) => {
      const status = statuses.includes(result.status) ? result.status : 'unrun';
      return `<details class="case" data-status="${status}"${status === 'passed' ? '' : ' open'}><summary><div class="case-title"><span class="badge ${status}">${statusLabel(status)}</span><span class="case-id">${opaque(result.id)}</span></div><span class="tool">${opaque(result.tool)}</span></summary><div class="case-body"><div class="detail-label">${label('html.diagnostics')}</div>${
        result.diagnostics.length
          ? arrayTexts(report.cases[index]!.diagnostics)
              .map((value) => `<pre>${diagnostic(value)}</pre>`)
              .join('')
          : `<p class="muted">${label('html.noDiagnostics')}</p>`
      }</div></details>`;
    })
    .join('');
  const document = `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(htmlCsp)}"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>MCP ContractLab — Report / 报告</title><style>${htmlStyle}</style></head><body>
<main><header class="topbar"><div class="brand"><span class="mark" aria-hidden="true">&gt;_</span><div><span class="eyebrow">${label('html.eyebrow')}</span><strong>MCP ContractLab</strong></div></div><div class="controls"><select id="language" ${accessible('html.language')} aria-label="${escapeHtml(t(locale, 'html.language'))}"><option value="en"${locale === 'en' ? ' selected' : ''}>English</option><option value="zh-CN"${locale === 'zh-CN' ? ' selected' : ''}>简体中文</option></select><button type="button" id="theme" ${accessible('html.theme')} aria-label="${escapeHtml(t(locale, 'html.theme'))}" aria-pressed="false"><span aria-hidden="true">◐</span></button></div></header>
<section class="hero"><span class="offline">${label('html.offline')}</span><h1 id="report-title">${label('html.title')}</h1><p>${label('html.subtitle')}</p></section>
<section class="metrics" aria-labelledby="report-title">${statuses.map((status) => `<div class="metric ${status}"><div class="metric-label">${statusLabel(status)}</div><div class="metric-value" data-count="${status}">${escapeHtml(safe.counts[status])}</div></div>`).join('')}<div class="metric"><div class="metric-label">${label('html.exit')}</div><div class="metric-value" id="exit-code">${escapeHtml(safe.exitCode)}</div></div></section>
<section class="banner ${kind}" role="status"><strong>${label(heading[kind])}</strong><p>${label(detail[kind])}</p></section>
${
  report.errors.length
    ? `<section class="run-errors"><h2>${label('html.errors')}</h2>${arrayTexts(
        report.errors,
      )
        .map((value) => `<pre>${diagnostic(value)}</pre>`)
        .join('')}</section>`
    : ''
}
<div class="layout"><section aria-labelledby="cases-title"><div class="section-head"><h2 id="cases-title">${label('html.results')}</h2><span class="section-kicker" id="visible-count" aria-live="polite">${safe.cases.length} / ${safe.cases.length}</span></div><input class="search" id="search" type="search" ${accessible('html.search')} aria-label="${escapeHtml(t(locale, 'html.search'))}" placeholder="${escapeHtml(t(locale, 'html.search'))}"><div class="filters" role="group" ${accessible('html.filters')} aria-label="${escapeHtml(t(locale, 'html.filters'))}"><button type="button" data-filter="all" aria-pressed="true">${label('html.all')}</button>${statuses.map((status) => `<button type="button" data-filter="${status}" aria-pressed="false">${statusLabel(status)}</button>`).join('')}</div>${cards}${safe.cases.length ? '' : `<p class="empty">${label('html.noCases')}</p>`}<p class="empty" id="empty" hidden>${label('html.empty')}</p></section>${coverageHtml(safe.coverage)}</div>
<noscript>${label('html.static')}</noscript><footer><span>${label('html.footer')}</span><code>MCP ${escapeHtml(safe.protocolVersion)} · report v${escapeHtml(safe.reportVersion)}</code></footer></main><script>${htmlScript}</script></body></html>`;
  // The body always contains both languages; only initial accessible attributes
  // and the root language vary. Reserve the larger attribute set in either locale.
  const initialBytes = (language: Locale) =>
    language.length +
    (
      [
        'html.language',
        'html.theme',
        'html.search',
        'html.search',
        'html.filters',
      ] as const
    ).reduce(
      (bytes, id) => bytes + Buffer.byteLength(escapeHtml(t(language, id))),
      0,
    );
  const largestInitial = Math.max(initialBytes('en'), initialBytes('zh-CN'));
  if (
    Buffer.byteLength(document) + largestInitial - initialBytes(locale) >
    reportLimit
  )
    throw new Failure(2, message('html.large'));
  return document;
}
