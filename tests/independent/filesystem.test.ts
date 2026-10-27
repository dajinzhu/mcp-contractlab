import { execFile, type ExecFileException } from 'node:child_process';
import { promisify } from 'node:util';
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, it } from 'vitest';
import type { Report } from '../../src/types.js';

const run = promisify(execFile);
it.each([
  { mode: 'pass', code: 0 },
  { mode: 'wrong-expectation', code: 1 },
  { mode: 'blocked', code: 3 },
])(
  'independent filesystem 2.0.1: read-only document workflow $mode',
  async ({ mode, code }) => {
    const directory = await mkdtemp(join(tmpdir(), 'mcpcl-real-filesystem-'));
    const allowed = join(directory, 'allowed');
    const content = 'Invoice total: 42\n状态：已核对\n';
    try {
      await mkdir(allowed);
      const document = join(allowed, 'invoice.txt');
      await writeFile(document, content);
      const config = join(directory, 'config.json');
      await writeFile(
        config,
        JSON.stringify({
          schemaVersion: 1,
          server: {
            name: 'independent-filesystem-2.0.1',
            transport: 'stdio',
            command: process.execPath,
            args: [
              resolve(
                'tests/fixtures/independent/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js',
              ),
              allowed,
            ],
            timeoutMs: 8000,
          },
          safety: {
            allowToolCalls:
              mode === 'blocked' ? [] : ['read_text_file', 'list_directory'],
            maxToolCalls: 2,
            toolTimeoutMs: 5000,
          },
          cases: [
            {
              id: 'read-local-invoice',
              tool: 'read_text_file',
              arguments: { path: document },
              expect: {
                isError: false,
                assertions: [
                  {
                    path: '/structuredContent/content',
                    operator: 'equals',
                    value:
                      mode === 'wrong-expectation'
                        ? 'deliberately wrong'
                        : content,
                  },
                ],
              },
            },
            {
              id: 'list-only-fixture-root',
              tool: 'list_directory',
              arguments: { path: allowed },
              expect: {
                isError: false,
                assertions: [
                  {
                    path: '/structuredContent/content',
                    operator: 'equals',
                    value: '[FILE] invoice.txt',
                  },
                ],
              },
            },
          ],
        }),
      );
      let stdout = '';
      let actual = 0;
      try {
        stdout = (
          await run(
            process.execPath,
            [
              resolve('dist/src/cli.js'),
              'test',
              '-c',
              config,
              '--allow-exec',
              '--report',
              'json',
            ],
            { timeout: 18000, maxBuffer: 256 * 1024 },
          )
        ).stdout;
      } catch (error) {
        const result = error as ExecFileException & { stdout: string };
        if (typeof result.code !== 'number') throw error;
        actual = result.code;
        stdout = result.stdout;
      }
      expect(actual).toBe(code);
      const report = JSON.parse(stdout) as Report;
      expect(report.exitCode).toBe(code);
      expect(await readFile(document, 'utf8')).toBe(content);
      expect(await readdir(allowed)).toEqual(['invoice.txt']);
      if (mode === 'blocked') {
        expect(report.counts.blocked).toBe(2);
        expect(report.coverage?.discoveryComplete).toBe(false);
        expect(report.coverage?.attemptedTools).toEqual([]);
      } else {
        expect(report.coverage?.attemptedTools).toEqual([
          'list_directory',
          'read_text_file',
        ]);
        expect(report.coverage?.completedTools).toEqual([
          'list_directory',
          'read_text_file',
        ]);
        expect(report.coverage?.untestedTools).toContain('write_file');
        expect(report.counts.failed).toBe(mode === 'pass' ? 0 : 1);
        expect(report.counts.passed).toBe(mode === 'pass' ? 2 : 1);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
