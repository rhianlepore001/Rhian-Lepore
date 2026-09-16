import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const ARTIFACTS = process.env.E2E_ARTIFACTS_DIR || '/opt/cursor/artifacts';

async function shot(page: import('@playwright/test').Page, name: string) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const file = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function viewShot(page: import('@playwright/test').Page, name: string) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const file = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

test.describe('Landing de marketing', () => {
  test('anônimo em / vê a landing, não o login, com trial de 20 dias', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('marketing-landing')).toBeVisible({ timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/agenda que faz/i);
    await expect(page.getByText(/20 dias/i).first()).toBeVisible();
    await expect(page.getByTestId('marketing-landing')).toContainText('R$ 34,90');
    await expect(page.getByTestId('marketing-landing')).toContainText('R$ 59,90');
    await expect(page.getByTestId('category-barber')).toHaveCount(0);
    await viewShot(page, 'landing-hero-desktop');
    await page.locator('#beneficios').scrollIntoViewIfNeeded();
    await viewShot(page, 'landing-pillars-desktop');
    await page.locator('#produto').scrollIntoViewIfNeeded();
    await viewShot(page, 'landing-product-desktop');
    await page.locator('.ax-lp-niche-row').scrollIntoViewIfNeeded();
    await viewShot(page, 'landing-niches-desktop');
    await page.locator('#preco').scrollIntoViewIfNeeded();
    await viewShot(page, 'landing-pricing-desktop');
    await shot(page, 'landing-desktop');

    const cta = page.getByRole('link', { name: /testar 20 dias/i }).first();
    await cta.click();
    await expect(page).toHaveURL(/#\/register/);
    await expect(page.getByRole('heading', { name: /crie sua conta/i })).toBeVisible();
    await expect(page.getByText(/20 dias grátis/i)).toBeVisible();
  });

  test('mobile 390 e gateway de login com rótulo de salão', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('marketing-landing')).toBeVisible({ timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);
    await viewShot(page, 'landing-hero-mobile');
    await page.locator('#preco').scrollIntoViewIfNeeded();
    await viewShot(page, 'landing-pricing-mobile');
    await shot(page, 'landing-mobile');

    await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByTestId('category-barber')).toHaveText(/barbearias/i);
    await expect(page.getByTestId('category-beauty')).toHaveText(/salões de beleza/i);
    await expect(page.getByRole('link', { name: /criar conta — 20 dias grátis/i })).toBeVisible();
    await shot(page, 'login-gateway-labels');
  });
});
