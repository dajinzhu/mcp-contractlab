# Project overview and GitHub presentation

MCP ContractLab turns explicit examples of expected MCP tool behavior into
repeatable tests and conservative interface gates. It targets maintainers and CI
reviewers who want to see what was actually called, which expectations failed,
what was blocked and what remains unmeasured. It is independent and MIT-licensed.

## Suggested repository metadata

Short description (suggestion only; not automatically applied):

> Explicit MCP behavior contracts, conservative interface gates, and secure offline bilingual reports.

Suggested topics:

`mcp`, `model-context-protocol`, `contract-testing`, `typescript`, `developer-tools`,
`testing`, `ci`, `mcp-server`

This PR provides suggested metadata, not an unreported API change to repository
settings. Only use real CI/license badges. No user counts, testimonials, downloads,
stars or benchmark claims should be invented.

## Evidence and positioning

- [Passing/failing/blocked reports](examples/html/README.md) come from actual local
  fixtures. Dark mode and language changes are presentation only, not new results.
- [Removed-tool demo](demos/README.md) compares two actual local server implementations.
- [Inspector](https://github.com/modelcontextprotocol/inspector) focuses on connecting,
  exploring and debugging, including CLI automation. The [official conformance
  suite](https://github.com/modelcontextprotocol/conformance) exercises protocol
  scenarios and requirements. ContractLab's emphasis is checked-in application
  examples and explicit call permission, not superiority or conformance certification.
- [Competitive observations](competitive-notes.md) are dated documentation readings,
  not fresh comparative benchmarks. There is substantial overlap with other tools.

## Brand provenance

[Original artwork and exports](../assets/brand/README.md) use the report's existing
navy/teal/blue palette and local system typography. No third-party mark or font file
is embedded. Existing report styling, CSP and offline behavior remain unchanged.
All project artwork is available under the unchanged MIT license. Visual originality
is not a trademark clearance; naming review remains a release gate.

## Limits and next steps

See the [roadmap](roadmap.md). The npm package is private/unpublished. Target is MCP
2026-07-28 only; no production readiness, external adoption, broad schema proof or
live public-host TLS verification is claimed. Prioritize independent reproduction,
a small number of consent-based feedback sessions, owner-controlled HTTPS testing
and reviewed release preparation before public distribution.
