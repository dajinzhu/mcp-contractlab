import { randomUUID } from 'node:crypto';
import { link, open, realpath, unlink } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import type { Locale } from '../i18n/locale.js';
import { message } from '../i18n/message.js';
import { Failure } from '../types.js';

export function initTemplate(locale: Locale): string {
  const comments =
    locale === 'zh-CN'
      ? [
          '# MCP ContractLab 配置模板（版本 1）。请先审查并编辑。',
          '# 替换下面的占位符，指向您自己的测试服务器。',
          '# 启动进程需要单独提供 --allow-exec；此文件不授权执行。',
          '# 工具调用需要明确的用例和白名单；默认均为空。',
          '# 添加无害用例前，请先审查工具的权限和副作用。',
        ]
      : [
          '# MCP ContractLab configuration template (version 1). Review and edit first.',
          '# Replace the placeholders below with your own test server.',
          '# Starting a process separately requires --allow-exec; this file grants no consent.',
          '# Tool calls require explicit cases and an allowlist; both start empty.',
          '# Review tool permissions and side effects before adding a harmless case.',
        ];
  const argsComment =
    locale === 'zh-CN' ? '编辑：服务器参数' : 'EDIT: server arguments';
  return `${comments[0]}\nschemaVersion: 1\nserver:\n  ${comments[1]}\n  name: "EDIT_SERVER_NAME"\n  transport: stdio\n  command: "EDIT_SERVER_COMMAND"\n  args: [] # ${argsComment}\n  cwd: "."\n  timeoutMs: 10000\n  ${comments[2]}\nsafety:\n  ${comments[3]}\n  allowToolCalls: []\n  maxToolCalls: 0\n  toolTimeoutMs: 5000\n  ${comments[4]}\ncases: []\n`;
}

/** Publish complete bytes exclusively; never replace any existing directory entry. */
export async function writeInit(
  destination: string,
  locale: Locale,
): Promise<void> {
  let temporary: string | undefined;
  let created = false;
  try {
    if (
      !destination ||
      Array.from(destination).some(
        (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
      ) ||
      /[\\/]{2}/.test(destination) ||
      destination.split(/[\\/]/).some((part) => part === '..' || part === '.')
    )
      throw new Error();
    const target = resolve(destination);
    if (!basename(target) || destination.endsWith(sep)) throw new Error();
    const parent = dirname(target);
    if ((await realpath(parent)) !== parent) throw new Error();
    temporary = join(parent, `.mcpcl-init-${randomUUID()}.tmp`);
    const file = await open(temporary, 'wx', 0o600);
    created = true;
    try {
      await file.writeFile(initTemplate(locale), 'utf8');
    } finally {
      await file.close();
    }
    await link(temporary, target);
  } catch {
    throw new Failure(2, message('init.writeFailed'));
  } finally {
    if (temporary && created) await unlink(temporary).catch(() => {});
  }
}
