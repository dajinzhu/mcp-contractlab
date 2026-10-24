#!/usr/bin/env node
import { Command, CommanderError } from 'commander';
import { loadConfig } from './config/load.js';
import { Failure } from './types.js';
import { withSession } from './transports/stdio.js';
import { discover, runSuite } from './runner/run-suite.js';
import { output } from './reports/output.js';
import { redact } from './reports/redact.js';

const controller = new AbortController();
const stop = () => controller.abort();
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
const program = new Command()
  .name('mcpcl')
  .description('Explicit MCP tool behavior contracts')
  .version('0.1.0')
  .exitOverride();
program.configureOutput({ writeErr: () => {} });
for (const name of ['inspect', 'test'] as const) {
  program
    .command(name)
    .requiredOption('-c, --config <path>', 'YAML configuration')
    .option(
      '--allow-exec',
      'Authorize launching the configured stdio process',
      false,
    )
    .option('--report <format>', 'console or json', 'console')
    .option('--output <path>', 'Write report to a file')
    .action(
      async (options: {
        config: string;
        allowExec: boolean;
        report: string;
        output?: string;
      }) => {
        if (!['console', 'json'].includes(options.report))
          throw new Failure(2, 'Report format must be console or json');
        const config = await loadConfig(options.config);
        if (name === 'test') {
          const report = await runSuite(
            config,
            options.allowExec,
            controller.signal,
          );
          await output(report, options.report, options.output);
          process.exitCode = report.exitCode;
        } else {
          if (!options.allowExec)
            throw new Failure(3, 'Process launch requires --allow-exec');
          const tools = await withSession(
            config,
            controller.signal,
            (client, signal) => discover(client, config, signal),
          );
          await output(
            { protocolVersion: '2026-07-28', tools },
            'json',
            options.output,
          );
        }
      },
    );
}
try {
  await program.parseAsync();
} catch (error) {
  if (error instanceof CommanderError && error.exitCode === 0)
    process.exitCode = 0;
  else {
    process.exitCode = error instanceof Failure ? error.code : 2;
    console.error(
      redact(
        error instanceof Failure
          ? error.message
          : 'Invalid invocation or operation failed safely',
      ),
    );
  }
} finally {
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
}
