import { existsSync, readFileSync } from 'node:fs';
// Source modules live in src/, installed emitted modules in dist/src/.
const manifest = ['../package.json', '../../package.json']
  .map((path) => new URL(path, import.meta.url))
  .find((path) => existsSync(path));
if (!manifest) throw new Error('Package manifest is missing');
export const version = (
  JSON.parse(readFileSync(manifest, 'utf8')) as { version: string }
).version;
