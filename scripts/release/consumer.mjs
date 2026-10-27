import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import process from 'node:process';
import console from 'node:console';
import { pathToFileURL } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
const execute = promisify(execFile);
const sha = (value) => createHash('sha256').update(value).digest('hex');
export async function verifyConsumer(tarball, outputDirectory) {
  const major = Number(process.versions.node.split('.')[0]);
  assert(
    [22, 24].includes(major),
    'Release consumer validation requires Node 22 or 24',
  );
  const output = resolve(outputDirectory);
  await mkdir(output, { recursive: true });
  const directory = await mkdtemp(join(tmpdir(), 'mcpcl-clean-consumer-'));
  const cache = join(directory, 'cache');
  const env = {
    PATH: dirname(process.execPath) + ':' + process.env.PATH,
    LANG: 'C',
    MCPCL_LANG: 'en',
    NO_COLOR: '1',
  };
  if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
  const installEnv = { ...env };
  // Keep the host's network/certificate policy for registry bootstrap only;
  // never record these values in reports or pass credentials to fixture servers.
  for (const key of [
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'ALL_PROXY',
    'NO_PROXY',
    'http_proxy',
    'https_proxy',
    'all_proxy',
    'no_proxy',
    'NODE_EXTRA_CA_CERTS',
    'NODE_OPTIONS',
    'NODE_USE_ENV_PROXY',
    'SSL_CERT_FILE',
    'SSL_CERT_DIR',
    'NPM_CONFIG_CAFILE',
  ])
    if (process.env[key] !== undefined) installEnv[key] = process.env[key];
  const observations = [];
  const run = async (command, args, expected = 0, timeout = 30000) => {
    let result;
    try {
      result = {
        ...(await execute(command, args, {
          cwd: directory,
          env: command === 'npm' ? installEnv : env,
          timeout,
          maxBuffer: 4 * 1024 * 1024,
        })),
        code: 0,
      };
    } catch (error) {
      if (typeof error.code !== 'number') throw error;
      result = { stdout: error.stdout, stderr: error.stderr, code: error.code };
    }
    assert.equal(
      result.code,
      expected,
      `Unexpected exit for ${args[0]} (${result.stderr?.slice(0, 200)})`,
    );
    return result;
  };
  try {
    await run(
      'npm',
      [
        'install',
        '--prefix',
        directory,
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--cache',
        cache,
        '--registry=https://registry.npmjs.org',
        resolve(tarball),
      ],
      0,
      180000,
    );
    const paths = (
      await run('npm', ['ls', '--omit=dev', '--all', '--parseable'])
    ).stdout
      .trim()
      .split('\n')
      .slice(1);
    const graph = [];
    for (const path of paths) {
      const manifest = JSON.parse(
        await readFile(join(path, 'package.json'), 'utf8'),
      );
      const hooks = ['preinstall', 'install', 'postinstall'].filter(
        (name) => manifest.scripts?.[name],
      );
      assert.equal(
        hooks.length,
        0,
        'Unreviewed install hook: default lifecycle validation refused',
      );
      graph.push({
        name: manifest.name,
        version: manifest.version,
        license: manifest.license ?? 'UNKNOWN',
        installHooks: hooks,
      });
    }
    graph.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    const consumerAudit = JSON.parse(
      (
        await run(
          'npm',
          [
            'audit',
            '--prefix',
            directory,
            '--omit=dev',
            '--json',
            '--registry=https://registry.npmjs.org',
          ],
          0,
          60000,
        )
      ).stdout,
    );
    assert.equal(
      consumerAudit.metadata?.vulnerabilities?.total,
      0,
      'Resolved consumer graph requires vulnerability review',
    );
    const lockBytes = await readFile(join(directory, 'package-lock.json'));
    await writeFile(join(output, 'consumer-package-lock.json'), lockBytes);
    // Remove the installation and prove default lifecycle installation works from
    // the captured lock and populated local cache, without registry availability.
    await rm(join(directory, 'node_modules'), { recursive: true, force: true });
    await run(
      'npm',
      [
        'ci',
        '--prefix',
        directory,
        '--offline',
        '--no-audit',
        '--no-fund',
        '--cache',
        cache,
      ],
      0,
      180000,
    );
    const installed = join(directory, 'node_modules', 'mcp-contractlab');
    const binary = join(directory, 'node_modules', '.bin', 'mcpcl');
    const cli = join(installed, 'dist/src/cli.js');
    const manifest = JSON.parse(
      await readFile(join(installed, 'package.json'), 'utf8'),
    );
    assert.equal(manifest.private, true);
    assert.equal(
      (await run(binary, ['--version'])).stdout.trim(),
      manifest.version,
    );
    for (const lang of ['en', 'zh-CN']) {
      const help = (await run(binary, ['--lang', lang, '--help'])).stdout;
      assert(help.includes('--lang'));
      if (lang === 'zh-CN') assert(/[\u4e00-\u9fff]/.test(help));
    }
    const config = join(installed, 'examples/mcpcl.config.yaml');
    const invoke = (args, code = 0) =>
      run(process.execPath, [cli, ...args], code);
    const inspect = await invoke(['inspect', '-c', config, '--allow-exec']);
    assert.deepEqual(
      JSON.parse(inspect.stdout).tools.map((tool) => tool.name),
      ['echo', 'sum'],
    );
    assert.equal(
      (
        await invoke([
          'inspect',
          '-c',
          config,
          '--allow-exec',
          '--lang',
          'zh-CN',
        ])
      ).stdout,
      inspect.stdout,
    );
    const machines = {};
    for (const [name, file, consent, code] of [
      ['passed', 'mcpcl.config.yaml', true, 0],
      ['failed', 'mcpcl.broken.yaml', true, 1],
      ['blocked', 'mcpcl.config.yaml', false, 3],
    ]) {
      const args = [
        'test',
        '-c',
        join(installed, 'examples', file),
        ...(consent ? ['--allow-exec'] : []),
      ];
      for (const format of ['json', 'junit']) {
        const english = (
          await invoke([...args, '--report', format, '--lang', 'en'], code)
        ).stdout;
        const chinese = (
          await invoke([...args, '--report', format, '--lang', 'zh-CN'], code)
        ).stdout;
        assert.equal(english, chinese);
        if (format === 'json') {
          const report = JSON.parse(english);
          assert.equal(report.reportVersion, 1);
          assert.equal(report.exitCode, code);
          assert.equal(report.counts[name], 3);
          assert.equal(report.protocolVersion, '2026-07-28');
        } else
          assert(
            new XMLParser({ ignoreAttributes: false }).parse(english)
              .testsuites,
          );
        machines[`${name}.${format}`] = sha(english);
        await writeFile(
          join(output, `${name}.${format === 'junit' ? 'xml' : 'json'}`),
          english,
        );
      }
      const human = (await invoke([...args, '--lang', 'en'], code)).stdout;
      assert(
        human.includes(
          name === 'passed'
            ? '3 passed'
            : name === 'failed'
              ? '3 failed'
              : '3 blocked',
        ),
      );
      const path = join(output, `${name}-zh.html`);
      const htmlResult = await invoke(
        [...args, '--report', 'html', '--output', path, '--lang', 'zh-CN'],
        code,
      );
      assert.equal(htmlResult.stdout, '');
      const html = await readFile(path, 'utf8');
      assert(html.includes('<html lang="zh-CN">'));
      assert(html.includes(`id="exit-code">${code}`));
      assert(html.includes('Content-Security-Policy'));
      assert(html.includes('connect-src &#39;none&#39;'));
      assert(!/<(?:script|link)\b[^>]*(?:src|href)=/.test(html));
      observations.push({
        scenario: name,
        exitCode: code,
        localeParity: true,
        htmlSaved: true,
      });
    }
    await invoke(
      ['test', '-c', join(directory, 'missing.json'), '--report', 'json'],
      2,
    );
    const snapshots = [];
    for (const lang of ['en', 'zh-CN']) {
      const path = join(directory, lang + '.snapshot.json');
      await invoke([
        'snapshot',
        '-c',
        config,
        '--allow-exec',
        '--output',
        path,
        '--lang',
        lang,
      ]);
      snapshots.push(await readFile(path, 'utf8'));
    }
    assert.equal(snapshots[0], snapshots[1]);
    const baseline = join(directory, 'en.snapshot.json');
    const cleanDiff = JSON.parse(
      (
        await invoke([
          'diff',
          '-c',
          config,
          '--allow-exec',
          '--baseline',
          baseline,
        ])
      ).stdout,
    );
    assert.deepEqual(cleanDiff.changes, []);
    assert.equal(cleanDiff.exitCode, 0);
    const breaking = JSON.parse(
      (
        await invoke(
          [
            'diff',
            '-c',
            join(installed, 'examples/mcpcl.removed-tool.yaml'),
            '--allow-exec',
            '--baseline',
            baseline,
          ],
          1,
        )
      ).stdout,
    );
    assert.deepEqual(breaking.changes, [
      {
        tool: 'sum',
        path: '',
        classification: 'BREAKING',
        reason: 'Tool removed',
      },
    ]);
    assert.equal(await readFile(baseline, 'utf8'), snapshots[0]);
    await writeFile(join(output, 'snapshot.json'), snapshots[0]);
    const result = {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      private: manifest.private,
      version: manifest.version,
      tarballSha256: sha(await readFile(tarball)),
      consumerLockSha256: sha(lockBytes),
      cleanInstall: true,
      offlineDefaultLifecycleReinstall: true,
      installHooks: 0,
      consumerAudit: consumerAudit.metadata,
      machineHashes: machines,
      snapshotSha256: sha(snapshots[0]),
      observations,
      invalidConfigExit: 2,
      unchangedDiffExit: 0,
      removedToolDiffExit: 1,
      graph,
    };
    await writeFile(
      join(output, 'consumer.json'),
      JSON.stringify(result, null, 2) + '\n',
    );
    console.log(
      `Clean consumer ${process.version}: help/version/EN/ZH, inspect, exits 0/1/2/3, JSON/JUnit parity, stable snapshots, diffs and HTML passed; offline default-lifecycle reinstall passed.`,
    );
    return result;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  assert(
    process.argv[2] && process.argv[3],
    'Usage: node consumer.mjs TARBALL OUTPUT_DIRECTORY',
  );
  await verifyConsumer(resolve(process.argv[2]), process.argv[3]);
}
