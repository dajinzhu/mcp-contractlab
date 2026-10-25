#!/usr/bin/env node
import { Command, CommanderError } from 'commander';
import { loadConfig } from './config/load.js';
import { Failure, type Config } from './types.js';
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
import { message, textFor } from './i18n/message.js';
import { resolveLocale, systemLocale } from './i18n/locale.js';
import { translate, t, plain } from './i18n/presentation.js';
import { localizedHelp } from './i18n/help.js';

const locale = resolveLocale(
  process.argv.slice(2),
  process.env,
  systemLocale(),
);
const controller = new AbortController();
const stop = () => controller.abort();
const authorized = (
  config: Config,
  options: { allowExec?: boolean; allowHttp?: boolean },
) =>
  config.server.transport === 'stdio'
    ? Boolean(options.allowExec)
    : Boolean(options.allowHttp);
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
const program = new Command()
  .name('mcpcl')
  .description(t(locale, 'cli.description'))
  .version(version, '-V, --version', t(locale, 'help.version'))
  .option('--lang <locale>', t(locale, 'help.language'))
  .helpCommand('help [command]', t(locale, 'help.command'))
  .exitOverride();
for (const name of ['inspect', 'test'] as const) {
  program
    .command(name)
    .description(t(locale, name === 'inspect' ? 'help.inspect' : 'help.test'))
    .requiredOption('-c, --config <path>', t(locale, 'help.config'))
    .option('--allow-exec', t(locale, 'help.exec'), false)
    .option('--allow-http', t(locale, 'help.http'), false)
    .option(
      '--report <format>',
      t(locale, name === 'inspect' ? 'help.inspectFormats' : 'help.formats'),
      name === 'inspect' ? 'json' : 'console',
    )
    .option('--output <path>', t(locale, 'help.output'))
    .action(
      async (options: {
        config: string;
        allowExec: boolean;
        allowHttp: boolean;
        report: string;
        output?: string;
      }) => {
        if (
          !['console', 'json', 'junit'].includes(options.report) ||
          (name === 'inspect' && options.report === 'junit')
        )
          throw new Failure(2, message('cli.format'));
        const config = await loadConfig(options.config);
        if (name === 'test') {
          const report = await runSuite(
            config,
            authorized(config, options),
            controller.signal,
          );
          await output(report, options.report, options.output, locale);
          process.exitCode = report.exitCode;
        } else {
          if (!authorized(config, options))
            throw new Failure(3, message('cli.consent'));
          const tools = await withSession(
            config,
            controller.signal,
            (client, signal) => discover(client, config, signal),
          );
          await output(
            { protocolVersion: '2026-07-28', tools },
            options.report,
            options.output,
            locale,
          );
        }
      },
    );
}
async function distinctFiles(a: string, b: string): Promise<void> {
  if (resolve(a) === resolve(b))
    throw new Failure(2, message('output.configCollision'));
  const [left, right] = await Promise.all([
    stat(a).catch(() => undefined),
    stat(b).catch(() => undefined),
  ]);
  if (left && right && left.dev === right.dev && left.ino === right.ino)
    throw new Failure(2, message('output.aliasCollision'));
}
for (const name of ['snapshot', 'diff'] as const) {
  const command = program
    .command(name)
    .description(t(locale, name === 'snapshot' ? 'help.snapshot' : 'help.diff'))
    .requiredOption('-c, --config <path>', t(locale, 'help.config'))
    .option('--allow-exec', t(locale, 'help.exec'), false)
    .option('--allow-http', t(locale, 'help.http'), false);
  if (name === 'snapshot')
    command
      .requiredOption('--output <path>', t(locale, 'help.snapshotOutput'))
      .option('--force', t(locale, 'help.force'), false);
  else
    command
      .requiredOption('--baseline <path>', t(locale, 'help.baseline'))
      .option('--strict', t(locale, 'help.strict'), false)
      .option('--output <path>', t(locale, 'help.diffOutput'))
      .option('--report <format>', t(locale, 'help.diffFormats'), 'json');
  command.action(
    async (options: {
      config: string;
      allowExec: boolean;
      allowHttp: boolean;
      output?: string;
      baseline?: string;
      force?: boolean;
      strict?: boolean;
      report?: string;
    }) => {
      if (name === 'diff' && !['console', 'json'].includes(options.report!))
        throw new Failure(2, message('cli.format'));
      const config = await loadConfig(options.config);
      if (!authorized(config, options))
        throw new Failure(3, message('cli.consent'));
      if (options.output) await distinctFiles(options.config, options.output);
      const baseline =
        name === 'diff' ? await readSnapshot(options.baseline!) : undefined;
      if (options.output && options.baseline)
        await distinctFiles(options.baseline, options.output);
      const tools = await withSession(
        config,
        controller.signal,
        (client, signal) => discover(client, config, signal),
      );
      const snapshot = createSnapshot(tools);
      if (name === 'snapshot') {
        await writeSnapshot(options.output!, snapshot, options.force ?? false);
        process.stdout.write(plain(t(locale, 'snapshot.success')) + '\n');
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
          options.report!,
          options.output,
          locale,
        );
        process.exitCode = code;
      }
    },
  );
}
for (const command of [program, ...program.commands])
  localizedHelp(command, locale);
try {
  await program.parseAsync();
} catch (error) {
  if (error instanceof CommanderError && error.exitCode === 0)
    process.exitCode = 0;
  else {
    process.exitCode = error instanceof Failure ? error.code : 2;
    process.stderr.write(
      plain(
        String(
          redact(
            translate(
              error instanceof Failure
                ? textFor(error, error.message)
                : message('cli.invalid'),
              locale,
            ),
          ),
        ),
      ) + '\n',
    );
  }
} finally {
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
}
