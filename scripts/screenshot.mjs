#!/usr/bin/env node
// Captura screenshots da /design-preview em desktop e mobile
import { chromium } from '/Users/jhonatan/.local/share/fnm/node-versions/v24.3.0/installation/lib/node_modules/playwright/index.mjs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = '/Users/jhonatan/Repos/Sebraiers/screenshots';
await mkdir(OUT, { recursive: true });

const URL = 'http://localhost:3000/design-preview';

const scenes = [
  { id: 'cover',         selector: 'main > section:nth-of-type(1)', fullPage: false, label: 'capa' },
  { id: 'timeline',      selector: '#demo-timeline',                 fullPage: false, label: 'timeline-demo' },
  { id: 'ranking',       selector: '#demo-ranking',                  fullPage: false, label: 'ranking-demo' },
  { id: 'tokens',        selector: '#tokens',                        fullPage: false, label: 'tokens' },
  { id: 'buttons',       selector: '#buttons',                       fullPage: false, label: 'buttons-badges' },
  { id: 'checkin',       selector: '#checkin',                       fullPage: false, label: 'checkin' },
  { id: 'podium',        selector: '#podium',                        fullPage: false, label: 'podium' },
  { id: 'full-page',     selector: null,                             fullPage: true,  label: 'pagina-completa' },
];

const viewports = [
  { id: 'desktop', width: 1440, height: 900,  deviceScaleFactor: 2 },
  { id: 'mobile',  width: 390,  height: 844,  deviceScaleFactor: 3, isMobile: true },
];

const browser = await chromium.launch();

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.isMobile ?? false,
    hasTouch: vp.isMobile ?? false,
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700); // deixa animações de stagger rolarem

  for (const scene of scenes) {
    const file = join(OUT, `${vp.id}-${scene.id}.png`);
    if (scene.selector) {
      const el = await page.$(scene.selector);
      if (!el) {
        console.warn(`[skip] selector not found: ${scene.selector} (${vp.id}/${scene.id})`);
        continue;
      }
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await el.screenshot({ path: file });
    } else {
      await page.screenshot({ path: file, fullPage: true });
    }
    console.log(`[ok] ${vp.id}/${scene.id}`);
  }

  await context.close();
}

await browser.close();
console.log('done');