import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:4173';
const SCREENSHOTS_DIR = path.resolve('e2e/screenshots/metrics-v2');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function shot(page: any, name: string) {
  const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

test.describe('Metrics v2 - Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('1) Demo: card de Ocupação + Horários Vagos + Cancelamentos', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await shot(page, '01-mobile-three-cards');
  });

  test('2) Demo: scroll até os novos cards', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(800);
    await shot(page, '02-mobile-scrolled');
  });

  test('3) Demo: fullpage (todos os cards)', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const file = path.join(SCREENSHOTS_DIR, '03-mobile-fullpage.png');
    await page.screenshot({ path: file, fullPage: true });
  });
});

test.describe('Metrics v2 - Desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('4) Desktop: três cards lado a lado', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await shot(page, '04-desktop-three-cards');
  });

  test('5) Desktop: fullpage com tudo', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const file = path.join(SCREENSHOTS_DIR, '05-desktop-fullpage.png');
    await page.screenshot({ path: file, fullPage: true });
  });
});
