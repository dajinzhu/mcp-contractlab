export type ExitCode = 0 | 1 | 2 | 3;
export class Failure extends Error {
  constructor(
    public readonly code: ExitCode,
    message: string,
  ) {
    super(message);
  }
}
export interface Assertion {
  path: string;
  operator: 'equals' | 'exists' | 'type';
  value?: unknown;
}
export interface Case {
  id: string;
  tool: string;
  arguments: Record<string, unknown>;
  expect: { isError: boolean; assertions: Assertion[] };
}
export interface Config {
  schemaVersion: 1;
  server: {
    name: string;
    transport: 'stdio';
    command: string;
    args: string[];
    cwd: string;
    timeoutMs: number;
    env: string[];
  };
  safety: {
    allowToolCalls: string[];
    maxToolCalls: number;
    toolTimeoutMs: number;
  };
  cases: Case[];
}
export interface CaseResult {
  id: string;
  tool: string;
  status: 'passed' | 'failed' | 'blocked' | 'unrun';
  diagnostics: string[];
}
export interface Report {
  reportVersion: 1;
  protocolVersion: '2026-07-28';
  exitCode: ExitCode;
  cases: CaseResult[];
  counts: Record<CaseResult['status'], number>;
  errors: string[];
}
