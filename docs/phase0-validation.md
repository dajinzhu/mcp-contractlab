# Phase 0 validation record

Executed on **2026-10-24**, CPU-only Linux. Phase 1 was not started.

## Actual results

Node **24.19.0** / npm **11.9.0** was tested in the working checkout after `npm ci`.
Node **22.23.4** / npm **11.9.0** was additionally tested in an independent source
copy with no preexisting `node_modules` or `dist`, followed by `npm ci` and build.
No worktree was created; the independent validation directory was under `/tmp`.

| Command                                       | Node 24                      | Node 22                      |
| --------------------------------------------- | ---------------------------- | ---------------------------- |
| `npm ci`                                      | PASS, 140 packages installed | PASS, 140 packages installed |
| `npm run build`                               | PASS                         | PASS                         |
| `npm run typecheck`                           | PASS                         | PASS                         |
| `npm run lint`                                | PASS                         | PASS                         |
| `npm run format:check`                        | PASS                         | PASS                         |
| `npm test`                                    | 3 files, 16 tests passed     | 3 files, 16 tests passed     |
| `npm run test:unit`                           | 1 file, 4 tests passed       | 1 file, 4 tests passed       |
| `npm run test:smoke`                          | 2 files, 12 tests passed     | 2 files, 12 tests passed     |
| `npm run demo -- --allow-exec`                | PASS, exit 0                 | PASS, exit 0                 |
| `npm run demo -- --allow-exec --expect-sum 6` | Expected failure, exit 1     | Expected failure, exit 1     |

The full suite has no skipped or expected-failure test cases. It includes a test
which launches the deliberately failing demo and asserts its actual exit 1; that
test passes because it verifies the negative behavior. The failing demo itself is
not a passing contract check. The unit/smoke commands rerun subsets of the same 16
tests, not additional unique tests.

Successful demo output:

```text
PASS discovery: echo, sum (MCP 2026-07-28)
PASS sum(2, 3): /structuredContent/value = 5
```

Deliberately wrong expected value:

```text
FAIL: sum /structuredContent/value: expected 6, actual 5
```

`npm run demo` without consent was also executed directly on Node 24: exit **3**,
`BLOCKED: pass --allow-exec to launch the local fixture.` Both runtimes' integration
tests verify this blocked path, help and invalid-argument exits. The README help
command was also executed directly on Node 24.

## Investigation history and limits

- The first registry query failed because npm's default home cache was unwritable.
  A writable cache resolved it; the repository now configures ignored `.npm/`.
- Canonical spec/docs websites returned proxy CONNECT 403. Research used official
  GitHub source docs and installed v2.4.0 types/implementations instead, as documented
  in architecture.md. Package checksums/TLS verification were not disabled.
- The first test run had **14 passed, 2 failed**. The tests incorrectly expected
  the SDK's disposable sibling discovery on the main transport and expected the
  consumed wire `resultType` on the high-level result. After checking the installed
  SDK, tests explicitly exercised discovery on the main connection and checked
  `resultType` in the incoming response. The subsequent full checks passed.
- An initial ESLint run flagged one redundant `pid` initialization; it was removed
  and lint subsequently passed. No unresolved local build/test/lint failures remain.
- Git's whitespace check reported eight original Markdown hard-break lines in the
  supplied build plan. That document is intentionally preserved byte-for-byte;
  the diff whitespace check passes for all authored files when it is excluded.
- Only reviewed, side-effect-free local fixture tools were invoked. No real
  destructive tools, model APIs, databases or external MCP servers were used.
- GitHub Actions is configured with immutable action revisions, read-only repository
  permission and a Node 22/24 matrix. **No remote GitHub Actions run was triggered or
  observed here.** Therefore the build plan's literal “passes in CI” acceptance
  criterion remains pending. Do not describe Phase 0 as remotely accepted or start
  Phase 1 until that gate passes and Phase 1 is explicitly authorized.

This is a development scaffold, not the Phase 1 CLI or a production-ready release.
The precise deferred Phase 1 tasks are listed in architecture.md.
