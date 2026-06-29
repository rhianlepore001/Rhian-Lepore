import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:4173';
const SCREENSHOTS_DIR = path.resolve('e2e/screenshots/design-review');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function shot(page: any, name: string) {
  const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

test.describe('Design Review - Mobile Menu (drawer lateral direito)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('1) Estado inicial sem menu', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await shot(page, '01-estado-inicial');
  });

  test('2) Drawer lateral direito aberto com blur', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    await page.locator('[data-testid="open-more-options"]').click();
    await page.waitForTimeout(500);

    await shot(page, '02-drawer-aberto');
  });

  test('3) Drawer com item ativo destacado', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    await page.locator('[data-testid="open-more-options"]').click();
    await page.waitForTimeout(500);

    const itemInicio = page.locator('button:has-text("Início")').first();
    if (await itemInicio.count() > 0) {
      await itemInicio.hover();
      await page.waitForTimeout(300);
    }
    await shot(page, '03-drawer-item-hover');
  });

  test('4) Drawer mobile fechado via Esc', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    await page.locator('[data-testid="open-more-options"]').click();
    await page.waitForTimeout(500);
    await shot(page, '04a-antes-esc');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await shot(page, '04b-depois-esc');
  });
});

test.describe('Design Review - Dashboard Occupancy Card', () => {
  test('5) Card de Taxa de Ocupação - estado carregando', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('domcontentloaded');
    await shot(page, '05-occupancy-card-loading');
  });

  test('6) Card de Taxa de Ocupação - estado carregado', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await shot(page, '06-occupancy-card-loaded');
  });

  test('7) Card com toggle Semana selecionado', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    const weekBtn = page.locator('button:has-text("Semana")').first();
    if (await weekBtn.count() > 0) {
      await weekBtn.click();
      await page.waitForTimeout(1500);
    }
    await shot(page, '07-occupancy-card-semana');
  });

  test('8) Card com toggle Mês selecionado', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    const monthBtn = page.locator('button:has-text("Mês")').first();
    if (await monthBtn.count() > 0) {
      await monthBtn.click();
      await page.waitForTimeout(1500);
    }
    await shot(page, '08-occupancy-card-mes');
  });
});

test.describe('Design Review - Desktop responsivo', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('9) Desktop - drawer e card lado a lado', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await shot(page, '09-desktop-overview');
  });

  test('10) Desktop - drawer aberto em viewport grande', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE_URL}/#/design-review-demo`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    await page.locator('[data-testid="open-more-options"]').click();
    await page.waitForTimeout(500);
    await shot(page, '10-desktop-drawer-open');
  });
});
