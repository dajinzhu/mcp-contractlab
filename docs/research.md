# Reproducible research evidence

## Experiment and measured scope

On 2026-10-24 the script in scripts/benchmark.mjs ran eight labeled contract cases
with two repetitions each: four normal controls and four explicit synthetic server
fault behaviors. The independent public fixture is Everything server 2.0.0's echo
control; the faults live in our deterministic local negative server. The faults
are wrong numeric value, wrong output type, missing structured output and unexpected
tool error. They are behavioral fixture mutations, not an AST mutation framework.

The checked-in raw results are benchmarks/results-2026-10-24.json. The observed
confusion counts were TP=8, TN=8, FP=0, FN=0 over 16 executions. Repetitions are not
independent incidents; there are only four distinct faults. Precision/recall of 1
on this dataset is not a real-world accuracy estimate or superiority claim.

Durations are measured wall-clock milliseconds for the entire CLI invocation,
including runtime/server startup, schema workers, assertions and cleanup. They do
not isolate runner overhead. The artifact records runtime/platform/CPU information,
source and lockfile fingerprints and each observation. No GPU, model, paid service,
account, remote MCP endpoint or production dataset is used.

Reproduce from the repository with Node 24:

```sh
npm ci
npm run build
npm run fixture:install
npm run benchmark -- --output /tmp/mcpcl-benchmark.json
```

Any unexpected exit aborts the experiment instead of silently dropping a sample.
CI reruns it on Node 24 and writes a temporary report; it never rewrites tracked
results or contract baselines. The main CLI's Node 22 support is separately tested.

## Coverage boundaries

The JSON report separates advertised tools, request attempts and completed calls.
Only direct root input-property enums with at most 32 choices have observed index
coverage. Complex schema branch and semantic behavior coverage remain unmeasured.
No invented denominator or broad coverage percentage is exposed.

## Differentiation and missing evidence

The executable examples demonstrate explicit dual authorization, JSON Pointer
assertions, conservative interface gates and bounded local execution. They do not
show that competitors lack these capabilities or that this project performs better.
See competitive-notes.md, which documents substantial existing feature overlap.

Public-host HTTP/TLS interoperability and external-user feedback remain outstanding.
No external case study or user endorsement is claimed. The feedback materials in
feedback.md are a draft; no contacts have been messaged.
