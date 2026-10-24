# MCP ContractLab

Test your MCP tools before your agents trust them.

An independent MIT-licensed MCP behavior-contract test runner. The beta implements
explicit stdio inspection, behavior tests, conservative interface gates, JUnit and guarded Streamable HTTP using official MCP SDK v2.4.0,
protocol **2026-07-28**. Not production-ready. Legacy protocol revisions are not
verified; no LLM, GPU, database, account or external MCP service is needed.

## Quick start

Requires Node.js >=22.13.0 and npm. From the repository root:

```sh
npm ci
npm run build
npm run cli -- --help
npm run cli -- inspect -c examples/mcpcl.config.yaml --allow-exec
npm run cli -- test -c examples/mcpcl.config.yaml --allow-exec
```

The last command runs three explicitly authorized, side-effect-free local `sum`
cases and exits 0. Relative paths resolve from the configuration's directory.
To save a machine-readable report:

```sh
npm run cli -- test -c examples/mcpcl.config.yaml --allow-exec --report json --output /tmp/mcpcl-report.json
```

For a deliberately failing suite:

```sh
npm run cli -- test -c examples/mcpcl.broken.yaml --allow-exec
```

All three cases fail with exit **1**, identifying the case, JSON Pointer, expected
and actual values. This is deliberate; it is not a passing contract run.
The original Phase 0 demo also remains available as `npm run demo -- --allow-exec`.
Without `--allow-exec`, launching a server is blocked with exit **3**.

## Contract tests and safety

Launching a process requires `--allow-exec`; tool calls additionally require both
an explicit case and `safety.allowToolCalls`. An unauthorized tool or insufficient
invocation budget blocks the **whole suite before launching anything**. `inspect`
never calls tools. Unknown tools and invalid inputs are detected before any calls.
Calls are sequential and never retried automatically.

Assertions use RFC 6901 JSON Pointer and `equals`, `exists` or `type`; missing values
are distinct from null. Inputs and declared structured outputs use JSON Schema
2020-12. Schema validation runs in bounded workers; external `$ref` is never fetched.
Format keywords are annotations, not additional format assertions. Tool error
results (`isError`) are distinct from protocol/transport failures.

Exit codes: **0** success; **1** contract failure; **2** invalid config, launch,
transport, timeout or interruption; **3** safety blocked. Empty test suites exit 2 before launch, so zero checks cannot pass a CI gate. Reports count passed, failed,
blocked and unrun cases. A transport failure stops subsequent calls.

These permissions do not sandbox configured programs or external side effects.
Use disposable environments and read-only credentials. Never test production tools
without independently reviewing their effects. See [security](docs/security.md).

## Development

```sh
npm ci
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:unit
npm run test:smoke
npm run demo -- --allow-exec
```

Build first: integration tests exercise compiled fixtures. GitHub Actions uses
Node 22 and 24. Each phase's remote CI must succeed before advancing.

See [configuration](docs/configuration.md), [report format](docs/reports.md),
[architecture](docs/architecture.md), [competitive observations](docs/competitive-notes.md),
[contributing](CONTRIBUTING.md), [agent rules](AGENTS.md), and
[the original build plan](CODEX_BUILD_PLAN.md).

Parameterized cases and explicitly limited coverage are also available. The npm package remains private and unpublished.

## Interface baselines

```sh
npm run cli -- snapshot -c examples/mcpcl.config.yaml --allow-exec --output /tmp/mcpcl-baseline.json
npm run cli -- diff -c examples/mcpcl.config.yaml --allow-exec --baseline /tmp/mcpcl-baseline.json
```

An existing baseline is replaced only by `snapshot --force`. Neither `test` nor
`diff` updates it. Baselines contain public tool schemas verbatim, not runtime
results or environments; review advertised defaults/examples before committing.
Default diff gates fail only BREAKING changes; `--strict` also fails UNKNOWN.
Description changes are REVIEW. See [compatibility](docs/compatibility.md).

## CI reports and distribution checks

```sh
npm run cli -- test -c examples/mcpcl.config.yaml --allow-exec --report junit --output /tmp/mcpcl-junit.xml
npm run test:package
```

The package check builds and packs the CLI, installs the tarball in a clean
consumer directory, invokes the installed binary, and verifies both passing and
failing examples. It needs npm registry access, not a public MCP service.
For the additional independent upstream server fixture (Node 24 only):

```sh
npm run fixture:install
npm run test:independent
```

The main CLI remains tested on Node 22/24. The independently maintained Everything
server 2.0.0 requires Node 24 and has its own pinned fixture lockfile. Only its
side-effect-free echo tool is authorized. These checks are additional, not silently
skipped tests in the main suite. See [release preparation](docs/releasing.md).

## Parameterized cases and coverage

```sh
npm run cli -- test -c examples/mcpcl.parameterized.yaml --allow-exec --report json
```

Each table row supplies its own ID, arguments and expectation. Expansion preserves
order and enforces the same allowlist and total invocation budget. JSON reports
identify advertised, attempted, completed and untested tools. Only direct root
property enums (at most 32 values) have measured value-branch observations;
compositions, nested constraints and general behavioral coverage are unmeasured.

## Reviewed HTTPS endpoints

Use `transport: streamable-http`, an exact `server.url` and explicit
`safety.allowedHttpHosts`; then supply `--allow-http` instead of `--allow-exec`.
The HTTP example contains a reserved placeholder host and must be edited before
use. Optional bearer credentials come only from the named `server.authEnv` variable.
Private/local/metadata addresses, mixed DNS answers, credentials in URLs, query
strings, fragments, off-endpoint requests and redirects are blocked. DNS answers
are checked once and pinned to the TLS connector. OAuth is not implemented.
See [HTTP security and boundaries](docs/security.md).

## Reproducible evidence

On Node 24, after building and installing the independent fixture:

```sh
npm run benchmark -- --output /tmp/mcpcl-benchmark.json
```

See [methodology and limitations](docs/research.md) and the checked-in raw results.
This is a small deterministic experiment, not real-world accuracy or superiority
against competing tools. External user feedback and public npm publication remain
pending; the project is not production-ready.
