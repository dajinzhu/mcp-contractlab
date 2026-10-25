# Contributing to MCP ContractLab

Start with the [English README](README.md) or [中文 README](README.zh-CN.md).
You can help with a reproducible bug, a clearer explanation, a localized example,
a bounded fixture or an implementation change. Small focused PRs are easiest to review.
The [project overview](docs/project-overview.md) and [roadmap](docs/roadmap.md)
distinguish implemented features from future release gates.

## Your first change

1. For a bug, describe the command, Node/OS version, expected result, actual exit
   code and a minimal **local, side-effect-free** config/server. Redact secrets.
2. For a significant feature or dependency, discuss its scope before implementation.
   Check existing issues and avoid unrelated refactors.
3. Fork and clone the repository, create a topic branch, then run the setup below.
   Do not work directly on `main`.
4. Make the smallest useful change. Add regression coverage for behavior changes;
   documentation-only edits should get link, language and presentation checks.
5. Open a PR describing the problem, changed behavior, actual commands/results and
   known limits. Include real screenshots for visual changes, with fixture provenance.

## Setup and checks

Use npm and Node.js >=22.13.0. CI tests Node 22 and Node 24 on Ubuntu. Keep the
committed lockfile; update dependencies intentionally and include lockfile changes.
Build before tests: integration tests launch compiled local fixtures in `dist/`.

```sh
npm ci
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:unit
npm run test:smoke
npm run test:package
npm run docs:check
npm run demo -- --allow-exec
```

Format edited source with `npm run format`. Generated HTML has hash-authorized
assets and is intentionally excluded from reformatting; regenerate it instead.
Do not commit `node_modules`, `dist`, caches, private reports or credentials.

Verify negative cases too: `npm run demo -- --allow-exec --expect-sum 6` must exit
**1** and identify `/structuredContent/value`; `npm run demo` without consent must
exit **3**. Neither is a successful test run. Do not weaken assertions or skip tests
to turn these red demonstrations green.

For browser/security/visual work:

```sh
npx playwright install chromium
npm run test:browser
```

Linux CI uses `npx playwright install --with-deps chromium`. Tests open actual
fixture reports as local files with networking offline. If a managed cloud browser
blocks `file:` URLs, the documented `CHROMIUM_PATH=/usr/bin/chromium MCPCL_BROWSER_HTTP=1`
override fulfills permitted localhost documents from disk without a server. State
that limitation; do not silently claim direct-file verification. CI must still pass
its direct-file Chromium checks. Screenshots are written under `/tmp` by default.

For the separate independent upstream fixture, on **Node 24**:

```sh
npm run fixture:install
npm run test:independent
npm run benchmark -- --output /tmp/mcpcl-benchmark.json
```

These are extra checks. The benchmark is a small synthetic experiment, not evidence
of real-world accuracy or superiority. No external MCP service is required.

## Where to work

| Area                      | Start here                                         |
| ------------------------- | -------------------------------------------------- |
| CLI/language              | `src/cli.ts`, `src/i18n/`                          |
| Reports/security          | `src/reports/`, `docs/reports.md`                  |
| Contracts/safety          | `src/contracts/`, `src/runner/`, `src/transports/` |
| Local regression fixtures | `tests/fixtures/`, `tests/integration/`            |
| Docs and identity         | Both READMEs, `docs/`, `assets/brand/README.md`    |

Keep English and Chinese READMEs complete: update corresponding sections, code
blocks, links, support/version claims, safety warnings and FAQ answers together.
`npm run docs:check` checks structural parity, commands, local links, SVG safety,
asset sizes and PNG dimensions; a fluent human still needs to review meaning.
Do not translate command names, config keys, tool names or raw observed values.

Regenerate documentation evidence from working code:

```sh
npm run examples:html
npm run demo:breaking
npm run brand:export
```

The brand exporter needs Playwright Chromium. See [asset provenance and usage](assets/brand/README.md).
New artwork must be original or demonstrably permitted for distribution; retain
required attribution. Do not copy third-party marks or fabricate screenshots.

## Engineering and safety boundaries

Follow [AGENTS.md](AGENTS.md). Use strict TypeScript and the official split MCP v2
packages, pinned to protocol 2026-07-28. Do not implement custom wire framing or
silently fall back to a legacy SDK/protocol.

Never use production servers, destructive tools or real credentials in tests.
Process/network consent, explicit cases, allowlists and budgets remain required.
Never infer permission from annotations. Keep MCP stdout for protocol data; do not
print raw environments, server stderr or secrets. Bound buffers/timeouts and close
transports in `finally`. HTML must remain offline, escaped, redacted and CSP-bound.

Report security concerns through GitHub's private vulnerability reporting if
available; otherwise request a private channel from the maintainer without posting
secrets or third-party exploit details publicly. Do not invent a security contact.

Contributions use the existing [MIT license](LICENSE). Package publication, releases,
external outreach and broader product phases need explicit maintainer approval.
`private: true` stays enabled. Local passing checks, remote CI, merge and publication
are separate events; report which actually happened. This branding/docs PR is not
a release and must not merge automatically.
