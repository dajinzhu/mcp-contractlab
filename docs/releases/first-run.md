# First-run review and README migration

## What works now

A source checkout offers working, reviewed examples. Copy the config and explicitly
review `server.command`, args/cwd, exact cases and `safety.allowToolCalls`; select
stdio or an authorized HTTPS endpoint deliberately. Run inspect for definitions,
then pass a harmless case, an intentional wrong expectation and a blocked run.
HTML uses a new filename. The installed tarball contains examples and both READMEs.

Friction observed during automated review: templates refer to their bundled example
server and relative cwd; a user must deliberately replace both when testing their
own server. Installing a private candidate is less obvious than a published CLI.
No external users have reported friction to us; this is an engineering observation,
not fabricated user research.

## Recommended separate follow-up PR

A small `mcpcl init` or `mcpcl config template` workflow would help. **Not implemented
or advertised as available now.** Proposed requirements:

- Write only to an explicit new path; refuse file/alias overwrite.
- Do not launch processes, discover endpoints, infer tool permission or call tools.
- Generate an inert versioned template with empty allowlist and explicit edit steps.
- Preserve consent gates; do not add --allow-exec or --allow-http automatically.
- Support typed EN/ZH guidance, deterministic template output and regression tests.
- Avoid hidden accounts, environment capture, package installation or network calls.

Review CLI naming and template usability separately to keep release audit scope small.

## After an actually approved and verified public beta

1. Confirm the npm entry/version/dist-tag and verified provenance from an independent
   consumer. Save evidence; a prepared tarball is not a public release.
2. Update English and Chinese READMEs in the same PR, replacing “unpublished” only
   after it is false. Promote the reviewed future install draft, not an untested command.
3. Keep source/development instructions and all safety warnings. Do not claim old
   protocol support, OAuth, arbitrary schema compatibility, public adoption or production readiness.
4. Link the exact release notes/changelog and retain local fixture provenance.
5. Keep the metadata suggestions in [project overview](../project-overview.md)
   truthful; owner approval is needed before changing repository settings.
