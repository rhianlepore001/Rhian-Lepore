/**
 * E2E — Navegação SPA entre sessões (sem F5)
 * Regressão: trocar Agenda → Financeiro → Dashboard exige refresh.
 *
 *   E2E_OWNER_EMAIL=... E2E_OWNER_PASS=... \
 *     npx playwright test e2e/nav-spa-rotation.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? '';
const OWNER_PASS = process.env.E2E_OWNER_PASS ?? '';
if (!OWNER_EMAIL || !OWNER_PASS) {
  throw new Error('Defina E2E_OWNER_EMAIL e E2E_OWNER_PASS para rodar este spec.');
}

async function loginOwner(page: Page): Promise<void> {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'load' });
  const entrar = page.getByText('ENTRAR').first();
  await entrar.waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);
  await entrar.click();
  await page.locator('input[type="email"]').waitFor({ timeout: 20_000 });
  await page.locator('input[type="email"]').fill(OWNER_EMAIL);
  await page.locator('input[type="password"]').fill(OWNER_PASS);
  await page.locator('button[type="submit"]').click({ timeout: 5_000 });
  await page.getByText('Olá,').first().waitFor({ timeout: 45_000 });
}

async function clickSidebar(page: Page, label: string): Promise<void> {
  // Prefer desktop sidebar link
  const link = page.locator('aside a, nav a, complementary a').filter({ hasText: new RegExp(`^${label}$`, 'i') }).first();
  await link.waitFor({ state: 'visible', timeout: 15_000 });
  await link.click();
}

test.describe('Navegação SPA entre sessões', () => {
  test.setTimeout(180_000);

  test('Agenda → Financeiro → Dashboard → Agenda sem F5', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginOwner(page);

    // 1) Agenda
    await clickSidebar(page, 'Agenda');
    await expect(page).toHaveURL(/#\/agenda/, { timeout: 8_000 });
    await expect(page.getByRole('heading', { name: /^Agenda$/i })).toBeVisible({ timeout: 10_000 });

    // 2) Financeiro — URL E conteúdo devem trocar (regressão: URL muda, Agenda fica)
    await clickSidebar(page, 'Financeiro');
    await expect(page).toHaveURL(/#\/financeiro/, { timeout: 8_000 });
    // Debug de desync hash vs React
    // Aguarda um tick de paint/router
    await page.waitForTimeout(500);
    const debug = await page.evaluate(() => ({
      href: window.location.href,
      hash: window.location.hash,
      rrPath: document.body.dataset.rrPath ?? null,
      h1: document.querySelector('main h1')?.textContent ?? null,
    }));
    console.log('NAV_DEBUG', JSON.stringify(debug));
    await expect(
      page.getByRole('heading', { name: /^Financeiro$/i }),
      `Desync SPA: hash=${debug.hash} rrPath=${debug.rrPath} h1=${debug.h1}`
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /^Agenda$/i })).toHaveCount(0);

    // 3) Dashboard
    await clickSidebar(page, 'Dashboard');
    await expect(page).toHaveURL(/#\/?(\?|$)/, { timeout: 8_000 });
    await expect(page.getByText('Olá,').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /^Financeiro$/i })).toHaveCount(0);

    // 4) Volta Agenda
    await clickSidebar(page, 'Agenda');
    await expect(page).toHaveURL(/#\/agenda/, { timeout: 8_000 });
    await expect(page.getByRole('heading', { name: /^Agenda$/i })).toBeVisible({ timeout: 10_000 });

    // 5) Stress: 3 ciclos rápidos Agenda ↔ Financeiro
    for (let i = 0; i < 3; i++) {
      await clickSidebar(page, 'Financeiro');
      await expect(page.getByRole('heading', { name: /^Financeiro$/i })).toBeVisible({ timeout: 8_000 });
      await expect(page.getByRole('heading', { name: /^Agenda$/i })).toHaveCount(0);

      await clickSidebar(page, 'Agenda');
      await expect(page.getByRole('heading', { name: /^Agenda$/i })).toBeVisible({ timeout: 8_000 });
      await expect(page.getByRole('heading', { name: /^Financeiro$/i })).toHaveCount(0);
    }

    // 6) Outras sessões
    await clickSidebar(page, 'Clientes CRM');
    await expect(page).toHaveURL(/#\/clientes/, { timeout: 8_000 });
    await expect(page.getByRole('heading', { name: /^Agenda$/i })).toHaveCount(0);

    await clickSidebar(page, 'Fila Digital');
    await expect(page).toHaveURL(/#\/fila/, { timeout: 8_000 });
    await expect(page.getByRole('heading', { name: /^Agenda$/i })).toHaveCount(0);
  });
});
