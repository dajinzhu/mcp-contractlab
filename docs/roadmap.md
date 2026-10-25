# Delivery status and realistic roadmap

Completed work and release readiness are separate. Each implementation phase must
pass its own checks before advancing. The original [build plan](../CODEX_BUILD_PLAN.md)
remains available as a historical specification, not a list of release promises.

## Implemented and merged

- Phases 0–4: official modern SDK integration, explicit stdio contracts, bounded
  validation/cleanup, snapshots and conservative diffs, JSON/JUnit, parameter rows,
  measured coverage limits, guarded Streamable HTTP, independent fixture and a
  small synthetic experiment. See historical validation documents in this directory.
- Phase 5 PR A ([#7](https://github.com/dajinzhu/mcp-contractlab/pull/7)):
  typed English/Chinese CLI localization; machine outputs and exit codes preserved.
- Phase 5 PR B ([#8](https://github.com/dajinzhu/mcp-contractlab/pull/8)):
  secure offline bilingual HTML test reports, real fixture examples and Chromium checks.

## Current review scope

`feat/branding-docs`: original MIT-distributed vector identity and PNG exports,
complete bilingual READMEs, contributor guidance, GitHub presentation suggestions
and a genuine removed-tool demonstration. This branch is not automatically merged,
published or released. It does not change the core engine, report CSP or remote
asset policy. Its final PR CI is a separate gate from the already-green `main`.

## Next, subject to maintainer review

1. Ask an independent tester to reproduce source installation, a passing case, a
   deliberate failure and a blocked run in a clean environment.
2. Collect permission-based external feedback; record observations without inventing
   users or contacting anyone automatically.
3. Validate live public-host TLS interoperability against an owner-controlled,
   disposable endpoint, with explicitly authorized network effects.
4. Review namespace/naming, licenses, package contents, supply-chain controls and
   trusted publishing/2FA before proposing a separate release PR.
5. Consider further accessibility and Firefox/Safari validation based on feedback.
   Chromium coverage is not evidence of support across all browsers or screen readers.

No scheduled delivery dates are promised. OAuth, legacy-protocol fallback, arbitrary
schema compatibility proofs, an online dashboard and production-readiness claims
are not implemented by this roadmap. HTML diff viewing remains outside this PR.

## Release gates that remain open

The package stays at `0.1.0-beta.1` with `private: true`; npm publication, tags,
GitHub releases and external outreach require separate explicit authorization.
[Release preparation](releasing.md) explains the remaining evidence and ownership
checks. Green local tests, green remote CI, PR merge and public publication are
four different statuses.
