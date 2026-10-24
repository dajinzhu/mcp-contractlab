# MCP ContractLab

Test your MCP tools before your agents trust them.

An independent MIT-licensed project working toward deterministic behavior-contract
tests for MCP servers. **Phase 0 only:** a strict TypeScript scaffold and a working
local example using official MCP TypeScript SDK v2.4.0. No general `mcpcl` CLI or
contract runner is implemented yet. This project is not an official MCP SDK or a
fork of one, and is not production-ready.

## Run the local example

Requires Node.js **22.13.0 or newer** and npm. CI targets Node 22 and 24.
No GPU, LLM API key, account, database or external MCP server is required. npm
installation needs registry access; the demo and tests use local stdio only.

From the repository root:

```sh
npm ci
npm run build
npm run demo -- --help
npm run demo -- --allow-exec
```

The demo launches only the checked-in example server, discovers `echo` and `sum`,
then explicitly calls **only** `sum(2, 3)` once:

```text
PASS discovery: echo, sum (MCP 2026-07-28)
PASS sum(2, 3): /structuredContent/value = 5
```

To demonstrate an actual failing check, deliberately expect the wrong sum:

```sh
npm run demo -- --allow-exec --expect-sum 6
```

This exits **1** and prints
`FAIL: sum /structuredContent/value: expected 6, actual 5`.
Without `--allow-exec`, the demo exits **3** before launching a server. Invalid
arguments and transport errors exit **2**; a successful demo exits **0**. These
options belong to the fixed Phase 0 demo, not a general-purpose CLI.

## Development checks

```sh
npm ci
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:unit
npm run test:smoke
```

Build before running tests: the integration tests exercise the compiled server and
client. `npm run format` formats maintained files; the original supplied build plan
is preserved verbatim. GitHub Actions runs these checks plus passing and deliberately
failing demo commands on CPU-only Ubuntu with Node 22 and 24.

## Scope and safety

The fixture advertises two side-effect-free tools: numeric `sum` and bounded string
`echo`. The demo requires process-launch consent, runs a fixed executable with fixed
arguments, limits message buffers to 64 KiB, discards server stderr, bounds requests,
and closes the child on completion, failure, SIGINT or SIGTERM. Tests themselves
explicitly authorize launching this reviewed fixture. No real destructive tools are
invoked. Process permissions and external effects are **not sandboxed** by this
project; use disposable environments and read-only credentials for future servers.

Only protocol **2026-07-28** is exercised. Older revisions are unverified and the
fixture rejects legacy connections. No YAML config, arbitrary server launch,
`inspect`/`test`/`snapshot`/`diff` commands, assertion engine, reusable allowlist,
reporting, HTTP transport or package publication is provided in Phase 0.

See [architecture and upstream findings](docs/architecture.md),
[competitive notes](docs/competitive-notes.md),
[actual validation results](docs/phase0-validation.md), [contributing](CONTRIBUTING.md),
[agent rules](AGENTS.md), and the [full build plan](CODEX_BUILD_PLAN.md).
