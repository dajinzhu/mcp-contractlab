# Installation — future public beta draft

[English](installation.en.md) · [简体中文](installation.zh-CN.md)

**NOT PUBLISHED. Do not run the future npm commands below today.** The package is
private. Publication needs a separate approved release PR; this document does not
claim the namespace, ownership, availability or production readiness.

## Available now: reviewed source or local candidate

Requires Node >=22.13.0; Linux Node 22/24 are validated by CI. The product
targets MCP 2026-07-28 only; older protocol fallback is not implemented. For source installation,
follow the [current README](../../README.md). Build and create the candidate using
the [release-candidate workflow](README.md), then verify the downloaded SHA-256
against `SHA256SUMS` from the same CI artifact.

```sh
npm install --prefix ./mcpcl-consumer --ignore-scripts --no-audit --no-fund /absolute/path/to/mcp-contractlab-0.1.0-beta.1.tgz
./mcpcl-consumer/node_modules/.bin/mcpcl --version
./mcpcl-consumer/node_modules/.bin/mcpcl --help
./mcpcl-consumer/node_modules/.bin/mcpcl --lang zh-CN --help
```

The hardened install disables package scripts. CI also validates a clean,
locked, offline default-lifecycle reinstall after confirming no install hooks in
the resolved graph. Consumer dependencies must be downloaded/cached first.

## Future only: after approved publication is independently confirmed

The proposed first beta version is `0.1.0-beta.1`, distributed under the `beta` tag,
not automatically promoted to `latest`. Recheck the actual version, ownership,
license attribution and provenance before using these commands:

```sh
npm install --global mcp-contractlab@0.1.0-beta.1
mcpcl --version
mcpcl --lang zh-CN --help
```

These commands are a release draft, not a working installation promise. After
publication, users should see the correct version, CLI bin and attestations on the
actual npm entry. Do not replace source-only README instructions before that check.

## Your first contract

From a reviewed source checkout, current examples are available now:

```sh
npm run cli -- test -c examples/mcpcl.config.yaml --allow-exec
npm run cli -- test -c examples/mcpcl.broken.yaml --allow-exec
npm run cli -- test -c examples/mcpcl.config.yaml
```

Expected exits are 0 (three passed), 1 (three deliberately failed), and 3 (blocked).
For your own server, copy and review the config template, command and explicit tool
allowlist. Do not copy consent blindly. `inspect` discovers without calling tools,
but launching stdio still needs process consent. HTTP needs separate exact endpoint
and host authorization; OAuth and legacy fallback are not implemented.

HTML requires `--report html --output NEW_PATH`, works offline and preserves the
suite exit; file/report failures exit 2. Do not overwrite an existing report.
JSON/JUnit and snapshots stay machine-stable. Consent does not sandbox programs;
use disposable environments and harmless credentials. [Security](../security.md).
