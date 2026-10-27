import { fetch, EnvHttpProxyAgent } from 'undici';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import console from 'node:console';
const execute = promisify(execFile);
const output = resolve(process.argv[2] ?? '/tmp/mcpcl-release-audit');
await mkdir(output, { recursive: true });
const registry = 'https://registry.npmjs.org';
const proxy = new EnvHttpProxyAgent();
async function registryJson(url) {
  const response = await fetch(url, {
    signal: globalThis.AbortSignal.timeout(15000),
    redirect: 'error',
    dispatcher: proxy,
  });
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > 1024 * 1024) throw new Error('Public metadata exceeds 1 MiB');
    chunks.push(chunk);
  }
  return {
    status: response.status,
    json: JSON.parse(Buffer.concat(chunks).toString('utf8')),
  };
}
async function audit(args) {
  let text;
  let exitCode = 0;
  try {
    text = (
      await execute(
        'npm',
        ['audit', '--json', '--registry=' + registry, ...args],
        { timeout: 60000, maxBuffer: 4 * 1024 * 1024 },
      )
    ).stdout;
  } catch (error) {
    text = error.stdout;
    exitCode = typeof error.code === 'number' ? error.code : 2;
  }
  try {
    const data = JSON.parse(text);
    return {
      exitCode,
      metadata: data.metadata ?? null,
      vulnerabilities: data.vulnerabilities ?? {},
      errorCode: data.error?.code ?? null,
    };
  } catch {
    return {
      exitCode,
      metadata: null,
      vulnerabilities: {},
      errorCode: 'AUDIT_UNAVAILABLE',
    };
  }
}
const name = await registryJson(registry + '/mcp-contractlab');
const runtime = await audit(['--omit=dev']);
const all = await audit([]);
const fixture = await audit(['--prefix', 'tests/fixtures/independent']);
let naming = { verified: false };
try {
  const result = await registryJson('https://pypi.org/pypi/mcplint-cli/json');
  naming = {
    verified: result.status === 200,
    source: 'https://pypi.org/pypi/mcplint-cli/json',
    version: result.json.info?.version,
    mentionsContractLab: /ContractLab/i.test(
      result.json.info?.description ?? '',
    ),
  };
} catch {
  /* Explicitly unverified, never infer name clearance. */
}
const inventory = JSON.parse(
  await readFile('docs/releases/runtime-inventory.json', 'utf8'),
);
const report = {
  observedAt: new Date().toISOString(),
  node: process.version,
  registry,
  name: {
    package: 'mcp-contractlab',
    httpStatus: name.status,
    publicPackageFound: name.status === 200,
    publicMaintainers: name.status === 200 ? (name.json.maintainers ?? []) : [],
    ownershipVerified: false,
    reserved: false,
    policy:
      '404 means no public record observed; it is not a reservation, ownership check or guarantee npm will accept the name.',
  },
  namingConfusion: naming,
  runtimeAudit: runtime,
  fullAudit: all,
  isolatedFixtureAudit: fixture,
  runtimePackages: inventory.packages.length,
  runtimeInstallHooks: inventory.packages
    .filter((entry) => entry.installHooks.length)
    .map((entry) => entry.name),
  decision: 'NO-GO',
  unresolvedGates: [
    'Explicit maintainer approval and publisher/namespace ownership confirmation',
    'Review naming confusion and MCP SDK transition license obligations',
    'Independent human clean-install reproduction and feedback',
    'Owner-controlled live public-host HTTPS/TLS interoperability not performed',
    'Trusted-publisher/environment/provenance controls are proposed only; not configured',
  ],
};
await writeFile(
  join(output, 'readiness-audit.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  `Release assessment NO-GO. Registry HTTP ${name.status}; runtime findings ${runtime.metadata?.vulnerabilities?.total ?? 'unknown'}, all-dependency findings ${all.metadata?.vulnerabilities?.total ?? 'unknown'}. Ownership/TLS/approval remain unverified. Evidence: ${output}`,
);

await proxy.close();
