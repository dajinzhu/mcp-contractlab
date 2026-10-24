# Contributing

Use Node.js >=22.13.0 and npm. Clone the repository and run the commands in the
README's development checks, in order. `npm ci` preserves the committed lockfile;
update dependencies intentionally with npm and include the resulting lockfile in
the same review. The existing MIT license applies to this project's contributions.

Keep changes small and scoped to the authorized phase. Phase 0 contains only the
local SDK example, tests, research and development tooling. No package is published;
`private: true` prevents accidental npm publication. Do not claim later features
work before their tests exist and execute.

The build emits examples into `dist/`. Vitest runs arithmetic unit tests, real stdio
SDK integration tests and bounded subprocess tests of the compiled demo. Before a
PR, run all README checks, the successful demo and the deliberately wrong
`--expect-sum 6` demo. Verify that the latter exits 1 and that the demo without
`--allow-exec` exits 3. CI tests Node 22 and 24 on Ubuntu. Format changes with
`npm run format`; add regression tests for bug fixes.

Never use production servers or credentials in tests. Keep MCP stdout reserved for
protocol messages. Do not print raw server errors, stderr, environments or secrets.
Use deterministic local fixtures, timeouts, bounded streams and `finally` cleanup.
See AGENTS.md for the complete acceptance commands and phase boundaries.

In your PR, explain the problem, changed behavior, actual checks and remaining
limitations. Distinguish local results from CI results. Do not commit `node_modules`,
`dist`, npm caches or secret files. Report security concerns privately to the
repository maintainer through an available private GitHub channel; never include
credentials or exploit payloads affecting third-party systems in a public report.
