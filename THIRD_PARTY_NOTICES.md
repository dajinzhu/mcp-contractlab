# Third-party runtime notices

MCP ContractLab itself remains MIT-licensed. These separately installed runtime
dependencies retain their own licenses; this inventory does not relicense them.
Original license/notice texts, including copyright notices, are preserved verbatim
in the linked files. Source: the committed npm lockfile and installed package files.

**Review gate:** the MCP SDK declares Apache-2.0, but its actual license text
describes an Apache/MIT transition and CC-BY-4.0 documentation. A maintainer must
review applicable obligations before release; the table is not a legal clearance.
Test-only independent fixtures are not redistributed in this tarball; see
[their provenance and limitations](docs/releases/independent-validation.md).

| Package                              | Declared license | Original texts                                                                                          |
| ------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `@modelcontextprotocol/client@2.4.0` | Apache-2.0       | [LICENSE](third-party-licenses/0382b0057770ca05e9c350a50aa3b1c1fea84da0bc81d723bf00b9aa841be58a.txt)    |
| `@modelcontextprotocol/core@2.4.0`   | Apache-2.0       | [LICENSE](third-party-licenses/0382b0057770ca05e9c350a50aa3b1c1fea84da0bc81d723bf00b9aa841be58a.txt)    |
| `@modelcontextprotocol/server@2.4.0` | Apache-2.0       | [LICENSE](third-party-licenses/0382b0057770ca05e9c350a50aa3b1c1fea84da0bc81d723bf00b9aa841be58a.txt)    |
| `ajv@8.20.0`                         | MIT              | [LICENSE](third-party-licenses/a05350a88e318e4f5f2c2a1ff1e2e88daa4dd38e6e78b71cccae422bdc762cc3.txt)    |
| `commander@15.0.0`                   | MIT              | [LICENSE](third-party-licenses/04512a63dce4d2d506ad612dc0bd7681ccf6e3655f7b6eaef7dfac8323d1ec0b.txt)    |
| `cross-spawn@7.0.6`                  | MIT              | [LICENSE](third-party-licenses/aaa78451b6fecd1b9c4594c796c133c0e90cad100372ff8bc6de615e9ef9adf1.txt)    |
| `eventsource@3.0.7`                  | MIT              | [LICENSE](third-party-licenses/f683a72ffe6a9675b5507af22fe0f448d8c8de3da1e14f139d370a7e6a54a23e.txt)    |
| `eventsource-parser@3.1.1`           | MIT              | [LICENSE](third-party-licenses/835eb611a23301b27115ca1be9f754c876e643ceb7fe63049c6b50609a1cafeb.txt)    |
| `fast-deep-equal@3.1.3`              | MIT              | [LICENSE](third-party-licenses/7bf9b2de73a6b356761c948d0e9eeb4be6c1270bd04c79cd489c1e400ffdfc1a.txt)    |
| `fast-uri@3.1.9`                     | BSD-3-Clause     | [LICENSE](third-party-licenses/b010b0dfdfdb23d7396e03b82cd4621fc9bb8f95d6b0aea70b9c24e12074c786.txt)    |
| `ipaddr.js@2.5.0`                    | MIT              | [LICENSE](third-party-licenses/62568a2d1337b77171ecca9db10579163446de1ba6151678e81f06cdc199971b.txt)    |
| `isexe@2.0.0`                        | ISC              | [LICENSE](third-party-licenses/4ec3d4c66cd87f5c8d8ad911b10f99bf27cb00cdfcff82621956e379186b016b.txt)    |
| `jose@6.2.13`                        | MIT              | [LICENSE.md](third-party-licenses/8078b0829d6c3e9ecde2f003e1966e4cad3efc6e7a640efbab0313cc166b1af1.txt) |
| `json-schema-traverse@1.0.0`         | MIT              | [LICENSE](third-party-licenses/7bf9b2de73a6b356761c948d0e9eeb4be6c1270bd04c79cd489c1e400ffdfc1a.txt)    |
| `path-key@3.1.1`                     | MIT              | [license](third-party-licenses/48da2f39e100d4085767e94966b43f4fa95ff6a0698fba57ed460914e35f94a0.txt)    |
| `pkce-challenge@5.0.1`               | MIT              | [LICENSE](third-party-licenses/feb87a2e0c305de3464cc44077da5393c52d8ca6362d37427157d04ec6f4510d.txt)    |
| `require-from-string@2.0.2`          | MIT              | [license](third-party-licenses/6ee0feb1f6ef996ff5a68600f8cf98909cf412d39ef3cdceaefd87d636fa1b7f.txt)    |
| `shebang-command@2.0.0`              | MIT              | [license](third-party-licenses/69dee148a2cc470554dfa7142e830662062394d0fe67cddd379aba90dc60d6b3.txt)    |
| `shebang-regex@3.0.0`                | MIT              | [license](third-party-licenses/48da2f39e100d4085767e94966b43f4fa95ff6a0698fba57ed460914e35f94a0.txt)    |
| `undici@7.30.1`                      | MIT              | [LICENSE](third-party-licenses/a6db8096b2707bc0102d256917d4d33f298ba36d8c3f25de067a2b5bb379db27.txt)    |
| `which@2.0.2`                        | ISC              | [LICENSE](third-party-licenses/4ec3d4c66cd87f5c8d8ad911b10f99bf27cb00cdfcff82621956e379186b016b.txt)    |
| `yaml@2.9.1`                         | ISC              | [LICENSE](third-party-licenses/5bba27375d93e9119f76c1015f7672cf9ad5f70952296e0842fb2243d6376869.txt)    |
| `zod@4.6.7`                          | MIT              | [LICENSE](third-party-licenses/3f1189b28e3866e0d979968d466b78f813f76827cfdca1fbb124cc0a5c8841f8.txt)    |

Regenerate with `npm run release:notices` after a clean `npm ci`. Full package
versions, hashes and install-hook observations are in
[runtime-inventory.json](docs/releases/runtime-inventory.json).
No install hooks were added to the project. A zero-vulnerability scan is not a
guarantee of safety; review vulnerability and supply-chain evidence separately.
