# Configuration (schemaVersion 1)

Start from [the executable example](../examples/mcpcl.config.yaml). JSON is also
accepted because it is YAML. Unknown keys, duplicate YAML keys, aliases, custom
tags, duplicate case IDs and malformed pointers are rejected. Configs are limited
to 1 MiB and 1000 cases. Errors identify the field path or YAML location without
printing configuration values.

`server` requires `name`, `transport: stdio`, and `command`. `args` defaults to
`[]`; `cwd` defaults to `.` relative to the config directory; `timeoutMs` defaults
to 10000. Timeouts are integers from 1 to 60000 milliseconds. Arguments are passed
literally, without shell expansion. Executables with paths should use absolute
paths or paths relative to the resolved cwd; ordinary names use PATH.

`server.env` is an explicit list of variable names to copy from the CLI environment;
missing requested variables fail setup. It defaults to empty. The SDK additionally
inherits its documented safe platform variables such as PATH and HOME, never the
whole environment. There is no interpolation of environment values into YAML or
execution of YAML expressions.

`safety.allowToolCalls` is required and may be empty. `maxToolCalls` defaults to 10
and is an integer from 0 to 1000. `toolTimeoutMs` defaults to 5000. Every case counts
as one invocation; exceeding the configured limit or naming a non-allowlisted tool
blocks the entire run before process launch. Process consent is separate.

Each case requires unique `id`, `tool`, object `arguments` and `expect`.
`expect.isError` defaults to false; `expect.assertions` defaults to empty.
Assertions have `path`, `operator` and the following `value`:

| Operator | Value                                                 | Semantics                                          |
| -------- | ----------------------------------------------------- | -------------------------------------------------- |
| equals   | JSON value, required                                  | Deep equality; object key order does not matter    |
| exists   | Boolean, default true                                 | Whether the path exists, including explicit null   |
| type     | object, array, string, number, integer, boolean, null | JSON value type, with arrays distinct from objects |

Pointers refer to the tool result, e.g. `/structuredContent/value`. Empty pointer
means root; `~1` escapes slash and `~0` escapes tilde. Only own properties and
canonical array indices are resolved, never prototype properties or expressions.

`inspect` validates config but never enforces cases by invoking tools. `test`
preflights consent, all allowlists and budget, then discovers tools and validates
all inputs before issuing any call. If input validation fails, invalid cases fail
and other cases remain unrun. Unknown tools exit 2 without any tool invocation.

## Parameter tables (additive v1 feature)

A case may instead contain only `id`, `tool` and nonempty `rows`. Each row contains
its own `id`, `arguments` and `expect` using the same rules as an ordinary case.
The runner expands IDs as `group/row` before safety preflight. Group IDs and expanded
IDs must be unique; at most 1000 expanded cases are permitted. No interpolation or
shared executable expressions exist. See the parameterized YAML example.

## Streamable HTTP (additive v1 feature)

The server variant `transport: streamable-http` requires `name`, exact HTTPS `url`
and optional `timeoutMs` (default 10000) and `authEnv` (a variable name, never a
literal token). It rejects stdio-only command/args/cwd/env keys. The existing stdio
variant remains unchanged. `safety.allowedHttpHosts` defaults to empty and must
explicitly include the URL's canonical hostname; no wildcard matching occurs.
The complete URL fixes the path and port. Credentials, search/query and fragments
are disallowed. `--allow-http` grants endpoint consent, independently of tool calls;
`--allow-exec` does not grant network consent. Inspect/snapshot/diff still never
call tools. Test cases still require both explicit cases and allowlisted tool names.

Only no-auth and an explicitly bound Bearer variable are supported. Missing/invalid
bound credentials fail without printing values. DNS lookup is timed; every resolved
address must be public unicast, and the connector uses that checked address set.
All redirects and changes to the exact endpoint are blocked. No HTTP downgrade,
OAuth discovery, permissive private-network flag or TLS-verification bypass exists.
