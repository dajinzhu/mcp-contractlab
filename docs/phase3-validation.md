# Phase 3 validation

2026-10-24, CPU-only Linux, Node 24.19.0 / npm 11.9.0.

- Clean npm ci, build, typecheck, lint and format:check passed.
- Main suite: 72 passed in 9 files; unit subset 34, smoke subset 38.
- Independent suite: 1 actual echo-contract test passed against the separately
  pinned Everything server 2.0.0. It requires Node 24 and is a distinct CI check;
  the primary CLI remains tested on Node 22/24 with no hidden fixture skips.
- Installed-tarball check passed: installed binary version matches manifest,
  three good cases pass, three broken cases exit 1, and sensitive/development
  files are absent. Installation disables package lifecycle scripts.
- JUnit unit/CLI tests verify valid escaping, failures, errors, blocked/unrun skips,
  synthetic global errors, redaction and actual exits 0, 1 and 3.
- npm audit --omit=dev reported 0 runtime vulnerabilities at inspection time.
- The public npm name query returned 404; availability and publishing identity
  remain release-time checks, not assumed permission to publish.

Initial lint objected to the XML control-character regex; explicit XML codepoint
filtering now handles invalid XML characters without disabling lint. Initial tests
found a compiled-only manifest path during source imports (65 tests passed, one
suite failed to load); source/installed path resolution was corrected and a version
regression test added. Subsequent complete checks passed.

The independent package's tarball omits its declared LICENSE; upstream license
transition and fixture-only use are documented in releasing.md. Its deprecated
legacy helper is not used to enable fallback; the client remains modern-only.

No npm package, Git tag, GitHub release or external outreach was published.
The release remains private pending specific confirmation and independent user
validation. Remote CI on the pushed phase commit is checked before PR merge.
