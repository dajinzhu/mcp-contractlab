import { writeFile } from 'node:fs/promises';
import { Failure, type Report } from '../types.js';
import { redact } from './redact.js';
import { junitReport } from './junit.js';
import { arrayTexts, textFor, message } from '../i18n/message.js';
import {
  translate,
  t,
  boundedHuman,
  reportLimit,
} from '../i18n/presentation.js';
import type { Locale } from '../i18n/locale.js';
import type { Change } from '../contracts/diff.js';
import type { Tool } from '@modelcontextprotocol/client';

export function consoleReport(report: Report, locale: Locale = 'en'): string {
  const safe = redact(report) as Report;
  const display = (values: string[]) =>
    arrayTexts(values).map(
      (value) => redact(translate(value, locale)) as string,
    );
  return [
    ...display(report.errors),
    ...safe.cases.map(
      (c, index) =>
        `${t(locale, 'view.status', c.status)} ${c.id} (${c.tool})${c.diagnostics.length ? ': ' + display(report.cases[index]!.diagnostics).join('; ') : ''}`,
    ),
    t(
      locale,
      'view.counts',
      safe.counts.passed,
      safe.counts.failed,
      safe.counts.blocked,
      safe.counts.unrun,
      safe.exitCode,
    ),
  ].join('\n');
}
function human(value: unknown, locale: Locale): string {
  if (typeof value !== 'object' || value === null)
    return JSON.stringify(redact(value), null, 2);
  if ('reportVersion' in value) return consoleReport(value as Report, locale);
  if ('diffVersion' in value) {
    const report = value as {
      diffVersion: unknown;
      protocolVersion: string;
      exitCode: number;
      changes: Change[];
    };
    return [
      `${t(locale, 'view.protocol')}: ${report.protocolVersion}`,
      ...report.changes.map(
        (change) =>
          `${t(locale, 'view.classification', change.classification)} ${redact(change.tool)} ${redact(change.path)}: ${redact(translate(textFor(change, change.reason), locale))}`,
      ),
      t(locale, 'view.changes', report.changes.length, report.exitCode),
    ].join('\n');
  }
  if ('tools' in value) {
    const data = redact(value) as { protocolVersion: string; tools: Tool[] };
    return [
      `${t(locale, 'view.protocol')}: ${data.protocolVersion}`,
      ...data.tools.map(
        (tool) =>
          `${t(locale, 'view.tool')}: ${tool.name}\n${t(locale, 'view.description')}: ${tool.description ?? t(locale, 'view.noDescription')}\n${t(locale, 'view.input')}: ${JSON.stringify(tool.inputSchema, null, 2)}\n${t(locale, 'view.output')}: ${tool.outputSchema === undefined ? t(locale, 'view.noDescription') : JSON.stringify(tool.outputSchema, null, 2)}`,
      ),
      t(locale, 'view.tools', data.tools.length),
    ].join('\n');
  }
  return JSON.stringify(redact(value), null, 2);
}
export async function output(
  value: unknown,
  format: string,
  destination?: string,
  locale: Locale = 'en',
): Promise<void> {
  const safe = redact(value);
  const canonical =
    format === 'junit'
      ? junitReport(safe as Report)
      : format === 'console' &&
          typeof safe === 'object' &&
          safe !== null &&
          'reportVersion' in safe
        ? consoleReport(value as Report)
        : JSON.stringify(safe, null, 2);
  const baseline = format === 'console' ? human(value, 'en') : canonical;
  if (Buffer.byteLength(baseline) > reportLimit)
    throw new Failure(2, message('output.large'));
  const text =
    format === 'console'
      ? boundedHuman(human(value, locale), locale)
      : canonical;
  if (destination) {
    try {
      await writeFile(destination, text + '\n', { mode: 0o600 });
    } catch {
      throw new Failure(2, message('output.failed'));
    }
  } else process.stdout.write(text + '\n');
}
