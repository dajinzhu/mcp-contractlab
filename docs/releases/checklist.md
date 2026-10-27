# Maintainer release checklist — draft, not approval

The present assessment is **NO-GO**. Keep `private: true` throughout this PR.
These boxes require actual evidence, not an automated transition to publication.

- [ ] Recheck the public npm entry immediately before release; confirm the intended
      maintainer identity, namespace/publishing authority, naming confusion and version.
      A 404 is not a reservation. Do not commit authentication/configuration material.
- [ ] Review original runtime license/notice texts and the SDK's transition terms;
      confirm that required attribution ships. Independently maintained test servers
      are not bundled, and their missing tarball license needs separate attention.
- [ ] Rerun runtime/full vulnerability scans; review advisories and audit availability,
      not merely the command's exit status. Record UTC time and exact lockfile.
- [ ] Check a fresh candidate inventory, bin/shebang, Node engine range, dependencies,
      compressed/unpacked size, allowlist and absence of tests/caches/secrets.
- [ ] Require exact-head Node 22/24 and Chromium CI, complete package consumer matrix,
      immutable archive SHA-256 and stable snapshot/machine-output observations.
- [ ] Have a separate human reproduce a clean installation, pass/fail/blocked runs,
      Chinese help and offline report. Automated consumers do not satisfy this item.
- [ ] Obtain an owner-controlled disposable public HTTPS endpoint and explicit test
      authorization; validate modern MCP/TLS/DNS interoperability without production data.
      Do not replace this evidence with mocked network tests.
- [ ] Review npm trusted-publisher binding, repository/workflow/environment identity,
      protected environment reviewers, branch/tag policy and provenance verification.
      Configure them outside this PR only after explicit approval.
- [ ] Approve a separate release PR removing `private: true` and finalizing version,
      dist-tag and release notes. The first beta should use `beta`, not silently `latest`.
- [ ] Only after explicit final approval: publish through the reviewed process, verify
      the public entry, bin, artifact/provenance and independent installation, then migrate
      READMEs. Tag/release creation is a separate authorized action, not part of this PR.

No checklist command writes npm credentials, requests tokens or publishes anything.
A green build proves tested behavior, not legal approval or production readiness.
