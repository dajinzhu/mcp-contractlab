# MCP ContractLab

Test your MCP tools before your agents trust them.

An independent MIT-licensed MCP behavior-contract test runner. Phase 1 implements
explicit stdio tool inspection and behavior tests using official MCP SDK v2.4.0,
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

Phase 2 snapshots/diff, Phase 3 JUnit/distribution, and Phase 4 HTTP/coverage are
not implemented yet. The npm package remains private and unpublished.
