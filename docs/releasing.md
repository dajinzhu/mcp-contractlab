# Beta release preparation

For the fresh Phase 6 audit, candidate/consumer workflow and explicit NO-GO gates,
see [release readiness](releases/README.md). The older observations below are dated
historical context, not a namespace reservation or current publication approval.

The prepared version is **0.1.0-beta.1**. `private: true` intentionally prevents npm
publication. No package, Git tag or GitHub release is published by this workflow.
Confirm the package name, version, publishing identity and trusted-publishing/2FA
configuration with the maintainer before removing this guard or publishing.

The registry returned 404 for `mcp-contractlab` on 2026-10-24; that only means no
public package was found at query time, not guaranteed ownership or reservation.
MCPLint already uses “ContractLab” as a feature name. Confirm naming before release.
Our own source is MIT; official SDK dependencies are independently licensed.

Before publishing:

1. Run the complete README quality checks and Node 22/24 CI.
2. Run `npm run fixture:install && npm run test:independent` on Node 24.
3. Run `npm run test:package`, inspect `npm pack --dry-run --json`, and review package
   contents, licenses, registry authentication and dependency audit findings.
4. Obtain a separate tester's successful clean install and intentionally failing
   case reproduction. Do not describe the project as production-ready without it.
5. Prepare a version tag and changelog-backed release notes after confirmation.
   Use provenance and trusted publishing where supported; never put tokens in files.

The pack allowlist includes only runtime/example dist files, YAML examples and
public docs. Tests, node_modules, caches and credential files are excluded.
`prepack` rebuilds from source. npm installation is validated with lifecycle scripts
disabled in an empty consumer directory. The installed binary's version must match
the manifest, three good contracts must pass and three bad contracts must exit 1.

## GitHub Actions consumer example

```yaml
steps:
  - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803
  - uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38
    with:
      node-version: 24
  - run: npm ci
  - run: npm run build
  - run: npm run cli -- test -c examples/mcpcl.config.yaml --allow-exec --report junit --output report.xml
```

Until publication, use a reviewed pinned repository checkout or verified local
release tarball. Do not document `npx mcp-contractlab` as available on npm.

## Independent fixture

`@modelcontextprotocol/server-everything@2.0.0` is installed only in the isolated
Node-24 fixture project, with a committed lockfile. Its published tarball integrity
was inspected and it uses the official modern stdio serving API. Only `echo` is
called, with fixed harmless input; no other advertised tool is auto-called.
The package declares `SEE LICENSE IN LICENSE` but omits LICENSE from its tarball.
Upstream source LICENSE (blob 4a93985763241755401a10678395303de4e720ba) documents
an Apache-2.0/MIT transition and CC-BY-4.0 for docs. We do not redistribute that
fixture or vendor its source in our tarball. Consult
https://github.com/modelcontextprotocol/servers/blob/main/LICENSE before reuse.
Its transitive server-legacy helper emits a deprecation notice; our client remains
pinned to the modern protocol and never falls back to a legacy handshake.
