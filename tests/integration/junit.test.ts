import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

it.each([
  ['examples/mcpcl.config.yaml', true, 0, 0, 0],
  ['examples/mcpcl.broken.yaml', true, 1, 3, 0],
  ['examples/mcpcl.config.yaml', false, 3, 0, 3],
])(
  'emits valid JUnit without changing contract exit status %#',
  async (config, consent, expectedCode, failures, skipped) => {
    let stdout: string,
      code = 0;
    try {
      const result = await promisify(execFile)(
        process.execPath,
        [
          resolve('dist/src/cli.js'),
          'test',
          '-c',
          String(config),
          '--report',
          'junit',
          ...(consent ? ['--allow-exec'] : []),
        ],
        { timeout: 15000, maxBuffer: 128 * 1024 },
      );
      stdout = result.stdout;
    } catch (error) {
      const e = error as Error & { code: number; stdout: string };
      if (typeof e.code !== 'number') throw error;
      code = e.code;
      stdout = e.stdout;
    }
    expect(code).toBe(expectedCode);
    expect(XMLValidator.validate(stdout)).toBe(true);
    const suite = new XMLParser({ ignoreAttributes: false }).parse(stdout)
      .testsuites.testsuite;
    expect(Number(suite['@_failures'])).toBe(failures);
    expect(Number(suite['@_skipped'])).toBe(skipped);
    if (!consent) expect(Number(suite['@_errors'])).toBe(1);
  },
);
