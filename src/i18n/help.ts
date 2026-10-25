import { Help, type Command } from 'commander';
import type { Locale } from './locale.js';
import { plain, t } from './presentation.js';

export function localizedHelp(command: Command, locale: Locale): void {
  const base = new Help();
  const terms = (value: string) =>
    value
      .replaceAll('[options]', t(locale, 'help.optionsTerm'))
      .replaceAll('[command]', t(locale, 'help.commandTerm'));
  command
    .helpOption('-h, --help', t(locale, 'help.option'))
    .configureHelp({
      showGlobalOptions: true,
      styleTitle: (title) =>
        ({
          'Usage:': t(locale, 'help.usage'),
          'Options:': t(locale, 'help.options'),
          'Commands:': t(locale, 'help.commands'),
          'Arguments:': t(locale, 'help.arguments'),
          'Global Options:': t(locale, 'help.global'),
        })[title] ?? title,
      styleUsage: terms,
      styleSubcommandTerm: terms,
      optionDescription: (option) => {
        const extra: string[] = [];
        if (option.argChoices)
          extra.push(
            `${t(locale, 'help.choices')}: ${option.argChoices.map((c) => JSON.stringify(c)).join(', ')}`,
          );
        if (
          option.defaultValue !== undefined &&
          (option.required ||
            option.optional ||
            (option.isBoolean() && typeof option.defaultValue === 'boolean'))
        )
          extra.push(
            `${t(locale, 'help.default')}: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`,
          );
        return extra.length
          ? `${option.description} (${extra.join(', ')})`
          : base.optionDescription(option);
      },
    })
    .configureOutput({
      writeOut: (value) => {
        process.stdout.write(plain(value));
      },
      writeErr: () => {},
    });
  command.addHelpText('after', '\n' + t(locale, 'help.localeGuide'));
}
