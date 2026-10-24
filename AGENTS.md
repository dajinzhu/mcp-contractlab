# Engineering rules

Read CODEX_BUILD_PLAN.md fully before changing phase scope. Implement only the
phase the user authorized. This repository currently implements Phase 0: the
development scaffold and a local SDK smoke fixture. Do not start Phase 1 without
explicit authorization, even after Phase 0 checks pass.

- Use strict TypeScript, npm and the committed lockfile; Node.js >=22.13.0.
- Use official split MCP v2 packages; never substitute `@modelcontextprotocol/sdk`.
- Pin the client to MCP `2026-07-28` using the SDK's version-negotiation API.
  Its default is legacy. Do not implement handshakes or wire framing yourself.
- Only start the known local example when running tests or when the demo receives
  `--allow-exec`. Never auto-call discovered tools or trust annotations for consent.
- Launch with argument arrays and `shell: false` (the SDK stdio transport does so).
- Bound requests and buffers. Close child transports in `finally`, including failure
  and interruption paths. Never print environments, raw stderr or secret data.
- No model API, database, account, GPU or external service is needed by tests.
  Never invoke real/destructive tools, arbitrary remote endpoints or publish packages.
- Add meaningful regression tests for fixes. Do not weaken assertions, skip broken
  tests, fabricate passing results, or implement placeholders for later phases.
- Use the existing checkout in this isolated cloud task; do not create a worktree
  unless the user explicitly requests one.

## Required checks

Run from the repository root in this order (tests import the compiled fixture):

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

Also run `npm run demo -- --allow-exec --expect-sum 6` and verify exit **1** with
the `/structuredContent/value` diagnostic. Without `--allow-exec`, the demo must
exit **3**. Neither is a passing contract run. Report exact commands, counts,
failures, changed files, unsupported features, and whether remote CI actually ran.

Phase 0 acceptance requires clean installation, build, typecheck, lint, unit tests
and real stdio smoke tests in CI. Local success alone does not establish remote CI
success. Keep Phase 1 unstarted while acceptance is pending.
