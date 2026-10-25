import { Buffer } from 'node:buffer';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import process from 'node:process';
import console from 'node:console';
import { validateSvg } from './presentation-lib.mjs';
const data = async (name) => {
  const svg = await readFile(`assets/brand/${name}.svg`, 'utf8');
  validateSvg(svg);
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
};
const icon =
  'data:image/png;base64,' +
  (await readFile('assets/brand/logo-icon-32.png')).toString('base64');
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  headless: true,
});
try {
  const context = await browser.newContext({
    offline: true,
    javaScriptEnabled: false,
    viewport: { width: 1024, height: 480 },
  });
  const requests = [];
  await context.route('**/*', (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  const page = await context.newPage();
  await page.setContent(
    `<html><head><style>body{margin:0;font:13px Arial,sans-serif}section{height:240px;display:flex;align-items:center;justify-content:space-between;padding:36px 56px;box-sizing:border-box;background:#f5f7fa;color:#526079}.dark{background:#101827;color:#a6b5ce}aside{text-align:center;min-width:180px}img{display:block}aside img{margin:0 auto 18px}.wordmark{width:420px;height:112px}small{display:block;margin-top:12px;font-size:11px}</style></head><body><section><div><img class="wordmark" src="${await data('logo-horizontal')}" alt="Light wordmark"><small>LIGHT CANVAS · ORIGINAL VECTOR IDENTITY</small></div><aside><img src="${icon}" width="32" height="32" alt="Native 32 pixel icon on light">32 × 32 · native size</aside></section><section class="dark"><div><img class="wordmark" src="${await data('logo-dark')}" alt="Dark wordmark"><small>DARK CANVAS · SAME MARK, SHARED REPORT PALETTE</small></div><aside><img src="${icon}" width="32" height="32" alt="Native 32 pixel icon on dark">32 × 32 · native size</aside></section></body></html>`,
  );
  assert.equal(await page.locator('img').count(), 4);
  assert(
    await page
      .locator('img')
      .evaluateAll((images) =>
        images.every((image) => image.complete && image.naturalWidth > 0),
      ),
  );
  for (const image of await page.locator('aside img').all())
    assert.equal(
      await image.evaluate((element) => element.getBoundingClientRect().width),
      32,
    );
  assert.deepEqual(requests, []);
  await page.screenshot({
    path: process.env.MCPCL_BRAND_PREVIEW || '/tmp/mcpcl-brand-preview.png',
  });
  console.log(
    'Brand browser checks passed: light/dark wordmarks, native 32px icons, all images decoded, offline and no JavaScript.',
  );
} finally {
  await browser.close();
}
