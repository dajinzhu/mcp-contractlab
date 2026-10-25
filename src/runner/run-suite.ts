import { message, texts, appendText, textFor } from '../i18n/message.js';
import type { Client, Tool } from '@modelcontextprotocol/client';
import {
  Failure,
  type CaseResult,
  type Config,
  type ExitCode,
  type Report,
} from '../types.js';
import { assertionDiagnostic } from '../contracts/assertions.js';
import { checkSchema } from '../contracts/schema.js';
import { coverageTracker } from './coverage.js';
import { withSession } from '../transports/stdio.js';

export function makeReport(
  results: CaseResult[],
  code: ExitCode = 0,
  errors: string[] = [],
): Report {
  const counts = { passed: 0, failed: 0, blocked: 0, unrun: 0 };
  for (const result of results) counts[result.status]++;
  return {
    reportVersion: 1,
    protocolVersion: '2026-07-28',
    exitCode: code,
    counts,
    cases: results,
    errors,
  };
}

export async function discover(
  client: Client,
  config: Config,
  signal: AbortSignal,
): Promise<Tool[]> {
  const { tools } = await client.listTools(
    {},
    {
      timeout: config.server.timeoutMs,
      maxTotalTimeout: config.server.timeoutMs,
      signal,
    },
  );
  if (
    tools.length > 1000 ||
    new Set(tools.map((t) => t.name)).size !== tools.length
  )
    throw new Failure(2, message('discovery.invalidTools'));
  return tools.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

export async function runSuite(
  config: Config,
  allowExec: boolean,
  signal: AbortSignal,
): Promise<Report> {
  const results: CaseResult[] = config.cases.map((c) => ({
    id: c.id,
    tool: c.tool,
    status: 'unrun',
    diagnostics: [],
  }));
  const coverage = coverageTracker();
  const report = (...args: Parameters<typeof makeReport>): Report => ({
    ...makeReport(...args),
    coverage: coverage.report(),
  });
  if (
    !allowExec ||
    config.cases.some((c) => !config.safety.allowToolCalls.includes(c.tool)) ||
    config.cases.length > config.safety.maxToolCalls
  ) {
    for (const result of results) {
      result.status = 'blocked';
      result.diagnostics = texts(message('safety.blockedCases'));
    }
    return report(results, 3, texts(message('safety.blockedRun')));
  }
  if (config.cases.length === 0) {
    return report(results, 2, texts(message('run.empty')));
  }
  try {
    return await withSession(config, signal, async (client, signal) => {
      const tools = await discover(client, config, signal);
      coverage.discover(tools);
      const index = new Map(tools.map((t) => [t.name, t]));
      if (config.cases.some((c) => !index.has(c.tool)))
        throw new Failure(2, message('run.unknownTool'));
      // Validate all inputs before invoking any tool.
      for (let i = 0; i < config.cases.length; i++) {
        if (signal.aborted)
          throw new Failure(2, message('run.inputInterrupted'));
        const c = config.cases[i]!;
        const check = await checkSchema(
          index.get(c.tool)!.inputSchema,
          c.arguments,
        );
        if (!check.valid) {
          results[i]!.status = 'failed';
          appendText(results[i]!.diagnostics, {
            prefix: '/arguments',
            detail: check.presentation ?? check.diagnostic,
          });
        }
      }
      if (results.some((r) => r.status === 'failed'))
        return report(results, 1, texts(message('run.inputFailed')));
      for (let i = 0; i < config.cases.length; i++) {
        if (signal.aborted)
          throw new Failure(2, message('run.callInterrupted'));
        const c = config.cases[i]!;
        const record = results[i]!;
        const tool = index.get(c.tool)!;
        try {
          // Official SDK request API; independent worker-based output validation
          // avoids synchronous untrusted regex execution in the SDK's validator.
          // No retries: one case consumes exactly one tools/call budget unit.
          coverage.attempt(c.tool);
          const result = await client.request(
            {
              method: 'tools/call',
              params: { name: c.tool, arguments: c.arguments },
            },
            {
              timeout: config.safety.toolTimeoutMs,
              maxTotalTimeout: config.safety.toolTimeoutMs,
              signal,
            },
          );
          coverage.complete(c.tool, c.arguments);
          if (Boolean(result.isError) !== c.expect.isError)
            appendText(
              record.diagnostics,
              message('run.isError', c.expect.isError, Boolean(result.isError)),
            );
          if (tool.outputSchema !== undefined && !result.isError) {
            if (!Object.hasOwn(result, 'structuredContent'))
              appendText(record.diagnostics, message('run.missingOutput'));
            else {
              const check = await checkSchema(
                tool.outputSchema,
                result.structuredContent,
              );
              if (!check.valid)
                appendText(record.diagnostics, {
                  prefix: '/structuredContent',
                  detail: check.presentation ?? check.diagnostic,
                });
            }
          }
          for (const assertion of c.expect.assertions) {
            const error = assertionDiagnostic(result, assertion);
            if (error) appendText(record.diagnostics, error);
          }
          if (signal.aborted)
            throw new Failure(2, message('run.outputInterrupted'));
          record.status = record.diagnostics.length ? 'failed' : 'passed';
        } catch {
          record.status = 'failed';
          appendText(record.diagnostics, message('run.requestFailed'));
          return report(results, 2, texts(message('run.stopped')));
        }
      }
      return report(
        results,
        results.some((r) => r.status === 'failed') ? 1 : 0,
      );
    });
  } catch (error) {
    if (error instanceof Failure && error.code === 3)
      for (const result of results)
        if (result.status === 'unrun') {
          result.status = 'blocked';
          appendText(result.diagnostics, textFor(error, error.message));
        }
    return report(
      results,
      error instanceof Failure ? error.code : 2,
      texts(
        error instanceof Failure
          ? textFor(error, error.message)
          : message('run.failed'),
      ),
    );
  }
}
