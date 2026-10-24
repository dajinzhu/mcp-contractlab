import console from 'node:console';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import { mkdtemp, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir, cpus, availableParallelism } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

if (Number(process.versions.node.split('.')[0]) < 24)
  throw new Error(
    'Independent public fixture benchmark requires Node 24; main CLI supports Node 22/24.',
  );
const { values } = parseArgs({
  options: { output: { type: 'string', default: '/tmp/mcpcl-benchmark.json' } },
});
const execute = promisify(execFile),
  directory = await mkdtemp(join(tmpdir(), 'mcpcl-benchmark-'));
try {
  const local = resolve('dist/tests/fixtures/behavior-server.js');
  const independent = resolve(
    'tests/fixtures/independent/node_modules/@modelcontextprotocol/server-everything/dist/index.js',
  );
  const cases = [
    {
      name: 'sum control',
      tool: 'sum',
      args: { a: 2, b: 3 },
      value: 5,
      path: '/structuredContent/value',
      fault: false,
    },
    {
      name: 'array control',
      tool: 'array',
      args: {},
      value: [1, 2],
      path: '/structuredContent',
      fault: false,
    },
    {
      name: 'null control',
      tool: 'null',
      args: {},
      value: null,
      path: '/structuredContent',
      fault: false,
    },
    {
      name: 'wrong numeric value mutation',
      tool: 'wrong',
      args: {},
      value: 5,
      path: '/structuredContent/value',
      fault: true,
    },
    {
      name: 'wrong output type mutation',
      tool: 'type',
      args: {},
      value: 5,
      path: '/structuredContent/value',
      fault: true,
    },
    {
      name: 'missing structured output mutation',
      tool: 'missing',
      args: {},
      value: 5,
      path: '/structuredContent/value',
      fault: true,
    },
    {
      name: 'unexpected tool error mutation',
      tool: 'error',
      args: {},
      value: 5,
      path: '/structuredContent/value',
      fault: true,
    },
    {
      name: 'independent Everything echo control',
      tool: 'echo',
      args: { message: 'benchmark-value' },
      value: 'Echo: benchmark-value',
      path: '/content/0/text',
      fault: false,
      independent: true,
    },
  ];
  const observations = [];
  for (let repetition = 0; repetition < 2; repetition++)
    for (const c of cases) {
      const config = join(directory, 'config.json');
      await writeFile(
        config,
        JSON.stringify({
          schemaVersion: 1,
          server: {
            name: 'benchmark',
            transport: 'stdio',
            command: process.execPath,
            args: c.independent ? [independent, 'stdio'] : [local],
            timeoutMs: 5000,
          },
          safety: {
            allowToolCalls: [c.tool],
            maxToolCalls: 1,
            toolTimeoutMs: 5000,
          },
          cases: [
            {
              id: 'benchmark-case',
              tool: c.tool,
              arguments: c.args,
              expect: {
                isError: false,
                assertions: [
                  { path: c.path, operator: 'equals', value: c.value },
                ],
              },
            },
          ],
        }),
      );
      const started = performance.now();
      let report,
        code = 0;
      try {
        const result = await execute(
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
          { timeout: 15000, maxBuffer: 128 * 1024 },
        );
        report = JSON.parse(result.stdout);
      } catch (error) {
        if (typeof error.code !== 'number') throw error;
        code = error.code;
        report = JSON.parse(error.stdout);
      }
      const durationMs = Number((performance.now() - started).toFixed(2));
      assert.equal(code, c.fault ? 1 : 0, `Unexpected outcome: ${c.name}`);
      assert.equal(report.counts.unrun, 0);
      observations.push({
        case: c.name,
        repetition,
        fixture: c.independent
          ? '@modelcontextprotocol/server-everything@2.0.0'
          : 'local synthetic behavioral mutation',
        expectedFault: c.fault,
        actualExit: code,
        durationMs,
      });
    }
  const tp = observations.filter(
    (r) => r.expectedFault && r.actualExit === 1,
  ).length;
  const tn = observations.filter(
    (r) => !r.expectedFault && r.actualExit === 0,
  ).length;
  const fp = observations.filter(
    (r) => !r.expectedFault && r.actualExit === 1,
  ).length;
  const fn = observations.filter(
    (r) => r.expectedFault && r.actualExit === 0,
  ).length;
  const sourceHasher = createHash('sha256');
  for (const file of (await readdir('src', { recursive: true }))
    .filter((f) => f.endsWith('.ts'))
    .sort()) {
    sourceHasher.update(file).update(await readFile(join('src', file)));
  }
  const result = {
    benchmarkVersion: 1,
    fixtureSha256: createHash('sha256')
      .update(await readFile('tests/fixtures/behavior-server.ts'))
      .digest('hex'),
    benchmarkScriptSha256: createHash('sha256')
      .update(await readFile('scripts/benchmark.mjs'))
      .digest('hex'),
    independentLockfileSha256: createHash('sha256')
      .update(await readFile('tests/fixtures/independent/package-lock.json'))
      .digest('hex'),
    sourceSha256: sourceHasher.digest('hex'),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpuModel: cpus()[0]?.model,
    availableParallelism: availableParallelism(),
    lockfileSha256: createHash('sha256')
      .update(await readFile('package-lock.json'))
      .digest('hex'),
    protocolVersion: '2026-07-28',
    repetitions: 2,
    metrics: {
      truePositive: tp,
      trueNegative: tn,
      falsePositive: fp,
      falseNegative: fn,
      precision: tp / (tp + fp),
      recall: tp / (tp + fn),
    },
    limitations: [
      'Small deterministic dataset, not real-world accuracy or a competitor comparison.',
      'Only the echo control uses an independent public fixture; faults are explicit local synthetic behaviors.',
      'Duration includes CLI startup, schema workers, server launch and cleanup; no isolated runner-overhead claim.',
      'Repeated samples are not independent real-world incidents.',
    ],
    observations,
  };
  await writeFile(values.output, JSON.stringify(result, null, 2) + '\n');
  console.log(
    JSON.stringify({
      output: values.output,
      metrics: result.metrics,
      cases: observations.length,
    }),
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
