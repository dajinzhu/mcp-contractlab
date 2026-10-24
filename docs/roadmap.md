# Authorized delivery roadmap

The user authorized Phase 1–4 on 2026-10-24, with each phase independently tested,
pushed, CI-verified and merged through a PR before the next phase advances.
Phase 0 and Phase 1 were merged via PR #1 and #2 after Node 22/24 CI passed.
GitHub API access was restored on 2026-10-24; no direct-main pushes were used.

Phase 1: strict YAML; inspect without calls; explicit test allowlists; budgets,
timeouts, cleanup and redaction; JSON Schema/Pointer assertions; console/JSON
reports and passing/broken/timeout/blocked fixtures.

Phase 2: canonical versioned interface snapshots and conservative diff; explicit
baseline writes only; BREAKING, NON_BREAKING, REVIEW and UNKNOWN classifications.

Phase 3: JUnit, independent server fixture, package-install validation, CI usage
and release materials. Docs first; no optional website. Prepare a concrete npm
beta artifact, but confirm package name/version/publishing identity before release.

Phase 4: parameterized cases, measured coverage limits, mutations, reproducible
benchmarks and modern Streamable HTTP with explicit HTTPS host/endpoint permission,
no auth or explicit environment-injected Bearer credentials, and SSRF defenses.
OAuth is deferred. Evaluate old protocols separately without silent fallback.
Prepare feedback materials; confirm recipients and authorization before outreach.

Engineering completion, remote CI, PR merge, npm publication and independent
external feedback are separate statuses. Do not fabricate unavailable evidence or
claim production readiness. Public publishing and external contact remain gated.
