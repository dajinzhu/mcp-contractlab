import { writeFile } from 'node:fs/promises';
import { Failure, type Report } from '../types.js';
import { redact } from './redact.js';
import { junitReport } from './junit.js';

export function consoleReport(report: Report): string {
  return [
    ...report.errors,
    ...report.cases.map(
      (c) =>
        `${c.status.toUpperCase()} ${c.id} (${c.tool})${c.diagnostics.length ? ': ' + c.diagnostics.join('; ') : ''}`,
    ),
    `${report.counts.passed} passed, ${report.counts.failed} failed, ${report.counts.blocked} blocked, ${report.counts.unrun} unrun; exit ${report.exitCode}`,
  ].join('\n');
}
export async function output(
  value: unknown,
  format: string,
  destination?: string,
): Promise<void> {
  const safe = redact(value);
  const text =
    format === 'junit'
      ? junitReport(safe as Report)
      : format === 'console' &&
          typeof safe === 'object' &&
          safe !== null &&
          'reportVersion' in safe
        ? consoleReport(safe as Report)
        : JSON.stringify(safe, null, 2);
  if (Buffer.byteLength(text) > 4 * 1024 * 1024)
    throw new Failure(2, 'Report exceeds 4 MiB');
  if (destination) {
    try {
      await writeFile(destination, text + '\n', { mode: 0o600 });
    } catch {
      throw new Failure(2, 'Cannot write report file');
    }
  } else process.stdout.write(text + '\n');
}
