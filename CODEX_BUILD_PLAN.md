# MCP ContractLab — Codex Build Plan

> **Project:** MCP ContractLab  
> **GitHub repository:** `mcp-contractlab`  
> **Proposed CLI:** `mcpcl`  
> **Tagline:** *Test your MCP tools before your agents trust them.*  
> **Project type:** Public, independent open-source software (not a fork of the official MCP SDK)  
> **License:** MIT  
> **Technical baseline:** Node.js 22+, TypeScript, MCP TypeScript SDK v2 (2026-07-28 protocol)  
> **Execution environment:** CPU-only, Codex Cloud / GitHub Actions  
> **Status:** Development specification — not implemented yet

---

## 0. 给项目维护者的说明（中文）

**核心目标：** 把 MCP Server 的工具调用变成可自动运行、可断言、可回归比较、可在 CI 中阻止破坏性变更的测试套件。

**我们不做的事：** 重新开发 MCP Inspector、MCP 官方 Conformance Suite，或只做一款捕捉 Schema Drift 的工具。现有项目包括 `modelcontextprotocol/conformance`、`TsvetanG2/mcpward`、`mcplint-cli`。我们的主线是 **Contract-by-Example**：开发者写几个有明确预期的工具行为测试，每次修改 MCP Server 时自动重跑，给出准确的失败位置与可审计的契约差异报告。

**最小闭环：** 启动测试服务器 → 发现工具 → 按授权白名单调用 → 验证输出 → 对照锁定的工具接口快照 → 输出报告与准确退出码。

**最重要的产品原则：** CPU 即可运行；不需要 LLM API Key；用户可以 60 秒内在内置示例上跑通；默认绝不自动执行未知或可能产生副作用的工具。

**注意规范升级：** MCP `2026-07-28` 已改为无协议级会话的模型，弃用旧版本 `initialize`/`initialized` 握手；不要把 2025 SDK 的协议逻辑复制到 v2 中。使用官方 TypeScript SDK v2 的已公布接口，并检查其实际类型签名。

**Codex 执行方式：** 每次只完成下面一个 Phase；必须真实运行检查和测试，然后输出变更摘要、具体命令及通过/失败结果。绝不把「计划完成」当作「功能已经实现」。

---

## 1. Mission and product positioning

Build an **MCP server behavior-contract test runner** designed for developers who maintain MCP servers. A developer should be able to:

1. Connect to their own test MCP server (initially via stdio).
2. Inspect available tools and advertised `inputSchema` / optional `outputSchema` without calling any tool.
3. Define explicit test cases with input arguments and expected structured outputs or errors.
4. Run only explicitly authorized tools in a controlled process and assert the results.
5. Lock a canonical snapshot of the public tool interface and detect breaking changes in CI.
6. Export human-readable and machine-readable failure reports.

### One-sentence positioning

> **MCP ContractLab is a test runner for MCP tool behavior and backward-compatible interface changes, not another protocol inspector.**

### Competitive landscape: acknowledge existing tools

| Project | Existing focus | ContractLab differentiation to prove |
| --- | --- | --- |
| `modelcontextprotocol/conformance` | Official MCP protocol conformance tests | User-defined application-level assertions about **specific tools** |
| `modelcontextprotocol/inspector` | Interactive inspection and debugging | Repeatable headless tests and CI gates |
| `TsvetanG2/mcpward` | Black-box schema drift, poisoning and CI reporting | Stronger fixture-driven behavioral tests, parameterized cases, expectation diagnostics |
| `mcplint-cli` | Tool quality, descriptions and behavioral contract exploration | Deterministic tool invocation contracts that don't require model inference |

**Do not claim an original concept without evidence.** Document feature differences with executable examples and update the comparison after implementation.

---

## 2. Users, jobs, and success criteria

### Primary users

- A solo MCP Server maintainer using Node.js or Python.
- An open-source team that wants test failures on PRs before releasing a new tool version.
- A CI maintainer who needs deterministic machine-readable assertions and regression reports.

### Jobs to be done

- “After I modify `get_customer`, did the output contract break?”
- “Did the `inputSchema` unexpectedly acquire a new required argument?”
- “Did the server return `isError: true` when it should not?”
- “Can a fresh CI runner reproduce the same failure?”

### MVP acceptance criteria

- `npm ci && npm run build && npm test && npm run lint && npm run typecheck` runs successfully in a clean CPU-only Linux environment.
- Three real end-to-end fixture cases pass against an example MCP stdio server.
- Three intentionally broken cases fail with the correct exit code and readable diagnostics.
- One snapshot comparison reliably detects a removed tool and an added required parameter.
- Zero LLM API, database, account, GPU, or cloud service dependencies.
- Unknown tools must **never** be called automatically.
- README includes a working quick-start copy/paste demonstration.

---

## 3. Technical decisions

| Area | Choice | Reason |
| --- | --- | --- |
| Language | TypeScript with strict mode | MCP TypeScript SDK support, approachable contributor base |
| Runtime | Node.js 22+ | Stable modern Node environment |
| Package manager | npm, committed lockfile | Simple install in GitHub Actions and Codex |
| MCP integration | Official `@modelcontextprotocol/client` v2 | Use maintained client abstractions, avoid implementing the wire protocol |
| Example test server | Official `@modelcontextprotocol/server` v2 | Representative runnable fixture |
| CLI | `commander` (or equally small alternative) | Predictable commands/help |
| Validation | `ajv` with JSON Schema 2020-12 support | Validate tool output contracts accurately |
| Config | YAML via `yaml` plus own validated config schema | Easy to author and review in a PR |
| Tests | Vitest | Unit and end-to-end suite |
| Quality | ESLint, Prettier, `tsc --noEmit` | Code hygiene |
| Reports | Console + JSON, later JUnit | Human and CI consumption |
| CI | GitHub Actions | CPU-only repeatable test environment |
| Distribution | `npm` published CLI (publish only when ready) | `npx` first-run experience |

**Dependency caution:** Use the MCP v2 package names above. Do not silently fall back to the deprecated v1 `@modelcontextprotocol/sdk`. Verify actual exports from installed packages against https://ts.sdk.modelcontextprotocol.io/v2/ and adjust imports accordingly.

### Protocol version policy

- Target `2026-07-28` for the first release.
- Explicitly document that older MCP protocol revisions are not verified.
- Do not write manual initialize/session handling for v2.
- Design transport and protocol-version interfaces so older versions can be added later as an explicit compatibility milestone.

---

## 4. Proposed repository structure

```text
mcp-contractlab/
├── .github/
│   ├── workflows/ci.yml
│   ├── ISSUE_TEMPLATE/bug_report.yml
│   └── pull_request_template.md
├── docs/
│   ├── quickstart.md
│   ├── configuration.md
│   ├── architecture.md
│   ├── security.md
│   └── compatibility.md
├── examples/
│   ├── servers/echo-server.ts
│   ├── mcpcl.config.yaml
│   └── expected-report.json
├── src/
│   ├── cli.ts
│   ├── config/load.ts
│   ├── config/schema.ts
│   ├── transports/stdio.ts
│   ├── discovery/discover.ts
│   ├── contracts/assertions.ts
│   ├── contracts/output-schema.ts
│   ├── contracts/snapshot.ts
│   ├── contracts/diff.ts
│   ├── runner/run-suite.ts
│   ├── runner/safety.ts
│   ├── reports/console.ts
│   ├── reports/json.ts
│   └── types.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── AGENTS.md
├── CHANGELOG.md
├── CODEX_BUILD_PLAN.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── package.json
├── package-lock.json
└── tsconfig.json
```

Avoid speculative abstractions and placeholder modules: create each file only when needed by a working feature. Keep the initial source tree smaller if implementation does not yet warrant all listed files.

---

## 5. CLI design

### MVP commands

```bash
# View help
mcpcl --help

# Inspect tool names and schemas; no tool calls
mcpcl inspect -c examples/mcpcl.config.yaml --allow-exec

# Run explicitly named test cases and save report
mcpcl test -c examples/mcpcl.config.yaml --allow-exec --report json --output report.json

# Explicitly approve a new interface baseline
mcpcl snapshot -c examples/mcpcl.config.yaml --allow-exec --output .mcp-contractlab/snapshot.json

# Compare current advertised tool contracts with the baseline
mcpcl diff -c examples/mcpcl.config.yaml --allow-exec --baseline .mcp-contractlab/snapshot.json
```

CLI option details can evolve, but the implemented help, docs, and tests **must match one another**. A `--allow-exec` flag here means consent to launch the local configured stdio process; it does not authorize arbitrary tool calls.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Command succeeds, all requested checks pass |
| `1` | Contract assertion or declared compatibility gate fails |
| `2` | Invalid config, invocation error, server launch error, transport failure |
| `3` | Test run blocked by a safety policy (not treated as passing) |

All commands must complete without hanging after child-server termination.

---

## 6. Config format (v1 draft)

Save this file as `examples/mcpcl.config.yaml`. The example server must implement a `sum` tool that accepts `{ a, b }` and returns `{ value: a + b }` in `structuredContent`, with a matching advertised `outputSchema`.

```yaml
schemaVersion: 1
server:
  name: local-echo-demo
  transport: stdio
  command: node
  args: ["dist/examples/servers/echo-server.js"]
  cwd: "."
  timeoutMs: 10000

safety:
  # Launching a process requires --allow-exec at runtime.
  # Invoking tools requires BOTH explicit cases AND this allowlist.
  allowToolCalls: ["sum"]
  maxToolCalls: 10
  toolTimeoutMs: 5000

cases:
  - id: sum-positive-integers
    tool: sum
    arguments:
      a: 2
      b: 3
    expect:
      isError: false
      assertions:
        - path: "/structuredContent/value"
          operator: equals
          value: 5
        - path: "/structuredContent/value"
          operator: type
          value: number

  - id: sum-zero
    tool: sum
    arguments:
      a: 0
      b: 0
    expect:
      isError: false
      assertions:
        - path: "/structuredContent/value"
          operator: equals
          value: 0
```

**Configuration rules:**

- Paths use JSON Pointer (RFC 6901), not free-form JS or `eval` expressions.
- Operators for MVP: `equals`, `exists`, `type`. `matches` and `contains` may be added later with bounds and explicit semantics.
- Missing path must be distinguishable from a JSON value of `null`.
- Validate the config strictly, with actionable error messages and location information where practical.
- Each test `id` must be unique; each invoked tool must appear in `allowToolCalls`.
- Support variable environment injection only from explicit allowlisted env names; don't interpolate arbitrary user code.
- Never automatically derive executable tool arguments from production traffic.
- Never infer that a tool is safe from untrusted tool annotations.

---

## 7. Core behaviors and diagnostic quality

### 7.1 Discovery

Retrieve `tools/list` using the official MCP client. Show tool name, description, input schema and output schema (if available). Do not call tools during discovery or snapshot operations. Canonicalize stable fields only and preserve the protocol version in metadata.

### 7.2 Behavior assertions

For an explicitly authorized test case:

1. Validate tool existence and validate input arguments against the advertised input schema.
2. Invoke the tool using the SDK and enforce a timeout.
3. Distinguish transport/protocol errors from tool results where `isError: true`.
4. If an `outputSchema` exists, validate the returned `structuredContent` according to the current MCP specification.
5. Apply explicit JSON Pointer assertions.
6. Report the expected value, actual safe/redacted value, test case ID and failed JSON Pointer.

Do not assume `structuredContent` must always be an object in the `2026-07-28` spec: arrays, strings, numbers, booleans and null may be valid when the schema permits them.

### 7.3 Contract snapshot and diff

Store normalized advertised tool definitions in a versioned JSON snapshot. The snapshot is checked into source control and is **never overwritten as a side effect of `test` or `diff`**. Require the explicit `snapshot` command to refresh it.

Initial compatibility classifications:

| Change | Classification |
| --- | --- |
| Tool removed | BREAKING |
| Required input property newly added | BREAKING (for prior callers) |
| Previously optional input becomes required | BREAKING |
| Root input type changes incompatibly | BREAKING |
| New tool added | NON_BREAKING |
| Description changed | REVIEW |
| Complex `oneOf`/`anyOf`/`$ref` compatibility not provable | UNKNOWN / REVIEW |

**Critical:** Do not claim that a simple diff algorithm can prove compatibility for arbitrary JSON Schema 2020-12. Conservative `UNKNOWN` is better than misleading `NON_BREAKING`. Expose a strict-mode option later to fail CI on `UNKNOWN` if the maintainer opts in.

### 7.4 Reports

- Console: concise summary and actionable, redacted failure details.
- JSON: documented, versioned report schema; stable ordering and sanitized error data.
- JUnit XML: planned for Phase 3, not a promise in Phase 1.
- Include counts of passed/failed/blocked cases and process exit status.

---

## 8. Security model (non-negotiable)

Testing an MCP Server can invoke tools with real side effects. Treat `tools/call` as unsafe unless explicitly authorized.

1. Default `inspect`, `snapshot` and `diff` **never invoke any tools**.
2. All stdio process launching needs explicit `--allow-exec` consent; use `spawn` with argument arrays and `shell: false`.
3. `test` may call only tools named in both the test cases and `safety.allowToolCalls`.
4. Default to local stdio only. Remote HTTP support requires a separate Phase, explicit allowlist, auth design, and SSRF review.
5. Redact common secret-looking keys/values from console and generated reports. Never capture entire process environments in reports.
6. Apply timeouts, bounded stdout/stderr buffers and cleanup of child processes on failures/interruption.
7. Do not run arbitrary code supplied by server responses or evaluate JS expressions from YAML.
8. Do not automatically approve destructive tool calls, issue network requests to arbitrary destinations, or update baselines in CI.
9. Document that process permissions and external tool side effects are **not** fully sandboxed by this CLI; recommend disposable environments and read-only test credentials.
10. Ensure sample tools have no external side effects.

---

## 9. Codex implementation phases

Each phase is a separate reviewable PR or commit series, not an instruction to implement everything in one shot.

### Phase 0 — Research, scaffold and specification confirmation

- [ ] Read the official MCP 2026-07-28 spec and TypeScript SDK v2 docs.
- [ ] Read competing projects and write `docs/competitive-notes.md` with links and dated observations.
- [ ] Initialize npm/TypeScript, Git, MIT license, README, CONTRIBUTING, `.gitignore`, lint/format/typecheck/test scripts.
- [ ] Add `AGENTS.md` summarizing project rules and acceptance tests.
- [ ] Build one minimal local MCP v2 stdio example server and client smoke test.
- [ ] Confirm in a test that tools can be discovered and called using official SDK v2.
- [ ] Commit the lockfile and create GitHub Actions CI.

**Done when:** A clean installation, build, typecheck, lint, unit test and example smoke test all pass in CI.

### Phase 1 — First useful CLI (MVP)

- [ ] Implement strict YAML config validation and errors.
- [ ] Implement `inspect` without tools/call.
- [ ] Implement `test` with explicit allowlist and limited assertion operators.
- [ ] Enforce timeouts, tool invocation budget, child process cleanup and redaction.
- [ ] Validate input and structured output schemas (where advertised).
- [ ] Implement deterministic console and JSON result reports plus exit codes.
- [ ] Create passing, intentionally broken, timeout and blocked-tool fixtures.
- [ ] Update README with 60-second copy/paste demo.

**Done when:** Three good contracts pass; three bad contracts fail for the correct reason; unsafe calls are blocked; no GPU, key or external service is required.

### Phase 2 — Snapshot and compatibility gating

- [ ] Implement deterministic, version-tagged snapshot format.
- [ ] Implement `snapshot` with explicit opt-in write action.
- [ ] Implement `diff` with conservative change classification.
- [ ] Add tests for renamed/removed tools, added required args and unchanged schema.
- [ ] Add CI usage example: block only explicitly classified breaking changes.
- [ ] Document uncertainty / false positive limitations.

**Done when:** A PR that removes a public tool reliably produces a failing CI gate, while a docs-only description change produces `REVIEW`, not a falsely asserted breaking change.

### Phase 3 — Public-beta developer experience

- [ ] JUnit XML output with escaping and correct failures/skips.
- [ ] GitHub Action reusable example (prefer simple CLI action first, no marketplace app).
- [ ] Project website via GitHub Pages (optional, docs first).
- [ ] Publish npm package once the name, license and supply-chain safeguards are verified.
- [ ] Integration tests against at least one independent MCP Server fixture.
- [ ] Issue templates, contributing guide, changelog, release tagging and release notes.

**Done when:** A third party can follow public docs to install, define a contract and run it in GitHub Actions without private assistance.

### Phase 4 — Differentiation and research-quality evidence

- [ ] Add parameterized contract cases and compact test tables.
- [ ] Investigate deterministic contract coverage measurement: tested tools, tested schema branches, known gaps.
- [ ] Evaluate mutation-based fixture robustness using synthetic MCP Server bugs.
- [ ] Support Streamable HTTP with explicit trusted-host allowlisting and security tests.
- [ ] Evaluate compatibility behavior across supported protocol revisions, separately from v2.
- [ ] Write benchmarks of detection precision, runtime overhead and false alarms on public fixtures.
- [ ] Gather permission-based external user feedback and publish repeatable case studies.

**Done when:** Feature differences and real value relative to existing open-source tools are demonstrated by executable benchmarks, not README claims.

---

## 10. Required test matrix

At minimum, create tests covering:

| Category | Example | Expected result |
| --- | --- | --- |
| Discovery | Two advertised tools | Exact names collected without invocation |
| Positive behavior | `sum(2,3)` returns `5` | PASS |
| Negative behavior | `sum(2,3)` returns `6` | FAIL with precise pointer |
| `isError` | Tool returns error result | FAIL when `isError:false` expected |
| Missing structured output | Output schema declared but no valid structuredContent | FAIL |
| Schema | Wrong output field type | FAIL with schema diagnostic |
| Unknown tool | Case calls missing tool | Configuration/contract error, not silent skip |
| Safety | Tool not in explicit allowlist | BLOCKED, exit 3 |
| Timeout | Tool hangs | Deterministic failure and child cleanup |
| Snapshot | Same advertised definitions | No diff |
| Breaking diff | Tool removed | BREAKING |
| Breaking diff | Required input added | BREAKING |
| Review diff | Description changed | REVIEW |
| Unknown diff | Non-trivial composition changes | UNKNOWN |
| Redaction | Token appears in stderr or result | No secret in user-facing report |

Use deterministic fake servers and temporary directories. Never base CI solely on external public MCP services.

---

## 11. Definition of done for every Codex PR

Before declaring a phase complete, Codex MUST:

- [ ] Show changed files and a concise explanation of the architecture.
- [ ] Run real commands: `npm ci`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`.
- [ ] Provide the actual test output summary; failures cannot be omitted.
- [ ] Demonstrate the sample CLI against the local fixture server.
- [ ] Run one deliberately failing test and verify the expected nonzero exit code.
- [ ] Confirm no real destructive MCP tools were invoked.
- [ ] Confirm README sample commands work as written.
- [ ] Add tests for every bug fix.
- [ ] State what remains unsupported; do not add pretend implementations.

If a command cannot run in the environment, record the exact blocker and leave it incomplete.

---

## 12. Public release / GitHub strategy

### Repository creation settings

- **Owner:** Your personal GitHub account (not an organization in the first release).
- **Repository name:** `mcp-contractlab` (verify repository-name availability at creation).
- **Visibility:** Public.
- **Description:** `A deterministic behavior-contract test runner for MCP tools. Catch breaking changes before your agents do.`
- **License:** MIT.
- **Initial branch:** `main`.
- **Topics:** `mcp`, `model-context-protocol`, `testing`, `contract-testing`, `typescript`, `cli`, `github-actions`, `developer-tools`.
- **Feature focus:** Verified CLI quick start, example failing test, CI badge, clear API docs, changelog.

### README demo storyboard

Show a 15–30-second terminal recording or GIF **after it truly works**:

1. Start with a passing MCP tool test.
2. Change the demo tool's response or remove an expected field.
3. Re-run `mcpcl test` and show a precise, readable failure.
4. Revert the change; show that tests pass again.
5. Show GitHub Actions failing on a deliberate breaking change.

**Never fabricate performance figures, stars, users, downloads or benchmark results.**

### Success metrics to track (not promises)

- External users who successfully complete the quick start.
- Non-author bug reports and pull requests.
- Confirmed bugs found in real MCP Server updates.
- Repeated usage in GitHub Actions.
- Accuracy of breaking-change classification on labeled test fixtures.
- GitHub Star trend, secondary to actual user retention.

---

## 13. Up-to-date upstream references to consult

- MCP 2026-07-28 specification: https://modelcontextprotocol.io/specification/2026-07-28
- MCP TypeScript SDK v2 documentation: https://ts.sdk.modelcontextprotocol.io/v2/
- MCP official conformance suite: https://github.com/modelcontextprotocol/conformance
- MCP Inspector: https://github.com/modelcontextprotocol/inspector
- mcpward: https://github.com/TsvetanG2/mcpward
- MCPLint: https://pypi.org/project/mcplint-cli/
- JSON Schema 2020-12: https://json-schema.org/draft/2020-12

At development time, re-check upstream docs, SDK versions, and package-name availability instead of assuming those stay unchanged.

---

## 14. FIRST CODEX TASK — paste this as the first Codex instruction

```text
You are the lead software engineer of a new public GitHub project named
MCP ContractLab (repository: mcp-contractlab).

Read CODEX_BUILD_PLAN.md completely and use it as the product specification.
Your immediate assignment is PHASE 0 ONLY. Do NOT attempt later phases.

Constraints:
- CPU-only in Codex Cloud; no GPU, LLM API, paid services or database.
- Node.js 22+, TypeScript strict mode, official MCP TypeScript SDK v2.
- Target MCP protocol 2026-07-28, not legacy v1 initialize/session semantics.
- Prefer simple, maintainable, strongly tested code.
- Do not execute untrusted tools or make unsafe network calls.
- Add a real working SDK-v2 stdio MCP example server plus smoke test.
- Configure npm build, lint, typecheck, tests and GitHub Actions.
- Write an English-first public README and clear AGENTS.md.
- Do not implement fake / placeholder features just to check off tasks.

First inspect the repo, verify the SDK v2 API against official documentation
and installed types, then implement Phase 0 incrementally.

When done, run every available validation command and summarize:
1. Files added or changed;
2. Commands run and actual results;
3. A minimal working demo;
4. Outstanding issues and risks;
5. The precise next Phase 1 task list.

If any test fails or environment dependency is unavailable, report it rather
than claiming completion.
```

---

## 15. Future Codex continuation rule

When Phase 0 is truly accepted, use this instruction for follow-ups (replace `N` only after verifying the prior phase):

```text
Continue MCP ContractLab according to CODEX_BUILD_PLAN.md.
Implement PHASE N ONLY. Review prior code and tests first, then make the
smallest reviewable changes that meet this phase's acceptance criteria.
Run the complete test/typecheck/lint/build checks, provide actual results,
and do not implement later phases without explicit approval.
```

**Owner's final release gate:** Do not describe the repository as production-ready until a separate tester can install it on a clean machine and reliably reproduce both a passing case and an intentionally failing case.
