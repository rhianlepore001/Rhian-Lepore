import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.resolve('e2e/screenshots/competitors');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function capture(page: any, name: string) {
  const desktopPath = path.join(OUTPUT_DIR, `${name}-desktop.png`);
  const mobilePath = path.join(OUTPUT_DIR, `${name}-mobile.png`);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: desktopPath, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: mobilePath, fullPage: true });

  return { desktopPath, mobilePath };
}

test('AppBarber landing', async ({ page }) => {
  await page.goto('https://sites.appbarber.com.br/en', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await capture(page, 'appbarber-landing');
});

test('AppBarber site principal', async ({ page }) => {
  await page.goto('https://appbarber.com.br', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await capture(page, 'appbarber-home');
});

test('Booksy for business', async ({ page }) => {
  await page.goto('https://biz.booksy.com/en-us', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await capture(page, 'booksy-biz');
});

test('Booksy marketplace', async ({ page }) => {
  await page.goto('https://booksy.com/en-us', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await capture(page, 'booksy-marketplace');
});

test('Vagaro', async ({ page }) => {
  await page.goto('https://www.vagaro.com', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await capture(page, 'vagaro');
});

test('Zoca', async ({ page }) => {
  await page.goto('https://zoca.com', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await capture(page, 'zoca');
});

test('BestBarbers', async ({ page }) => {
  await page.goto('https://www.bestbarbers.app/sistema-para-barbearia', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await capture(page, 'bestbarbers');
});

test('Booksy stats and reports', async ({ page }) => {
  await page.goto('https://biz.booksy.com/en-us/features/stats-and-reports', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await capture(page, 'booksy-stats-reports');
});

test('Vagaro reports', async ({ page }) => {
  await page.goto('https://www.vagaro.com/pro/reports', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await capture(page, 'vagaro-reports');
});

test('Reservio barbearia', async ({ page }) => {
  await page.goto('https://www.reservio.com/pt/software-para-barbearia', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await capture(page, 'reservio');
});
