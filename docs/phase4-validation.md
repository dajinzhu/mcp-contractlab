# Phase 4 engineering validation

2026-10-24, CPU-only Linux, Node 24.19.0 / npm 11.9.0.

- Clean npm ci, build, typecheck, lint and format:check passed.
- Main suite: 107 tests passed in 14 files. Unit subset: 60; smoke subset: 47.
- Independent Node-24 Everything echo test: 1 passed. Installed tarball validation:
  installed binary version matches, 3 good contracts pass and 3 broken contracts
  exit 1. These are separate checks, not extra unique unit/smoke tests.
- Actual parameterized YAML example: three rows completed with stable expanded IDs,
  JSON report and explicit completed/untested tool lists. Budget tests reject
  insufficient limits after row expansion, before process launch.
- HTTP tests cover real official modern client/server APIs via injected in-memory
  networking, explicit bearer headers, public-only DNS sets, mixed DNS rejection,
  endpoint confinement, redirects, 401/no OAuth discovery, stream/DNS timeouts and
  response bounds. No real public/private HTTP endpoint was contacted.
- Negative SDK clients using 2025-11-25 and 2025-06-18 were rejected by the modern-only
  fixture before tools/call. The product has no legacy fallback.
- The reproducible experiment completed 16 executions: TP 8, TN 8, FP 0, FN 0.
  Four distinct synthetic faults are repeated twice; controls include independent
  Everything echo. Timing includes the entire CLI process. See research.md and
  checked-in raw data/fingerprints; no real-world/competitor advantage is claimed.
- Actual deliberately wrong behavioral suite and Phase 0 demonstration both exited 1.
- npm audit --omit=dev reported zero runtime vulnerabilities at inspection time.

Initial compilation found a duplicated CLI option type and incomplete SDK reconnect
options; both were corrected using installed types, and subsequent complete checks
passed. Optional-field schema types were adapted without weakening validation.
No assertions were disabled, baselines automatically updated, verification bypassed,
production/destructive tools called, npm artifacts published or people contacted.

## Remaining external gates and limits

Public-host TLS interoperability is not claimed from the in-memory HTTP tests.
DNS/IP enforcement and TLS defaults are implemented, with no private-network or
certificate bypass flag. Full schema/semantic coverage is unmeasured; enum indices
and completed tools are the only reported coverage observations.

Publication remains pending explicit package/version/identity confirmation.
`npm whoami` returned ENEEDAUTH; no credential values were printed or requested in
chat. Trusted publishing or securely configured authentication is needed at release.
External user feedback and independent tester release acceptance have not occurred;
materials are prepared in feedback.md, and no external case study is fabricated.

The engineering work can be reviewed/CI-verified independently of these publication
and external-validation gates. Remote CI on the exact phase head is required before
PR merge; local success alone does not establish that result.
