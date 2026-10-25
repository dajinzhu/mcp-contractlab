import { en, type Catalog } from './en.js';

export type MessageId = keyof Catalog;
export type Message = {
  [K in MessageId]: { id: K; args: Parameters<Catalog[K]> };
}[MessageId];
export type Text = string | Message | { prefix: string; detail: Text };
const objects = new WeakMap<object, Text>();
const arrays = new WeakMap<readonly string[], Map<number, Text>>();

export function message<K extends MessageId>(
  id: K,
  ...args: Parameters<Catalog[K]>
): Message {
  return { id, args } as Message;
}
export function formatMessage(catalog: Catalog, value: Message): string {
  const format = catalog[value.id] as unknown as (...args: unknown[]) => string;
  return format(...value.args);
}
export function english(value: Text): string {
  return typeof value === 'string'
    ? value
    : 'prefix' in value
      ? value.prefix + english(value.detail)
      : formatMessage(en, value);
}
export function rememberText(object: object, value: Text): void {
  objects.set(object, value);
}
export function textFor(object: object, fallback: string): Text {
  return objects.get(object) ?? fallback;
}
export function appendText(array: string[], value: Text): void {
  let metadata = arrays.get(array);
  if (!metadata) {
    metadata = new Map();
    arrays.set(array, metadata);
  }
  metadata.set(array.length, value);
  array.push(english(value));
}
export function texts(...values: Text[]): string[] {
  const result: string[] = [];
  for (const value of values) appendText(result, value);
  return result;
}
export function arrayTexts(array: readonly string[]): Text[] {
  const metadata = arrays.get(array);
  return array.map((value, index) => metadata?.get(index) ?? value);
}
