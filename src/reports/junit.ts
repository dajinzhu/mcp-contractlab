import type { Report } from '../types.js';
function xml(value: string): string {
  return Array.from(value)
    .filter((c) => {
      const n = c.codePointAt(0)!;
      return (
        n === 9 ||
        n === 10 ||
        n === 13 ||
        (n >= 0x20 && n <= 0xd7ff) ||
        (n >= 0xe000 && n <= 0xfffd) ||
        (n >= 0x10000 && n <= 0x10ffff)
      );
    })
    .join('')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
/** Receives an already redacted report, identical to console/JSON reporting. */
export function junitReport(report: Report): string {
  const entries = report.cases.map((c) => {
    const message = c.diagnostics.join('; ');
    const body =
      c.status === 'passed'
        ? ''
        : c.status === 'failed'
          ? `<${report.exitCode === 2 ? 'error' : 'failure'} message="${xml(message)}">${xml(message)}</${report.exitCode === 2 ? 'error' : 'failure'}>`
          : `<skipped message="${xml(c.status + ': ' + message)}"/>`;
    return `<testcase classname="${xml(c.tool)}" name="${xml(c.id)}">${body}</testcase>`;
  });
  const synthetic = report.exitCode !== 0 && report.counts.failed === 0;
  if (synthetic)
    entries.push(
      `<testcase classname="mcpcl" name="run-status"><error message="${xml(report.errors.join('; ') || 'Run did not succeed')}">${xml(report.errors.join('; '))}</error></testcase>`,
    );
  const errors =
    (report.exitCode === 2 ? report.counts.failed : 0) + Number(synthetic);
  const failures = report.exitCode === 2 ? 0 : report.counts.failed;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites><testsuite name="MCP ContractLab" tests="${entries.length}" failures="${failures}" errors="${errors}" skipped="${report.counts.blocked + report.counts.unrun}">${entries.join('')}</testsuite></testsuites>`;
}
