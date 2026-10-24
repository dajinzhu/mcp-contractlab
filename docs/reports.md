# Reports v1

`mcpcl test -c CONFIG --allow-exec --report json [--output PATH]` emits JSON.
The default `console` format emits concise case diagnostics and totals. Both formats
use the same redacted data; tool results and process environments are not attached.
The report version is independent of the config and protocol versions.

Top-level fields are `reportVersion: 1`, `protocolVersion: "2026-07-28"`,
`exitCode`, `cases`, `counts`, and `errors`. Cases remain in configuration order;
each contains `id`, `tool`, `status` and `diagnostics`. Status is `passed`, `failed`,
`blocked` or `unrun`; counts contain all four keys. Diagnostics identify a pointer
and expectation where applicable. Timing and timestamps are excluded for stability.

A safety failure blocks the entire suite (exit 3). Configuration, launch, protocol,
transport, timeout and interruption failures exit 2. Contract failures exit 1;
complete success exits 0. An empty test suite exits 2 before process launch. A failed request stops further calls; remaining cases
are unrun. Explicit `isError: true` can satisfy a case expecting that result, while
transport errors cannot. Output schemas apply to successful tool results.

Inspect emits `{ protocolVersion, tools }` with definitions sorted by tool name;
its output is redacted and contains input/output schemas and descriptions. Its
console and JSON selections currently both use readable JSON for complete schema
visibility. No tool is invoked. Diagnostic JSON is not a canonical baseline.

No JUnit, snapshot or diff report is implemented in Phase 1.
