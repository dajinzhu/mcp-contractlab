import type { Client, Tool } from '@modelcontextprotocol/client';
import {
  Failure,
  type CaseResult,
  type Config,
  type ExitCode,
  type Report,
} from '../types.js';
import { assertResult } from '../contracts/assertions.js';
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
    throw new Failure(2, 'Too many tools or duplicate tool names');
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
      result.diagnostics = [
        'Process consent, tool allowlist or invocation budget blocked the entire run',
      ];
    }
    return report(results, 3, [
      'Safety preflight blocked execution; no tools were called',
    ]);
  }
  if (config.cases.length === 0) {
    return report(results, 2, [
      'No test cases configured; no tools were called',
    ]);
  }
  try {
    return await withSession(config, signal, async (client, signal) => {
      const tools = await discover(client, config, signal);
      coverage.discover(tools);
      const index = new Map(tools.map((t) => [t.name, t]));
      if (config.cases.some((c) => !index.has(c.tool)))
        throw new Failure(
          2,
          'A configured case names an unknown tool; no tools were called',
        );
      // Validate all inputs before invoking any tool.
      for (let i = 0; i < config.cases.length; i++) {
        if (signal.aborted)
          throw new Failure(2, 'Run interrupted during input validation');
        const c = config.cases[i]!;
        const check = await checkSchema(
          index.get(c.tool)!.inputSchema,
          c.arguments,
        );
        if (!check.valid) {
          results[i]!.status = 'failed';
          results[i]!.diagnostics.push(`/arguments${check.diagnostic}`);
        }
      }
      if (results.some((r) => r.status === 'failed'))
        return report(results, 1, [
          'Input validation failed; no tools were called',
        ]);
      for (let i = 0; i < config.cases.length; i++) {
        if (signal.aborted)
          throw new Failure(2, 'Run interrupted before tool invocation');
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
            record.diagnostics.push(
              `/isError: expected ${c.expect.isError}, actual ${Boolean(result.isError)}`,
            );
          if (tool.outputSchema !== undefined && !result.isError) {
            if (!Object.hasOwn(result, 'structuredContent'))
              record.diagnostics.push(
                '/structuredContent: missing output required by advertised schema',
              );
            else {
              const check = await checkSchema(
                tool.outputSchema,
                result.structuredContent,
              );
              if (!check.valid)
                record.diagnostics.push(
                  `/structuredContent${check.diagnostic}`,
                );
            }
          }
          for (const assertion of c.expect.assertions) {
            const error = assertResult(result, assertion);
            if (error) record.diagnostics.push(error);
          }
          if (signal.aborted)
            throw new Failure(2, 'Run interrupted during result validation');
          record.status = record.diagnostics.length ? 'failed' : 'passed';
        } catch {
          record.status = 'failed';
          record.diagnostics.push(
            'Tool request timed out or protocol/transport failed',
          );
          return report(results, 2, ['Run stopped after tool request failure']);
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
          result.diagnostics.push(error.message);
        }
    return report(results, error instanceof Failure ? error.code : 2, [
      error instanceof Failure ? error.message : 'Run failed safely',
    ]);
  }
}
