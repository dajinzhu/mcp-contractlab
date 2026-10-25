import { chromium } from 'playwright';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import assert from 'node:assert/strict';
import console from 'node:console';
import { prepareCandidate } from './candidate.mjs';
import { verifyConsumer } from './consumer.mjs';
const directory = await mkdtemp(join(tmpdir(), 'mcpcl-packaged-browser-'));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  headless: true,
});
try {
  const tarball = await prepareCandidate(directory);
  const reports = join(directory, 'consumer');
  await verifyConsumer(tarball, reports);
  const context = await browser.newContext({ offline: true });
  const network = [];
  await context.route('**/*', async (route) => {
    const request = route.request();
    const match = request
      .url()
      .match(/^http:\/\/localhost:31460\/(passed|failed|blocked)-zh\.html$/);
    if (
      process.env.MCPCL_BROWSER_HTTP === '1' &&
      request.isNavigationRequest() &&
      match
    )
      return route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: await readFile(join(reports, match[1] + '-zh.html')),
      });
    if (
      request.isNavigationRequest() &&
      request.url().startsWith(pathToFileURL(reports + '/').href)
    )
      return route.continue();
    network.push(request.url());
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const [name, code] of [
    ['passed', 0],
    ['failed', 1],
    ['blocked', 3],
  ]) {
    const url =
      process.env.MCPCL_BROWSER_HTTP === '1'
        ? `http://localhost:31460/${name}-zh.html`
        : pathToFileURL(join(reports, name + '-zh.html')).href;
    await page.goto(url);
    assert.equal(await page.locator('#exit-code').textContent(), String(code));
    assert.equal(await page.locator('h1').innerText(), '契约测试报告');
    await page.locator('#language').selectOption('en');
    assert.equal(await page.locator('h1').innerText(), 'Contract report');
    await page.locator('#theme').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.locator('.case').count(), 3);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(network, []);
  console.log(
    'Installed-tarball HTML browser checks passed: pass/fail/blocked, offline, EN/ZH and theme, zero network requests.',
  );
} finally {
  await browser.close();
  await rm(directory, { recursive: true, force: true });
}
