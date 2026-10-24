import assert, { AssertionError } from 'node:assert/strict';
import { parseArgs } from 'node:util';
import {
  createFixtureClient,
  protocolVersion,
  requestOptions,
} from './fixture-client.js';

async function main(): Promise<number> {
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        'allow-exec': { type: 'boolean', default: false },
        'expect-sum': { type: 'string', default: '5' },
        help: { type: 'boolean', default: false },
      },
      allowPositionals: false,
    }));
  } catch {
    console.error('Invalid demo arguments. Run npm run demo -- --help.');
    return 2;
  }
  if (values.help) {
    console.log(
      'Phase 0 local SDK smoke demo\n' +
        'Usage: npm run demo -- --allow-exec [--expect-sum NUMBER]\n' +
        'Launches only our local fixture; explicitly calls sum(2, 3) once.\n' +
        'No arbitrary servers, config files, or tool selection are supported.',
    );
    return 0;
  }
  const expected = Number(values['expect-sum']);
  if (!values['expect-sum'].trim() || !Number.isFinite(expected)) {
    console.error('--expect-sum must be a finite number.');
    return 2;
  }
  if (!values['allow-exec']) {
    console.error('BLOCKED: pass --allow-exec to launch the local fixture.');
    return 3;
  }

  const { client, transport } = createFixtureClient();
  let interrupted = false;
  const stop = () => {
    interrupted = true;
    void client.close().catch(() => {});
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const deadline = setTimeout(stop, 10_000);
  try {
    await client.connect(transport);
    assert.equal(client.getNegotiatedProtocolVersion(), protocolVersion);
    const { tools } = await client.listTools({}, requestOptions);
    assert.deepEqual(
      tools.map((tool) => tool.name).sort(),
      ['echo', 'sum'],
      'Expected exactly the two local fixture tools',
    );
    console.log(`PASS discovery: echo, sum (MCP ${protocolVersion})`);

    // Fixed authorization: this demo calls ONLY sum with these known arguments.
    const result = await client.callTool(
      { name: 'sum', arguments: { a: 2, b: 3 } },
      requestOptions,
    );
    assert.equal(result.isError, false, 'sum returned an error');
    const actual = result.structuredContent;
    const actualValue =
      actual !== null &&
      typeof actual === 'object' &&
      'value' in actual &&
      typeof actual.value === 'number'
        ? actual.value
        : '(missing or nonnumeric)';
    assert.deepEqual(
      actual,
      { value: expected },
      `sum /structuredContent/value: expected ${expected}, actual ${actualValue}`,
    );
    console.log('PASS sum(2, 3): /structuredContent/value = 5');
    return interrupted ? 2 : 0;
  } catch (error) {
    // Do not echo raw server responses, stderr, errors, or environments.
    console.error(
      error instanceof AssertionError
        ? `FAIL: ${error.message.split('\n')[0]}`
        : 'FAIL: local SDK transport/protocol check did not complete.',
    );
    return error instanceof AssertionError ? 1 : 2;
  } finally {
    clearTimeout(deadline);
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    await client.close();
    await transport.close();
  }
}

process.exitCode = await main().catch(() => {
  console.error('FAIL: local fixture cleanup did not complete.');
  return 2;
});
