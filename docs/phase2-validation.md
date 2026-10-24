# Phase 2 validation

2026-10-24, CPU-only Linux, Node 24.19.0 / npm 11.9.0.

- npm ci, build, typecheck, lint and format:check passed.
- Full suite: 65 tests passed in 7 files; unit subset 30, smoke subset 35.
- Snapshot and unchanged diff were executed against the real local example: exit 0.
- A copied baseline containing a removed tool produced BREAKING and exit 1.
- The three deliberately wrong behavioral cases still exited 1 with correct pointers.
- Regression tests cover deterministic output, explicit force, no implicit writes,
  zero calls during snapshot/diff, new required input, renamed/removed tool, root
  type narrowing, description REVIEW, strict UNKNOWN and output-path collisions.
- Initial compilation exposed the SDK's legacy-shaped neutral Tool schema type and
  exact optional property types. Snapshot input now accepts structurally compatible
  definitions and validates its own full modern JSON representation. No protocol
  fallback or assertions were removed. Subsequent complete checks passed.

No production/destructive tools were called. Snapshot files contain public schemas,
not tool results or environments. Complex schema compatibility remains UNKNOWN;
no arbitrary-schema compatibility proof is claimed. Remote CI is checked separately
on the exact pushed commit before PR merge.
