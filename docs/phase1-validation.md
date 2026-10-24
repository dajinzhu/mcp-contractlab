# Phase 1 validation record

Validated on 2026-10-24 using Node 24.19.0 and npm 11.9.0 on CPU-only Linux.

- `npm ci`: passed, 146 packages installed from the committed lockfile.
- `npm run build`, `npm run typecheck`, `npm run lint`, `npm run format:check`: passed.
- `npm test`: 5 files, 51 passed, no failures or skipped tests.
- `npm run test:unit`: 2 files, 20 passed (a subset of the full suite).
- `npm run test:smoke`: 3 files, 31 passed (a subset of the full suite).
- README help, inspect, JSON-file output and three-case passing suite: executed successfully.
- Three-case broken example: all three failed with pointer/expected/actual diagnostics,
  actual exit 1. Unconsented CLI suite: three blocked cases, actual exit 3.
- Original Phase 0 successful demo and deliberately wrong expected-sum demo:
  actual exits 0 and 1 respectively.
- Tests verify zero discovery calls, all-suite safety preflight, input prevalidation,
  unknown tools, missing/wrong output, tool errors, null/array outputs, redaction,
  request timeout, crash, stderr overflow, SIGINT cleanup and schema-worker deadlines.
- Final review identified zero-case test runs returning success. They now exit 2
  before launch, with a real subprocess regression test.
- Initial lint found two throws in a finally block and two redundant initializations.
  Cleanup was extracted and initializations corrected; subsequent lint passed.
- No destructive tools, production servers, model APIs, databases or remote MCP
  services were used. Package publication and external contact were not performed.

The new phase branch is intended for its own PR. GitHub API requests currently
fail with proxy CONNECT 403, including requests with the available injected
credential. Native Git push and public Actions pages work. The environment draft
adds only api.github.com to the existing custom egress list; saving a draft does
not activate it. PR creation, merging Phase 0 and merging this phase require the
user to apply the network configuration and usable GitHub API permissions.

Remote CI status must be verified against the pushed commit separately; this local
record does not claim a remote run or a merge. Later phases must not bypass the
agreed CI/merge gates. See roadmap.md for the remaining authorized work.
