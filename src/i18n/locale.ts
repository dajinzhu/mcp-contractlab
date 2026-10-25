export type Locale = 'en' | 'zh-CN';
export function normalizeLocale(value: string): Locale {
  const tag = value.trim().split(/[.@]/)[0]!.replaceAll('_', '-').toLowerCase();
  return ['zh', 'zh-cn', 'zh-hans', 'zh-hans-cn'].includes(tag)
    ? 'zh-CN'
    : 'en';
}
/** Pure, deterministic selection. Unknown highest-priority input falls back to en. */
export function resolveLocale(
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  systemLocale = 'en',
): Locale {
  let explicit: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--') break;
    if (arg.startsWith('--lang=')) explicit = arg.slice('--lang='.length);
    else if (
      arg === '--lang' &&
      argv[i + 1] !== undefined &&
      !argv[i + 1]!.startsWith('-')
    )
      explicit = argv[++i]!;
  }
  const nonempty = (value: string | undefined) =>
    value?.trim() ? value : undefined;
  return normalizeLocale(
    explicit ??
      nonempty(env.MCPCL_LANG) ??
      nonempty(env.LC_ALL) ??
      nonempty(env.LC_MESSAGES) ??
      nonempty(env.LANG) ??
      systemLocale,
  );
}
export function systemLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return 'en';
  }
}
