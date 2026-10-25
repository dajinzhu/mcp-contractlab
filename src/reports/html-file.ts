import { lstat, realpath, open, link, unlink } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Failure } from '../types.js';
import { message } from '../i18n/message.js';

/** Resolve parent aliases and fail before launching tools if output is not new. */
export async function prepareHtmlOutput(destination: string): Promise<string> {
  try {
    const path = resolve(destination);
    const parent = await realpath(dirname(path));
    const target = join(parent, basename(path));
    try {
      await lstat(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return target;
      throw error;
    }
  } catch {
    throw new Failure(2, message('html.newFile'));
  }
  throw new Failure(2, message('html.newFile'));
}

/** Atomic, exclusive publication: never follow or replace a destination link. */
export async function writeHtml(
  destination: string,
  text: string,
): Promise<void> {
  const target = await prepareHtmlOutput(destination);
  const temporary = join(dirname(target), `.mcpcl-${randomUUID()}.tmp`);
  let created = false;
  try {
    const file = await open(temporary, 'wx', 0o600);
    created = true;
    try {
      await file.writeFile(text, 'utf8');
    } finally {
      await file.close();
    }
    await link(temporary, target);
  } catch {
    throw new Failure(2, message('output.failed'));
  } finally {
    if (created) await unlink(temporary).catch(() => {});
  }
}
