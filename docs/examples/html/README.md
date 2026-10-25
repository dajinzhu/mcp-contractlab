# Actual local fixture reports

These are examples from real executions of the checked-in synthetic fixtures.
They are not live production measurements or claims about arbitrary MCP servers.
Download the HTML file (GitHub displays source), then open it in your browser.
Each file works offline and contains both languages.

| Report                        | Actual fixture                             | Observed result                                              |
| ----------------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| [Passed](passed.html)         | `examples/mcpcl.config.yaml`, with consent | 3 passed, exit 0; 1 completed tool out of 2 advertised       |
| [Failed](failed.html)         | `examples/mcpcl.broken.yaml`, with consent | 3 failed, exit 1; completed calls still fail assertions      |
| [Blocked](blocked.html)       | Passing config, without consent            | 3 blocked, exit 3; discovery and coverage unknown            |
| [Incomplete](incomplete.html) | Local `crash` fixture followed by `sum`    | 1 failed, 1 unrun, exit 2; only the crash call was attempted |

Regenerate from a built checkout with `npm run examples:html`. The generator
replaces these example artifacts only; the CLI itself refuses to overwrite an
existing HTML destination. The incomplete config is created in a temporary
directory by `scripts/generate-html-examples.mjs` and uses the compiled local
behavior fixture. No production server or arbitrary remote endpoint is invoked.

The following are unedited Chromium screenshots of those actual fixture reports.
Light/dark and language selections are view preferences; they do not change data.

![Passing fixture, desktop, light theme](screenshots/passed-desktop-light.png)

![Failing fixture, desktop, dark theme](screenshots/failed-desktop-dark.png)

![Blocked fixture, mobile, Simplified Chinese](screenshots/blocked-mobile-zh.png)

Recreate screenshots with `npm run test:browser`; they are written to
`/tmp/mcpcl-html-screenshots`. For a managed environment that forbids `file:` URLs,
`CHROMIUM_PATH=/usr/bin/chromium MCPCL_BROWSER_HTTP=1 npm run test:browser` uses a
permitted localhost URL fulfilled from disk by Playwright, without a running server
or network access. CI separately exercises direct `file:` opening with Playwright
Chromium. Browser tests are automated assertions, not pixel-perfect golden images.
