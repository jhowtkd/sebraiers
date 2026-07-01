#!/usr/bin/env node
import { chromium } from '/Users/jhonatan/.local/share/fnm/node-versions/v24.3.0/installation/lib/node_modules/playwright/index.mjs';

const URL = 'http://localhost:3000/design-preview';

const browser = await chromium.launch();

// Mobile
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const card = await page.$('aside .bg-gradient-atlantico-cobalto, aside [style*="0B195F"]');
  if (card) {
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await card.screenshot({ path: '/Users/jhonatan/Repos/Sebraiers/screenshots/card-mobile.png' });
    console.log('mobile card captured');
  }
  await ctx.close();
}

// Desktop
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const section = await page.$('#demo-timeline');
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await section.screenshot({ path: '/Users/jhonatan/Repos/Sebraiers/screenshots/timeline-desktop.png' });
  console.log('desktop timeline captured');
  await ctx.close();
}

await browser.close();