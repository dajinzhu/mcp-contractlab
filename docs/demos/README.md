# A real removed-tool compatibility demonstration

This example uses two checked-in, side-effect-free local implementations, both
served through the official SDK with protocol 2026-07-28. The original server
advertises `echo` and `sum`; [the after implementation](../../examples/servers/removed-sum-server.ts)
registers the same `echo` contract and no `sum`. No baseline entries are invented.

From a built checkout, using a fresh baseline path:

```sh
npm run cli -- snapshot -c examples/mcpcl.config.yaml --allow-exec --output before.snapshot.json
npm run cli -- diff -c examples/mcpcl.removed-tool.yaml --allow-exec --baseline before.snapshot.json --report console --lang en
```

The snapshot exits 0; diff exits **1** with `sum`, `BREAKING`, and `Tool removed`.
These commands discover interfaces only: neither calls tools. `diff` never rewrites
the baseline. Existing baseline replacement requires an explicit `snapshot --force`.

[removed-tool.diff.json](removed-tool.diff.json) is actual canonical CLI output,
not a manually authored expected result. Regenerate it with `npm run demo:breaking`.
The generator uses temporary paths, checks the real exit code and exact change,
then copies the result here. CI runs the generator and checks the artifact is current.

This is an interface gate demonstration, distinct from the [HTML failure example](../examples/html/failed.html),
which deliberately changes expected values while the original `sum` server still
returns its correct result. A behavior test naming the now-missing `sum` would exit
2 (unknown configured tool), not the compatibility gate's exit 1. Neither result is
a successful contract run. Complex schema changes can remain `UNKNOWN`; no universal
backward-compatibility claim is made.
