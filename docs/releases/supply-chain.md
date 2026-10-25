# Proposed release supply chain — inactive design

Current CI has `contents: read` and uploads candidate artifacts only. There is **no**
publishing job, npm credential, OIDC publisher binding, version tag or release here.
The package stays private. The following is a design for a separately approved PR.

1. Confirm publisher/namespace ownership through the maintainer's own npm account.
   Bootstrap requirements for a new name must be checked against current npm policy;
   do not assume trusted publishing itself reserves or creates the package name.
2. Bind npm trusted publishing to this exact GitHub repository, future workflow and
   protected `npm-beta` environment. Require human reviewers; restrict releases to
   approved refs. Never use pull_request_target to publish untrusted PR source.
3. Pin checkout/setup actions to reviewed full SHAs, disable persisted checkout
   credentials, select supported Node/npm versions and keep permission scope minimal.
4. On the future **publishing job only**, grant `contents: read` and `id-token: write`.
   Prefer short-lived OIDC over long-lived npm tokens. No credentials go into files,
   logs, artifacts, examples or this preparation PR.
5. Build from the approved commit and captured dependency lock. Verify the exact
   tarball/inventory/hash with the clean consumer matrix before publication.
6. Require npm provenance and verify its repository/workflow/ref binding on the
   public entry. GitHub artifact checksums are not npm provenance or signatures.
7. Use the approved beta version/dist-tag, then independently verify installation
   before changing public instructions. No automatic promotion to latest or claim
   of production readiness. Agree rollback/deprecation policy before first publish.

Illustrative permissions only; no runnable workflow or publish step is provided:

```yaml
permissions:
  contents: read
  id-token: write # future protected publishing job only, not current PR CI
# environment: npm-beta
# exact repository/workflow/ref trusted-publisher binding requires owner review
# human-approved publication/provenance step deliberately omitted
```

Consult current [npm trusted-publisher documentation](https://docs.npmjs.com/trusted-publishers/)
and [provenance documentation](https://docs.npmjs.com/generating-provenance-statements/)
before implementation. This is a proposal, not a claim those controls are configured.

## Candidate artifact limits

Current CI uploads only the generated tarball, dry-run inventory, checksums,
consumer reports/fixture outputs and sanitized audit evidence. No npm cache, process
environment, credentials, raw server stderr or npm debug logs are uploaded. Retention
is short. Actions upload is pinned to a reviewed commit and does not require adding
publishing permissions. An artifact's successful validation never grants publication.
