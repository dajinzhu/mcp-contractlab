import { validateSvg } from './presentation-lib.mjs';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
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
  });
  const page = await context.newPage();
  for (const [source, output, width, height] of [
    ['logo-icon', 'logo-icon-32', 32, 32],
    ['logo-icon', 'logo-icon-64', 64, 64],
    ['logo-icon', 'logo-icon-256', 256, 256],
    ['logo-icon', 'logo-icon', 512, 512],
    ['logo-horizontal', 'logo-horizontal', 840, 224],
    ['logo-dark', 'logo-dark', 840, 224],
  ]) {
    let svg = await readFile(`assets/brand/${source}.svg`, 'utf8');
    validateSvg(svg);
    svg = svg.replace(
      /width="\d+" height="\d+"/,
      `width="${width}" height="${height}"`,
    );
    await page.setViewportSize({ width, height });
    await page.setContent(
      `<html><head><style>body{margin:0;background:transparent}</style></head><body>${svg}</body></html>`,
    );
    await page.locator('svg').screenshot({
      path: resolve(`assets/brand/${output}.png`),
      omitBackground: true,
    });
    console.log(`${output}.png: ${width} × ${height}`);
  }
} finally {
  await browser.close();
}
