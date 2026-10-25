# Reports v1

`mcpcl test -c CONFIG --allow-exec --report json [--output PATH]` emits JSON.
The default `console` format emits concise case diagnostics and totals. Both formats
use the same redacted data; tool results and process environments are not attached.
The report version is independent of the config and protocol versions.

Top-level fields are `reportVersion: 1`, `protocolVersion: "2026-07-28"`,
`exitCode`, `cases`, `counts`, and `errors`. Cases remain in configuration order;
each contains `id`, `tool`, `status` and `diagnostics`. Status is `passed`, `failed`,
`blocked` or `unrun`; counts contain all four keys. Diagnostics identify a pointer
and expectation where applicable. Timing and timestamps are excluded for stability.

A safety failure blocks the entire suite (exit 3). Configuration, launch, protocol,
transport, timeout and interruption failures exit 2. Contract failures exit 1;
complete success exits 0. An empty test suite exits 2 before process launch. A failed request stops further calls; remaining cases
are unrun. Explicit `isError: true` can satisfy a case expecting that result, while
transport errors cannot. Output schemas apply to successful tool results.

Inspect emits `{ protocolVersion, tools }` with definitions sorted by tool name;
its output is redacted and contains input/output schemas and descriptions. Its
console and JSON selections currently both use readable JSON for complete schema
visibility. No tool is invoked. Diagnostic JSON is not a canonical baseline.

Diff JSON uses diffVersion 1, protocolVersion, exitCode and an ordered changes array.
Each change contains tool, path, classification and reason. Snapshot format is
documented in compatibility.md. `--report junit` emits XML with escaped values and the same redaction as JSON.
Passed cases have empty testcase elements, contract failures have failure elements,
transport failures have error elements, and blocked/unrun cases are skipped. If a
nonzero run has no failed testcase, a synthetic run-status error prevents a false
all-green XML report. The CLI exit code is never changed by the chosen format.

## Coverage (additive report-v1 metadata)

`coverage.discoveryComplete` states whether the tool list is known. The sorted
`advertisedTools`, `attemptedTools`, `completedTools`, and `untestedTools` lists
separate request attempts from completed calls. Failed assertions can still count
as completed calls. A timed-out attempt does not prove completion.

`enumBranches` contains tool name, root property JSON Pointer, total enum choices,
and observed numeric indices. Enum values themselves are not emitted. Only direct
root property enums with at most 32 choices are measured; refs, compositions,
nested constraints, optionality and arbitrary behavior remain unmeasured and are
listed in `limitations`. This is not a general JSON Schema or semantic coverage
percentage. A blocked run cannot fabricate discovered or completed tools.

## Offline HTML reports

From a built checkout, generate a report at a **new** output path:

```sh
npm ci
npm run build
npm run cli -- test -c examples/mcpcl.config.yaml --allow-exec --report html --output report.html --lang en
```

Double-click `report.html`, or use your browser's **Open File** command. You can
copy this single file to another machine; no server, internet connection, account,
font download or companion file is required. The page has an English/简体中文
switch, a light/dark theme button (initially follows the system), search and status
filters, expandable diagnostic details, totals and the original exit code. Reloading
resets view preferences; the page stores nothing. Without JavaScript, all results
and diagnostics remain readable, with native expand/collapse controls.

Blocked and incomplete runs have prominent explanations. A blocked run has unknown
coverage rather than an invented percentage. When discovery completed, coverage
lists advertised, attempted, completed and untested tools and eligible enum indices.
Passing assertions are not proof of full behavior coverage. Unknown branches and
other unmeasured behavior are explicitly identified; no overall correctness score
is calculated. Additional recorded limitation strings remain opaque source text.

`--report html` is supported for **test only**, and always requires `--output`.
It never writes HTML to stdout. Existing console, JSON, JUnit, inspect, diff and
snapshot formats remain unchanged. A saved report preserves suite exits 0/1/2/3;
contract failure and blocked execution never become successful runs. Configuration
errors before a report exists still go to stderr with exit 2. Report-generation or
write errors also exit 2; a file is not evidence that a shell command exited 0.

### Security and bounds

- Data is redacted with the existing report redactor **before escaping**. Typed
  owned diagnostics are translated then redacted in each language. Every untrusted
  value is emitted as escaped text, never HTML, JS, CSS or an active link. Full tool
  responses, raw stderr and process environments are not embedded.
- Only fixed CSS and JavaScript are executable. A CSP meta tag authorizes their
  SHA-256 hashes and denies network connections, images, external fonts, objects,
  frames, workers, forms and base URLs. There is no `unsafe-inline`, `eval`, remote
  dependency, JSON script interpolation or HTML insertion API. Meta CSP cannot
  enforce `frame-ancestors`; this is a local report, not a hosted security boundary.
- The existing canonical redacted JSON guard still applies. In addition, the
  **entire HTML file**, including both languages, escaped data, fixed CSS and JS,
  is capped at **4 MiB**. Locale selection cannot change the gate. Oversized reports
  fail with exit 2 before writing; use JSON or split the suite. HTML is not cut in
  the middle of markup. Individual strings retain existing redaction/truncation
  bounds. No report can restore fields already omitted by the runner.
- HTML output must be a new file in an existing directory. Existing files,
  directories, symlinks (including dangling ones) and hardlinks are refused before
  tools launch. Parent aliases are resolved. The complete 0600 file is published
  atomically with an exclusive hard link, so a destination created after preflight
  is never overwritten. Configuration and baseline aliases are protected by this
  no-overwrite policy. Use a fresh filename for another run. Filesystems without
  hard-link support fail safely with exit 2. This does not sandbox a hostile server
  with the same filesystem permissions.

### Actual fixture examples and screenshots

See [generated examples](examples/html/README.md). These demonstrate local
synthetic fixtures, not production accuracy or external customer results.

```sh
npm run examples:html
npx playwright install chromium
npm run test:browser
```

The generator runs actual passing, broken, blocked and crashing fixtures and copies
the resulting reports to `docs/examples/html/`. Browser tests regenerate temporary
reports, open them as local files with networking offline, and verify language and
theme switches, filters, desktop/mobile layouts, no-JS reading, hostile text and
CSP enforcement. Screenshots go to `/tmp/mcpcl-html-screenshots` (override with
`MCPCL_SCREENSHOTS`). Chromium is a development dependency only; report users need
only a modern browser. Firefox/Safari and screen-reader behavior are not yet tested.
