#!/usr/bin/env node
import { Command, CommanderError } from 'commander';
import { loadConfig } from './config/load.js';
import { Failure } from './types.js';
import { withSession } from './transports/stdio.js';
import { discover, runSuite } from './runner/run-suite.js';
import { output } from './reports/output.js';
import { redact } from './reports/redact.js';
import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import {
  createSnapshot,
  readSnapshot,
  writeSnapshot,
} from './contracts/snapshot.js';
import { compareSnapshots } from './contracts/diff.js';
import { version } from './version.js';

const controller = new AbortController();
const stop = () => controller.abort();
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
const program = new Command()
  .name('mcpcl')
  .description('Explicit MCP tool behavior contracts')
  .version(version)
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
    .option('--report <format>', 'console, json or junit', 'console')
    .option('--output <path>', 'Write report to a file')
    .action(
      async (options: {
        config: string;
        allowExec: boolean;
        report: string;
        output?: string;
      }) => {
        if (
          !['console', 'json', 'junit'].includes(options.report) ||
          (name === 'inspect' && options.report === 'junit')
        )
          throw new Failure(
            2,
            'Test reports support console/json/junit; inspect supports console/json',
          );
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
async function distinctFiles(a: string, b: string): Promise<void> {
  if (resolve(a) === resolve(b))
    throw new Failure(2, 'Output must not overwrite config or baseline');
  const [left, right] = await Promise.all([
    stat(a).catch(() => undefined),
    stat(b).catch(() => undefined),
  ]);
  if (left && right && left.dev === right.dev && left.ino === right.ino)
    throw new Failure(2, 'Output aliases config or baseline');
}
for (const name of ['snapshot', 'diff'] as const) {
  const command = program
    .command(name)
    .requiredOption('-c, --config <path>', 'YAML configuration')
    .option('--allow-exec', 'Authorize configured stdio process launch', false);
  if (name === 'snapshot')
    command
      .requiredOption('--output <path>', 'Explicit baseline destination')
      .option('--force', 'Explicitly replace an existing baseline', false);
  else
    command
      .requiredOption('--baseline <path>', 'Read-only baseline')
      .option(
        '--strict',
        'Fail compatibility gate on UNKNOWN as well as BREAKING',
        false,
      )
      .option('--output <path>', 'Write JSON diff report');
  command.action(
    async (options: {
      config: string;
      allowExec: boolean;
      output?: string;
      baseline?: string;
      force?: boolean;
      strict?: boolean;
    }) => {
      if (!options.allowExec)
        throw new Failure(3, 'Process launch requires --allow-exec');
      if (options.output) await distinctFiles(options.config, options.output);
      const baseline =
        name === 'diff' ? await readSnapshot(options.baseline!) : undefined;
      if (options.output && options.baseline)
        await distinctFiles(options.baseline, options.output);
      const config = await loadConfig(options.config);
      const tools = await withSession(
        config,
        controller.signal,
        (client, signal) => discover(client, config, signal),
      );
      const snapshot = createSnapshot(tools);
      if (name === 'snapshot') {
        await writeSnapshot(options.output!, snapshot, options.force ?? false);
        console.log('Snapshot written explicitly; no tools called.');
      } else {
        const changes = compareSnapshots(baseline!, snapshot);
        const code = changes.some(
          (c) =>
            c.classification === 'BREAKING' ||
            (options.strict && c.classification === 'UNKNOWN'),
        )
          ? 1
          : 0;
        await output(
          {
            diffVersion: 1,
            protocolVersion: '2026-07-28',
            exitCode: code,
            changes,
          },
          'json',
          options.output,
        );
        process.exitCode = code;
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
