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
