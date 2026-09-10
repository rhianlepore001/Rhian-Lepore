/**
 * E2E — Equipe no menu (desktop + mobile) e exclusão de profissional.
 *
 *   E2E_OWNER_EMAIL=Bob.teste@gmail.com E2E_OWNER_PASS='BobTeste@123' \
 *     npx playwright test e2e/equipe-sidebar-delete.spec.ts --project=chromium-legacy
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

test.describe('Equipe no menu e exclusão de profissional', () => {
  test.setTimeout(180_000);

  test('mostra Equipe no desktop e no mobile e exclui um profissional', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginOwner(page);

    const desktopEquipe = page.locator('#sidebar-container').getByRole('link', { name: 'Equipe', exact: true });
    await expect(desktopEquipe).toBeVisible({ timeout: 20_000 });
    await page.screenshot({
      path: path.join(ARTIFACTS, 'equipe-sidebar-desktop.png'),
      fullPage: false,
    });

    await desktopEquipe.click();
    await expect(page.getByRole('heading', { name: /Equipe/i }).first()).toBeVisible({ timeout: 20_000 });

    const professionalName = `QA Excluir ${Date.now().toString().slice(-6)}`;
    await page.locator('#btn-add-team-member').click();
    await expect(page.getByRole('heading', { name: /Novo Profissional/i })).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder('Ex: João Silva').fill(professionalName);
    await page.getByLabel('Cargo').fill('Barbeiro');
    await page.getByRole('button', { name: /Criar e convidar/i }).click();

    const inviteModal = page.getByRole('dialog').filter({ hasText: /Convite pronto/i });
    await expect(inviteModal).toBeVisible({ timeout: 20_000 });
    await inviteModal.getByTestId('invite-modal-close').click();

    const memberCard = page.getByRole('heading', { name: professionalName, exact: true }).locator('xpath=ancestor::div[contains(@class,"group")][1]');
    await expect(page.getByRole('heading', { name: professionalName, exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: `Excluir membro ${professionalName}` }).click();
    const confirm = page.getByRole('dialog').filter({ hasText: /Excluir profissional/i });
    await expect(confirm).toBeVisible({ timeout: 10_000 });
    await confirm.getByRole('button', { name: 'Excluir', exact: true }).click();

    await expect(page.getByText('Profissional excluído.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: professionalName, exact: true })).toHaveCount(0);
    await expect(memberCard).toHaveCount(0);

    await page.screenshot({
      path: path.join(ARTIFACTS, 'equipe-profissional-excluido.png'),
      fullPage: false,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Mais opções' }).click();
    const mobileMenu = page.getByRole('dialog', { name: 'Menu de navegação' });
    const mobileEquipe = mobileMenu.getByRole('button', { name: 'Equipe' });
    await expect(mobileEquipe).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => {
      const box = await mobileEquipe.boundingBox();
      return box !== null && box.x < 200;
    }, { timeout: 5_000 }).toBe(true);
    await page.screenshot({
      path: path.join(ARTIFACTS, 'equipe-menu-mobile.png'),
      fullPage: false,
    });
  });
});
