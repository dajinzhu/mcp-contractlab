export type Status = 'passed' | 'failed' | 'blocked' | 'unrun';
export type Classification = 'BREAKING' | 'NON_BREAKING' | 'REVIEW' | 'UNKNOWN';
export const en = {
  'env.missing': () => 'An explicitly allowed environment variable is missing',
  'server.cleanupUnknown': () => 'Cannot confirm server cleanup',
  'server.cleanupFailed': () => 'Server did not exit after cleanup',
  'server.interrupted': () =>
    'Server interrupted or output/time budget exceeded',
  'server.failed': () =>
    'Server launch, timeout, protocol or transport failure',
  'http.noAddresses': () => 'HTTP host has no addresses',
  'http.invalidAddress': () => 'Invalid HTTP address',
  'http.privateAddress': () =>
    'HTTP private, local, reserved or metadata address blocked',
  'http.invalidEndpoint': () => 'Invalid HTTP endpoint',
  'http.endpointPolicy': () =>
    'HTTP requires an explicit allowed HTTPS endpoint without credentials, query or fragment',
  'http.dnsTimeout': () => 'HTTP DNS lookup interrupted or timed out',
  'http.credentials': () =>
    'Explicit HTTP credential variable is missing or invalid',
  'http.outsideEndpoint': () =>
    'HTTP request outside the explicitly authorized endpoint blocked',
  'http.requestLarge': () => 'HTTP request exceeds 1 MiB',
  'http.redirect': () => 'HTTP redirect blocked',
  'http.responseLarge': () => 'HTTP response budget exceeded',
  'http.streamFailed': () => 'HTTP response stream failed',
  'http.requestFailed': () => 'HTTP request failed',
  'http.sessionTimeout': () => 'HTTP session interrupted or timed out',
  'http.failed': () => 'HTTP protocol, timeout or transport failure',
  'snapshot.depth': () => 'Contract exceeds canonicalization depth limit',
  'snapshot.invalid': () => 'Invalid, unsupported or oversized snapshot',
  'snapshot.readFailed': () => 'Cannot read baseline',
  'snapshot.writeFailed': () =>
    'Cannot write snapshot; destination must exist only with --force and its parent directory must already exist',
  'cli.format': () =>
    'Test reports support console/json/junit; inspect supports console/json',
  'cli.consent': () =>
    'Transport consent requires --allow-exec for stdio or --allow-http for HTTPS',
  'output.configCollision': () =>
    'Output must not overwrite config or baseline',
  'output.aliasCollision': () => 'Output aliases config or baseline',
  'output.large': () => 'Report exceeds 4 MiB',
  'output.failed': () => 'Cannot write report file',
  'config.large': () => 'Config exceeds 1 MiB',
  'config.aliases': () => 'YAML aliases are not supported',
  'config.duplicateIds': () => 'Case IDs must be unique',
  'config.expandedIds': () =>
    'Expanded case IDs must be unique and count at most 1000',
  'config.readFailed': () => 'Cannot read config file',
  'discovery.invalidTools': () => 'Too many tools or duplicate tool names',
  'safety.blockedCases': () =>
    'Process consent, tool allowlist or invocation budget blocked the entire run',
  'safety.blockedRun': () =>
    'Safety preflight blocked execution; no tools were called',
  'run.empty': () => 'No test cases configured; no tools were called',
  'run.unknownTool': () =>
    'A configured case names an unknown tool; no tools were called',
  'run.inputInterrupted': () => 'Run interrupted during input validation',
  'run.inputFailed': () => 'Input validation failed; no tools were called',
  'run.callInterrupted': () => 'Run interrupted before tool invocation',
  'run.missingOutput': () =>
    '/structuredContent: missing output required by advertised schema',
  'run.outputInterrupted': () => 'Run interrupted during result validation',
  'run.requestFailed': () =>
    'Tool request timed out or protocol/transport failed',
  'run.stopped': () => 'Run stopped after tool request failure',
  'run.failed': () => 'Run failed safely',
  'schema.unsupported': () =>
    'Unsupported or invalid advertised JSON Schema (external references are not fetched)',
  'schema.timeout': () => 'Schema validation exceeded 2 seconds',
  'schema.failed': () => 'Schema validation failed safely',
  'schema.terminated': () => 'Schema worker terminated',
  'diff.removed': () => 'Tool removed',
  'diff.added': () => 'Tool added',
  'diff.text': () => 'Display text changed',
  'diff.annotations': () =>
    'Untrusted tool annotations changed; review effects',
  'diff.outputUnknown': () => 'Output compatibility not proven',
  'diff.composedUnknown': () =>
    'Composed or referenced schema compatibility not proven',
  'diff.required': () => 'New required input properties',
  'diff.type': () => 'Root input type rejects previously allowed types',
  'diff.unknown': () => 'Schema compatibility not proven',
  'snapshot.success': () => 'Snapshot written explicitly; no tools called.',
  'cli.invalid': () => 'Invalid invocation or operation failed safely',
  'cli.description': () => 'Explicit MCP tool behavior contracts',
  'help.config': () => 'YAML configuration',
  'help.exec': () => 'Authorize launching the configured stdio process',
  'help.http': () => 'Authorize the configured allowlisted HTTPS endpoint',
  'help.formats': () => 'console, json or junit',
  'help.output': () => 'Write report to a file',
  'help.snapshotOutput': () => 'Explicit baseline destination',
  'help.force': () => 'Explicitly replace an existing baseline',
  'help.baseline': () => 'Read-only baseline',
  'help.strict': () => 'Fail compatibility gate on UNKNOWN as well as BREAKING',
  'help.diffOutput': () => 'Write JSON diff report',
  'help.language': () => 'Human output language (en or zh-CN)',
  'help.option': () => 'display help for command',
  'help.command': () => 'display help for command',
  'help.version': () => 'output the version number',
  'help.usage': () => 'Usage:',
  'help.options': () => 'Options:',
  'help.commands': () => 'Commands:',
  'help.arguments': () => 'Arguments:',
  'help.global': () => 'Global Options:',
  'help.default': () => 'default',
  'help.choices': () => 'choices',
  'help.optionsTerm': () => '[options]',
  'help.commandTerm': () => '[command]',
  'help.localeGuide': () =>
    'Language: --lang > MCPCL_LANG > system locale > en. Unknown locales use English.',
  'help.inspect': () => 'Discover tool definitions without calling tools',
  'help.test': () => 'Run explicitly authorized behavior contracts',
  'help.snapshot': () =>
    'Explicitly write an interface baseline without tool calls',
  'help.diff': () =>
    'Compare interfaces without tool calls or baseline updates',
  'help.inspectFormats': () => 'console or json (default: json)',
  'help.diffFormats': () => 'console or json',
  'view.noDescription': () => '(not advertised)',
  'view.input': () => 'Input schema',
  'view.output': () => 'Output schema',
  'view.description': () => 'Description',
  'view.tool': () => 'Tool',
  'view.protocol': () => 'Protocol',
  'view.truncated': () =>
    '[Presentation truncated; counts and exit status are unchanged. Use a JSON report for full diagnostics.]',
  'config.yaml': (line: number | undefined, col: number | undefined) =>
    `Invalid YAML${line === undefined ? '' : ` at ${line}:${col}`}`,
  'config.invalid': (path: string, code: string | undefined) =>
    `Invalid config at /${path}: ${code}`,
  'schema.validation': (path: string, keyword: string) =>
    `${path}: ${keyword} validation failed`,
  'run.isError': (expected: boolean, actual: boolean) =>
    `/isError: expected ${expected}, actual ${actual}`,
  'assert.failure': (
    path: string,
    operator: string,
    expected: string,
    actual: string,
    missing: boolean,
  ) =>
    `${path || '(root)'}: expected ${operator} ${expected}, actual ${missing ? '(missing)' : actual}`,
  'view.status': (status: Status) => status.toUpperCase(),
  'view.classification': (value: Classification) => value,
  'view.counts': (
    passed: number,
    failed: number,
    blocked: number,
    unrun: number,
    code: number,
  ) =>
    `${passed} passed, ${failed} failed, ${blocked} blocked, ${unrun} unrun; exit ${code}`,
  'view.tools': (count: number) => `${count} tools; no tools called.`,
  'view.changes': (count: number, code: number) =>
    `${count} changes; exit ${code}`,
};
export type Catalog = {
  [K in keyof typeof en]: (...args: Parameters<(typeof en)[K]>) => string;
};
