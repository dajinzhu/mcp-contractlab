import { execFile } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import { mkdtemp, mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import process from 'node:process';
import console from 'node:console';
const execute = promisify(execFile);
const { values } = parseArgs({
  options: { output: { type: 'string', default: 'docs/examples/html' } },
});
const directory = await mkdtemp(join(tmpdir(), 'mcpcl-html-examples-'));
const destination = resolve(values.output);
try {
  await mkdir(destination, { recursive: true });
  const incomplete = join(directory, 'incomplete.json');
  await writeFile(
    incomplete,
    JSON.stringify({
      schemaVersion: 1,
      server: {
        name: 'local-crash-example',
        transport: 'stdio',
        command: process.execPath,
        args: [resolve('dist/tests/fixtures/behavior-server.js')],
      },
      safety: { allowToolCalls: ['crash', 'sum'], maxToolCalls: 2 },
      cases: [
        {
          id: 'fixture-crash',
          tool: 'crash',
          arguments: {},
          expect: { isError: false, assertions: [] },
        },
        {
          id: 'never-reached',
          tool: 'sum',
          arguments: { a: 2, b: 3 },
          expect: { isError: false, assertions: [] },
        },
      ],
    }),
  );
  for (const [name, config, allow, code, lang] of [
    ['passed', resolve('examples/mcpcl.config.yaml'), true, 0, 'en'],
    ['failed', resolve('examples/mcpcl.broken.yaml'), true, 1, 'en'],
    ['blocked', resolve('examples/mcpcl.config.yaml'), false, 3, 'zh-CN'],
    ['incomplete', incomplete, true, 2, 'en'],
  ]) {
    const output = join(directory, name + '.html');
    let status = 0;
    try {
      await execute(
        process.execPath,
        [
          'dist/src/cli.js',
          'test',
          '-c',
          config,
          '--report',
          'html',
          '--output',
          output,
          '--lang',
          lang,
          ...(allow ? ['--allow-exec'] : []),
        ],
        { timeout: 15000 },
      );
    } catch (error) {
      status = error.code;
    }
    assert.equal(status, code, `${name}: unexpected CLI exit`);
    await copyFile(output, join(destination, name + '.html'));
    console.log(
      `${name}.html: actual local fixture, exit ${status}, initial locale ${lang}`,
    );
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
