# Independent upstream filesystem validation

This is a separate realistic **local document-reading workflow**, not a claim of
external users, public MCP service interoperability or human evaluation.

| Component          | Exact version / provenance                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Independent server | `@modelcontextprotocol/server-filesystem@2.0.1`                                                            |
| Upstream           | [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers), filesystem implementation |
| Tarball integrity  | `sha512-K6n1daveB54TybQECAIzSp8DYq014Xfff159OtD1zjB48PONyMcQwyfMPw8jvhZnua/Jd+R/2HcCbTC3YVc3ag==`          |
| Runtime            | Requires Node >=24; local verification Node v24.19.0, exact CI runtime in the Actions run                  |
| Protocol           | Product remains pinned to MCP 2026-07-28; no compatibility wrapper or legacy fallback                      |
| Existing control   | Everything server 2.0.0 echo test remains separate                                                         |

The isolated fixture manifest/lockfile pins this independently maintained server;
it is **not** added to product runtime dependencies or redistributed in the npm
candidate. Its package declares `SEE LICENSE IN LICENSE`, but its tarball omits the
license file. The upstream transition license must be reviewed before redistribution;
we do not vendor its implementation. See also [earlier fixture license review](../releasing.md).

## Actual authorized effects

`tests/independent/filesystem.test.ts` creates one temporary allowed directory with
one synthetic bilingual `invoice.txt`. The server receives that directory only.
Exactly two tools are allowlisted: `read_text_file` and `list_directory`; maximum
calls are 2 per run. Source review confirmed these handlers only read/list and
return content. Annotations do not grant permission. No environment-reading,
write/delete, sampling, web, production filesystem or public-host tool is authorized.

The test verifies successful content/schema expectations (exit 0), a deliberately
wrong content expectation (exit 1), and an empty allowlist (exit 3 before discovery).
File contents and directory entries must remain unchanged. Completed/attempted
coverage must contain exactly those two tools; `write_file` stays untested.
All temporary files are cleaned up. This demonstrates actual filesystem IO in an
isolated fixture, not live weather, production documents or arbitrary server safety.

```sh
npm run build
npm run fixture:install
npm run test:independent
```

The separate suite now has four tests: the existing echo control plus three
filesystem scenarios. Only Node 24 runs this suite; main packaged consumers are
independently checked on both Node 22 and 24. The upstream fixture itself is not a
production dependency and is not evidence that every upstream tool is safe.

## Public HTTPS/TLS remains unverified

No owner-controlled disposable public endpoint, hostname/certificate setup and
explicit network-test authorization was supplied. No third-party public MCP host
was probed. Existing guarded-HTTP tests use injected/in-memory networking and cannot
prove real public TLS interoperability. This remains an explicit release gate.
