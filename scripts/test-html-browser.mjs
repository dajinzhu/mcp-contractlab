import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { URL, pathToFileURL } from 'node:url';
import process from 'node:process';
import console from 'node:console';
import { htmlReport } from '../dist/src/reports/html.js';
import { makeReport } from '../dist/src/runner/run-suite.js';
const execute = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), 'mcpcl-html-browser-'));
const screenshotDirectory = resolve(
  process.env.MCPCL_SCREENSHOTS || '/tmp/mcpcl-html-screenshots',
);
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  headless: true,
});
const failures = [];
const requests = [];
const routedRequests = [];
try {
  await execute(
    process.execPath,
    ['scripts/generate-html-examples.mjs', '--output', directory],
    { timeout: 30000 },
  );
  await mkdir(screenshotDirectory, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    colorScheme: 'light',
    offline: true,
  });
  // Managed cloud Chromium may forbid file: navigation. The optional local HTTP
  // URL is fulfilled from disk via CDP, without starting a server or going online.
  // CI uses the default file: path with Playwright's Chromium.
  const useHttp = process.env.MCPCL_BROWSER_HTTP === '1';
  const navigationUrl = (name) =>
    useHttp
      ? `http://localhost:31460/${name}.html`
      : pathToFileURL(join(directory, name + '.html')).href;
  await context.route('**/*', async (route) => {
    const request = route.request();
    if (
      useHttp &&
      request.isNavigationRequest() &&
      /^http:\/\/localhost:31460\/[a-z-]+\.html$/.test(request.url())
    ) {
      const name = new URL(request.url()).pathname.slice(1);
      return route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: await readFile(join(directory, name)),
      });
    }
    if (
      !useHttp &&
      request.isNavigationRequest() &&
      request.url().startsWith(pathToFileURL(directory + '/').href)
    )
      return route.continue();
    routedRequests.push(request.url());
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('request', (request) => {
    if (!request.isNavigationRequest() && !request.url().startsWith('file:'))
      requests.push(request.url());
  });
  const open = async (name) => {
    await page.goto(navigationUrl(name));
    await page.waitForFunction(
      () =>
        globalThis.document
          .getElementById('search')
          .getAttribute('placeholder') !== null,
    );
  };
  const visible = () => page.locator('.case:not([hidden])').count();
  const overflow = () =>
    page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
    );
  await open('passed');
  assert.equal(await page.locator('#exit-code').textContent(), '0');
  assert.equal(await visible(), 3);
  assert.equal(await page.locator('[data-count=passed]').textContent(), '3');
  assert.equal(await overflow(), false);
  await page.screenshot({
    path: join(screenshotDirectory, 'passed-desktop-light.png'),
    fullPage: true,
  });
  const lightBackground = await page
    .locator('body')
    .evaluate((node) => globalThis.getComputedStyle(node).backgroundColor);
  await page.locator('#theme').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.notEqual(
    await page
      .locator('body')
      .evaluate((node) => globalThis.getComputedStyle(node).backgroundColor),
    lightBackground,
  );
  await page.locator('#theme').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.locator('#language').selectOption('zh-CN');
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  assert.equal(
    await page.locator('#search').getAttribute('aria-label'),
    '搜索用例、工具或诊断',
  );
  assert.equal(await page.locator('h1').innerText(), '契约测试报告');
  assert.equal(
    await page.locator('.metrics').getAttribute('aria-labelledby'),
    'report-title',
  );
  assert.equal(await page.locator('#report-title').innerText(), '契约测试报告');
  await page.locator('[data-filter=failed]').click();
  assert.equal(await visible(), 0);
  assert.equal(await page.locator('#empty').isVisible(), true);
  await page.locator('[data-filter=all]').click();
  await page.locator('#search').fill('sum-zero');
  assert.equal(await visible(), 1);
  await page.locator('#search').fill('no-such-case');
  assert.equal(await visible(), 0);
  await page.locator('#search').fill('');
  assert.equal(await visible(), 3);
  await open('failed');
  assert.equal(await page.locator('#exit-code').textContent(), '1');
  assert.equal(await page.locator('[data-count=failed]').textContent(), '3');
  assert.equal(await page.locator('.case[open]').count(), 3);
  await page.locator('#theme').click();
  await page.screenshot({
    path: join(screenshotDirectory, 'failed-desktop-dark.png'),
    fullPage: true,
  });
  await page.locator('#language').selectOption('zh-CN');
  assert.match(await page.locator('.case-body').first().innerText(), /预期/);
  await page.locator('#search').fill('预期');
  assert.equal(await visible(), 3);
  await page.locator('#language').selectOption('en');
  assert.equal(await visible(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await open('blocked');
  assert.equal(await page.locator('#exit-code').textContent(), '3');
  assert.match(await page.locator('.banner').innerText(), /安全策略已阻止执行/);
  assert.equal(await page.locator('.coverage-unknown').count(), 1);
  assert.equal(await overflow(), false);
  await page.screenshot({
    path: join(screenshotDirectory, 'blocked-mobile-zh.png'),
    fullPage: true,
  });
  await open('incomplete');
  assert.equal(await page.locator('#exit-code').textContent(), '2');
  assert.equal(await page.locator('[data-count=unrun]').textContent(), '1');
  assert.match(
    await page.locator('.banner').innerText(),
    /Execution incomplete/,
  );

  // Browser threat test: adversarial values are generated as inert text, not markup.
  const attack =
    '</script><script>globalThis.pwned=1</script><img src="https://attacker.invalid/pixel" onerror="globalThis.pwned=2"><svg onload="globalThis.pwned=3"><a href="javascript:alert(1)">中文 & null</a>';
  const report = makeReport(
    [
      {
        id: attack,
        tool: attack,
        status: 'failed',
        diagnostics: [attack, 'null', '(missing)'],
      },
    ],
    1,
    [attack],
  );
  report.coverage = {
    discoveryComplete: true,
    advertisedTools: [attack],
    attemptedTools: [],
    completedTools: [],
    untestedTools: [attack],
    enumBranches: [
      { tool: attack, path: '/' + attack, total: 2, observed: [] },
    ],
    limitations: [attack],
  };
  const adversarial = join(directory, 'adversarial.html');
  await writeFile(adversarial, htmlReport(report, 'zh-CN'));
  await open('adversarial');
  assert.equal(await page.locator('img,svg,a,iframe,form,base').count(), 0);
  assert.equal(await page.evaluate(() => globalThis.pwned), undefined);
  assert.equal(await page.locator('.case-id').textContent(), attack);
  assert.equal(await overflow(), false);
  await page.locator('#search').fill('中文');
  assert.equal(await visible(), 1);
  await page.locator('#language').selectOption('en');
  assert.equal(await page.locator('.case-id').textContent(), attack);
  assert.deepEqual(
    requests,
    [],
    'Generated reports must make no network requests',
  );
  // Demonstrate that the CSP also blocks an injected script, even if escaping regresses.
  const violations = [];
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy'))
      violations.push(message.text());
  });
  const cspProbe = (await readFile(adversarial, 'utf8')).replace(
    '</body>',
    '<script>globalThis.cspBypassed=true</script><img src="https://attacker.invalid/csp-probe"></body>',
  );
  await writeFile(join(directory, 'csp-probe.html'), cspProbe);
  await open('csp-probe');
  assert.equal(await page.evaluate(() => globalThis.cspBypassed), undefined);
  assert(violations.length >= 1, 'Expected an enforced CSP violation');
  assert(
    violations.some((text) => text.includes('img-src')),
    'Expected image CSP violation',
  );
  assert.deepEqual(
    routedRequests,
    [],
    'CSP must stop the injected image before networking',
  );
  assert.deepEqual(failures, [], 'Browser scripts must run without errors');
  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    offline: true,
    colorScheme: 'dark',
  });
  const staticPage = await noJs.newPage();
  if (useHttp)
    await noJs.route('http://localhost:31460/failed.html', async (route) =>
      route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: await readFile(join(directory, 'failed.html')),
      }),
    );
  await staticPage.goto(navigationUrl('failed'));
  assert.equal(await staticPage.locator('#exit-code').textContent(), '1');
  assert.equal(await staticPage.locator('.case[open]').count(), 3);
  assert.match(
    await staticPage.locator('noscript').innerText(),
    /Without JavaScript/,
  );
  await noJs.close();
  await context.close();
  console.log(
    'HTML browser checks passed: offline controls, themes, EN/ZH, filtering, responsive layout, no-JS, adversarial values, enforced CSP, zero network requests.',
  );
  console.log(`Real fixture screenshots: ${screenshotDirectory}`);
} finally {
  await browser.close();
  await rm(directory, { recursive: true, force: true });
}
