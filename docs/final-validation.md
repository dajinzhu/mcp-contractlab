# Final engineering verification

Phase 0–4 engineering changes were delivered through PR #1–#5, each with passing
Node 22/24 push and PR checks before merge. Publication and external-user acceptance
remain distinct outstanding gates, not claimed completed by those merges.

Final review found two false-definite schema classifications: number enum [1,2]
becoming integer enum [1,2], and a root required property already enforced by allOf.
Both now produce UNKNOWN; regression tests cover them, non-object/uninhabited old inputs and oversized invalid
type unions. Changed composed/ref
schemas are conservatively UNKNOWN and type proofs are limited to unconstrained
old root types. No arbitrary JSON Schema proof is claimed.

Local results after correction: 111 passed in 14 files, unit subset 64, smoke
subset 47, plus 1 independent fixture test. Installed-tarball validation passed
three good and three broken cases with correct exits. All installation/build/type/
lint/format checks passed. The regenerated experiment remained TP 8, TN 8, FP 0,
FN 0 across 16 executions. These are local results; the follow-up PR's exact-head
CI is verified separately before merge. Local commands are npm ci, build, typecheck, lint, format:check, test,
test:unit, test:smoke, test:independent, test:package and benchmark. Deliberately
broken contract examples must still exit 1; snapshots remain explicit writes only.
The updated raw experiment includes source/fixture/script/dependency fingerprints.

See phase0-validation.md through phase4-validation.md for actual per-stage results
and resolved failures. Release tarballs are prepared privately with checksums and
installed-binary validation. No npm publication, release tag or external contact
has occurred; npm whoami currently reports missing authentication. Public-host TLS
and real independent user feedback/production readiness remain unverified.
