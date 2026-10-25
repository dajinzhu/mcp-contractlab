import { stripVTControlCharacters } from 'node:util';
import { en } from './en.js';
import { zhCN } from './zh-CN.js';
import {
  formatMessage,
  message,
  type MessageId,
  type Text,
} from './message.js';
import type { Catalog } from './en.js';
import type { Locale } from './locale.js';

export function translate(value: Text, locale: Locale): string {
  return typeof value === 'string'
    ? value
    : 'prefix' in value
      ? value.prefix + translate(value.detail, locale)
      : formatMessage(locale === 'zh-CN' ? zhCN : en, value);
}
export function t<K extends MessageId>(
  locale: Locale,
  id: K,
  ...args: Parameters<Catalog[K]>
): string {
  return translate(message(id, ...args), locale);
}
/** Plain human output in every terminal; NO_COLOR never gets overridden. */
export function plain(value: string): string {
  return stripVTControlCharacters(value)
    .split('\u001b')
    .join('')
    .split('\u009b')
    .join('');
}
export const reportLimit = 4 * 1024 * 1024;
/** Presentation expansion must never turn a contract result into exit 2. */
export function boundedHuman(value: string, locale: Locale): string {
  const clean = plain(value);
  if (Buffer.byteLength(clean) <= reportLimit) return clean;
  const lines = clean.split('\n');
  const summary = lines.pop() ?? '';
  const tail = `\n${t(locale, 'view.truncated')}\n${summary}`;
  const buffer = Buffer.from(clean.slice(0, clean.length - summary.length));
  let end = reportLimit - Buffer.byteLength(tail);
  while (end > 0 && (buffer[end]! & 0xc0) === 0x80) end--;
  return buffer.subarray(0, end).toString('utf8') + tail;
}
