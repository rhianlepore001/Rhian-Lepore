/**
 * E2E — Convite após criar profissional + cadastro staff sem escolher nome
 *
 *   E2E_OWNER_EMAIL=Bob.teste@gmail.com E2E_OWNER_PASS='BobTeste@123' \
 *     npx playwright test e2e/staff-invite-flow.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || 'Bob.teste@gmail.com';
const OWNER_PASS = process.env.E2E_OWNER_PASS || 'BobTeste@123';
const ARTIFACTS = '/opt/cursor/artifacts';

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

test.describe('Convite de colaborador — domínio do gestor', () => {
  test.setTimeout(180_000);

  test('remove card genérico, convida após criar e trava nome no registro', async ({ page, context }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await loginOwner(page);

    await page.goto(`${BASE}/#/configuracoes/equipe`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Equipe', exact: true })).toBeVisible({
      timeout: 20_000,
    });

    // Card genérico "Convide sua Equipe" NÃO deve existir
    await expect(page.getByText(/Convide sua Equipe/i)).toHaveCount(0);
    await expect(page.getByText(/Copiar Link de Convite/i)).toHaveCount(0);

    await page.screenshot({
      path: path.join(ARTIFACTS, 'equipe-sem-card-convite.png'),
      fullPage: false,
    });

    const professionalName = `QA Convite ${Date.now().toString().slice(-6)}`;
    await page.locator('#btn-add-team-member').click();
    await expect(page.getByRole('heading', { name: /Novo Profissional/i })).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder('Ex: João Silva').fill(professionalName);
    await page.getByPlaceholder('Ex: Barbeiro').fill('Barbeiro');
    const commission = page.locator('input[type="number"]').first();
    if (await commission.count()) {
      await commission.fill('40');
    }

    await page.getByRole('button', { name: /Criar e convidar/i }).click();
    const inviteModal = page.getByRole('dialog').filter({ hasText: /Convite pronto/i });
    await expect(inviteModal).toBeVisible({ timeout: 20_000 });
    await expect(inviteModal.getByText(/Tudo certo com/i)).toBeVisible();
    await expect(inviteModal.getByText(professionalName, { exact: true })).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACTS, 'modal-convite-apos-criar.png'),
      fullPage: false,
    });

    const inviteUrl = (await inviteModal.getByTestId('invite-link').innerText()).trim();
    expect(inviteUrl).toMatch(/\/#\/register\?company=[0-9a-f-]+&member=[0-9a-f-]+/i);

    await inviteModal.getByTestId('invite-modal-close').click();

    // Cadastro do colaborador via link com member_id
    const staffPage = await context.newPage();
    await staffPage.setViewportSize({ width: 390, height: 844 });
    await staffPage.goto(inviteUrl, { waitUntil: 'domcontentloaded' });

    await expect(staffPage.getByRole('heading', { name: /Bem-vindo à equipe/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(staffPage.getByText(/Validando convite/i)).toHaveCount(0, { timeout: 15_000 });
    await expect(staffPage.getByText(/Não foi possível validar/i)).toHaveCount(0);

    // Nome NÃO é input editável — bloco travado
    const lockedName = staffPage.getByTestId('staff-name-locked');
    await expect(lockedName).toBeVisible({ timeout: 15_000 });
    await expect(lockedName).toContainText(professionalName);
    await expect(staffPage.locator('input#staff-name')).toHaveCount(0);
    await expect(staffPage.locator('#staff-name')).toHaveAttribute('aria-readonly', 'true');

    await expect(staffPage.getByLabel(/E-mail \(Gmail\)/i)).toBeVisible();
    await expect(staffPage.getByLabel(/Data de nascimento/i)).toBeVisible();
    await expect(staffPage.getByText(/WhatsApp/i)).toHaveCount(0);

    await staffPage.screenshot({
      path: path.join(ARTIFACTS, 'cadastro-staff-nome-travado.png'),
      fullPage: false,
    });

    await staffPage.close();
  });
});
