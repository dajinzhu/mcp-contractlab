# Interface snapshots and conservative compatibility

Snapshot version 1 has `snapshotVersion: 1`, `protocolVersion: "2026-07-28"`
and `tools`. Tool names are unique and sorted; object keys are recursively sorted.
Stable fields are name, title, description, inputSchema, outputSchema and annotations.
Volatile metadata, icons, timestamps and runtime output are omitted. Arrays retain
semantic order. No tools are called during snapshot or diff.

Only `snapshot --output PATH` writes a baseline. Parent directories must exist;
an existing file requires `--force`. Writes use a same-directory temporary file
and atomic link/rename. Diff reads a bounded, validated baseline, never rewrites it,
and refuses report paths aliasing the config or baseline. Baselines hold actual
public schema definitions without report redaction, so inspect schemas for secrets
in defaults/examples before committing. Reports are redacted separately.

| Change                                        | Classification | Default gate                 |
| --------------------------------------------- | -------------- | ---------------------------- |
| Tool removed or renamed away                  | BREAKING       | exit 1                       |
| Required root input property newly added      | BREAKING       | exit 1                       |
| Incompatible/narrowed root input type         | BREAKING       | exit 1                       |
| New tool                                      | NON_BREAKING   | exit 0                       |
| Description, title or annotations changed     | REVIEW         | exit 0                       |
| Other changed input/output schema constraints | UNKNOWN        | exit 0; exit 1 with --strict |

Number-to-integer is narrowing; integer-to-number is conservatively UNKNOWN.
Nested constraints, enum changes, refs and oneOf/anyOf compatibility are not proven.
A single change may produce both a known BREAKING finding and UNKNOWN residual
constraints. Unchanged complex schemas produce no diff. This algorithm does not
prove arbitrary JSON Schema backward compatibility or behavioral compatibility.
Snapshots cannot substitute for the behavioral suite.

Only 2026-07-28 is supported. Older protocol revisions are unverified and rejected;
there is no implicit legacy initialize fallback.

## Measured protocol matrix

| Client                       | Fixture                                              | Observation                                  |
| ---------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| CLI pinned 2026-07-28        | Modern stdio fixture                                 | Discovery/call succeeds                      |
| CLI pinned 2026-07-28        | Modern HTTP SDK handler via injected network adapter | Discovery/call succeeds; no legacy handshake |
| SDK legacy client 2025-11-25 | Modern-only stdio fixture                            | Rejected before any tool call                |
| SDK legacy client 2025-06-18 | Modern-only stdio fixture                            | Rejected before any tool call                |

The negative legacy clients exist only in compatibility tests. The product does
not offer these revisions or silently fall back; legacy-server interoperability
and public-host HTTP/TLS integration remain unverified.

### Constrained and composed schema caution

Any changed input schema containing composition, refs or dependent/unevaluated
constraints is UNKNOWN, even if a superficial root required/type comparison looks
breaking. A root type narrowing is classified BREAKING only when the old schema
has no other validating constraints. For example, number with enum [1,2] becoming
integer with the same enum is UNKNOWN rather than a false definite break. Likewise,
adding root required [a] when allOf already requires a is UNKNOWN. Newly required
properties are classified directly only for the supported simple root structure;
other cases remain reviewable uncertainty. Strict mode may opt to fail these gates.

For a new required-field proof, the old root must admit objects and its required
properties must have demonstrably inhabited simple schemas. False schemas,
non-object-only roots, constrained required values and invalid/oversized type unions
remain UNKNOWN. Type unions are bounded to valid JSON primitive categories and
required names use sets, avoiding quadratic comparisons on untrusted duplicates.
