# Current architecture: beta engineering

The CLI loads strict version-1 YAML (including explicit parameter rows), preflights safety, discovers tools through the
pinned modern official SDK client, validates every input, then invokes only the
explicit cases sequentially. Schema checks run in resource-limited workers;
JSON Pointer assertions compare raw data. Reports redact only after comparison.
The official SDK request API carries tools/call; using it directly lets the runner
apply output validation in workers instead of synchronous SDK/Ajv validation.
No wire framing, manual initialization, retries or protocol sessions are implemented.

Canonical snapshots and conservative diff never call tools or modify baselines
implicitly. Console/JSON/JUnit share redaction and exit semantics. Streamable HTTP
uses the same pinned protocol with exact-endpoint consent, DNS/IP checks and a
pinned TLS connector. Coverage is limited to completed tools and explicit root
property enum choices; unmeasured behavior is stated. Independent fixture and
installed-tarball checks exercise the distribution separately from source tests.
See configuration.md, security.md, reports.md and research.md for implemented contracts.
Phase 0 research below is retained as historical evidence, not current scope.

# Phase 0 architecture and specification findings

Research date: **2026-10-24**. Scope: a local, CPU-only SDK connectivity proof and
the development/CI scaffold. The future product specification is
[CODEX_BUILD_PLAN.md](../CODEX_BUILD_PLAN.md); later-phase requirements are not
claims about implemented behavior.

## Upstream verification

The canonical [2026-07-28 specification](https://modelcontextprotocol.io/specification/2026-07-28)
and [SDK v2 docs](https://ts.sdk.modelcontextprotocol.io/v2/) returned proxy
CONNECT 403 in this cloud environment. Research used their **official GitHub source
documents**, not an older SDK or an assumed API:

- [Specification source](https://github.com/modelcontextprotocol/modelcontextprotocol/tree/dae694f61a31f7a3ec2af3aff709e11f70f61e48/docs/specification/2026-07-28):
  overview, changelog, stdio, discovery, versioning, and tool schemas.
- [SDK v2 README](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md),
  [first client](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/first-client.md),
  [first server](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/first-server.md)
  and [migration index](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/upgrade-to-v2.md).
- Actual npm exports, declarations and implementations in installed
  `@modelcontextprotocol/client@2.4.0` and `@modelcontextprotocol/server@2.4.0`.
  Both expose their package root and `/stdio`; the deprecated v1 SDK is absent.

The spec removes protocol sessions and `initialize`/`notifications/initialized`.
Requests carry protocol version and capabilities in `_meta`; `server/discover`
advertises supported versions. Results use `resultType: "complete"` or the MRTR
interim result form. Input/output schemas use JSON Schema 2020-12; structured
content may be **any JSON value**, including null or arrays. This phase's sum
fixture intentionally advertises an object result; no generic object-only contract
restriction is introduced.

The SDK tutorial still describes a legacy initialize handshake. Installed v2.4.0
types confirm the client **defaults to legacy**. Therefore the example uses:

```ts
supportedProtocolVersions: ['2026-07-28'],
versionNegotiation: {
  mode: { pin: '2026-07-28' },
  probe: { timeoutMs: 3000, maxRetries: 0 },
},
inputRequired: { autoFulfill: false },
```

The server uses official `serveStdio(factory, { legacy: 'reject' })` with only the
target revision in its supported versions. The SDK owns framing, negotiation and
shutdown; application code contains no initialize or session implementation.
The client may launch a disposable probe sibling before the main fixture; SDK
stdio cleanup owns both. The smoke tests explicitly exercise `discover` and
`listTools` on the main transport, observe per-request version metadata, verify the
modern era, and ensure discovery emits no `tools/call` or legacy handshake there.
They inspect the raw tool response's `resultType: "complete"`; the SDK consumes
that discriminator when returning the high-level `callTool` value.

Older protocol versions, full spec conformance, HTTP, MRTR fulfillment and general
schema compatibility are unverified. Passing a local smoke does not certify the
entire SDK or protocol.

## Small working components

- `examples/servers/sum.ts`: pure arithmetic used by the fixture and unit tests.
- `examples/servers/echo-server.ts`: official SDK server with `sum` and `echo`,
  input and output schemas, no external effects, and no stdout logging.
- `examples/fixture-client.ts`: modern-only client, fixed local Node executable
  and compiled server path, 64 KiB receive-buffer bound, discarded stderr, and
  three-second request/probe timeouts. The SDK spawns with arrays and `shell: false`;
  it inherits only its documented safe environment-name subset, not all secrets.
- `examples/smoke-client.ts`: consent-gated demo, exact tool discovery, one fixed
  `sum(2,3)` call, optional numeric expected value for a deliberate failure,
  ten-second overall deadline and interruption/finally cleanup. Failure text avoids
  raw server payloads and errors. There is no generic redaction/reporting engine yet.
- `tests/unit`: arithmetic cases. `tests/integration`: real stdio discovery/call,
  invalid input rejection, child exit on success/failure, and compiled demo exits.

The fixed demo is the Phase 0 executable demonstration requested by the build
plan's per-PR checklist. A user-facing `mcpcl` CLI is explicitly deferred to Phase 1.
The larger test matrix is phased with its owning features: safety/config/assertion
tests in Phase 1; snapshots/compatibility tests in Phase 2. Nothing is stubbed out to
make those requirements appear complete.

## Acceptance and next phase boundary

Run the full checks documented in README and AGENTS.md. The deliberate wrong
expectation must fail with exit 1 and a pointer diagnostic. GitHub Actions runs the
same workflow on Node 22 and 24; a local run is not evidence of a remote CI result.
Phase 0 acceptance remains pending until the workflow passes in the repository's
CI. Do not start Phase 1 automatically.

Only after Phase 0 acceptance and explicit authorization, Phase 1 should add:

1. Strict YAML configuration validation and actionable errors.
2. A real `inspect` command that never calls tools.
3. Explicit case/allowlist enforcement, invocation budgets and safe stdio lifecycle.
4. `test` with JSON Pointer `equals`, `exists`, `type`, schema validation and errors.
5. Bounded/redacted console and versioned JSON reports with accurate exit codes.
6. Passing, deliberately broken, timeout and blocked-tool fixtures, plus a matching
   60-second README demonstration.

Snapshots, diff and JUnit remain later phases.
