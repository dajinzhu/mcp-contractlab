# Security boundaries

Configured stdio commands run with your OS permissions. `--allow-exec` is explicit
consent to launch that program, not a sandbox or permission to call every tool.
Only configured cases AND allowlisted tool names can be called. Tool annotations
never authorize calls. The runner does not derive arguments from traffic or execute
code from responses. No shell is used and tool calls are not automatically retried.

Use reviewed test servers in disposable environments, with read-only test
credentials. Avoid production data. No mechanism can undo external effects of an
explicitly authorized tool. Cleanup covers the directly launched server process;
uncooperative detached descendants are outside this CLI's sandbox guarantees.

Limits: configs 1 MiB; incoming messages 64 KiB; aggregate incoming message payloads
2 MiB; discarded stderr 64 KiB per run; reports 4 MiB. Schema workers have 64 MiB
old-generation and 2 MiB stack limits and a 2-second deadline. External schema refs
are not fetched. Runs have a capped overall deadline of five minutes in addition
to connection and per-call limits. SIGINT and SIGTERM abort requests and clean up
the server using the official SDK's escalating stdin/SIGTERM/SIGKILL shutdown.

Server stderr is consumed and discarded, never printed. Reports exclude raw tool
results unless selected by a failing assertion; selected values are bounded and
redacted by common credential key/token patterns and known explicitly injected
credential values. Assertions compare raw values before redaction. These heuristics
cannot identify every possible secret, so do not place sensitive data in fixtures,
case IDs or nonstandard credential fields. Reports are written with mode 0600 when
newly created. Existing file permissions are not changed.

Only protocol 2026-07-28 and local stdio are currently supported. No arbitrary HTTP
requests, OAuth, automatic baseline updates, package publication or external user
contact occur as part of contract tests.
