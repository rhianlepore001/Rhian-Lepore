/**
 * E2E — botão Excluir serviço visível no mobile (sem hover).
 *
 *   E2E_BASE_URL=https://www.agendixstudio.com \
 *   E2E_OWNER_EMAIL=Bob.teste@gmail.com E2E_OWNER_PASS='BobTeste@123' \
 *     npx playwright test e2e/services-delete-visible.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || 'Bob.teste@gmail.com';
const OWNER_PASS = process.env.E2E_OWNER_PASS || 'BobTeste@123';
const ARTIFACTS = process.env.E2E_ARTIFACTS_DIR || '/opt/cursor/artifacts';

async function loginOwner(page: Page): Promise<void> {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'load' });
  const entrar = page.getByText('ENTRAR').first();
  await entrar.waitFor({ timeout: 20_000 });
  await page.waitForTimeout(600);
  await entrar.click();
  await page.locator('input[type="email"]').waitFor({ timeout: 20_000 });
  await page.locator('input[type="email"]').fill(OWNER_EMAIL);
  await page.locator('input[type="password"]').fill(OWNER_PASS);
  await page.locator('button[type="submit"]').click({ timeout: 5_000 });
  await page.getByText(/Olá,/i).first().waitFor({ timeout: 45_000 });
}

test.describe('Serviços — excluir visível no mobile', () => {
  test.setTimeout(180_000);

  test('botão Excluir serviço aparece sem hover em viewport mobile', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await loginOwner(page);

    await page.goto(`${BASE}/#/configuracoes/servicos`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Serviço/i }).first()).toBeVisible({ timeout: 30_000 });

    // Wait for at least one service row or empty state
    const deleteBtn = page.getByRole('button', { name: /Excluir serviço/i }).first();
    const empty = page.getByText(/Nenhum serviço nesta categoria|Comece organizando/i);

    await Promise.race([
      deleteBtn.waitFor({ state: 'visible', timeout: 30_000 }),
      empty.waitFor({ state: 'visible', timeout: 30_000 }),
    ]);

    if (await empty.isVisible().catch(() => false)) {
      test.skip(true, 'Conta sem serviços — nada para excluir');
    }

    await expect(deleteBtn).toBeVisible();
    // Must not be hidden via opacity/visibility
    await expect(deleteBtn).toBeEnabled();
    const opacity = await deleteBtn.evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.9);

    await page.screenshot({
      path: path.join(ARTIFACTS, 'services-delete-visible-mobile.png'),
      fullPage: false,
    });
  });
});
