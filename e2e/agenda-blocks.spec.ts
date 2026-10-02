/**
 * E2E — Bloqueio de agenda por colaborador.
 *
 * Rodar:
 *   E2E_OWNER_EMAIL=... E2E_OWNER_PASS=... \
 *     npx playwright test e2e/agenda-blocks.spec.ts --project=chromium-legacy
 *
 * Sem credenciais o arquivo não sobe (mesmo padrão de agenda-create-slot).
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

async function navAgenda(page: Page): Promise<void> {
  await page.getByText('Agenda', { exact: true }).locator('visible=true').first().click({ timeout: 15_000 });
  await page.getByRole('heading', { name: /Agenda/i }).waitFor({ timeout: 20_000 });
  await page.waitForTimeout(1500);
}

test.describe('Agenda — bloqueio por colaborador', () => {
  test.setTimeout(180_000);

  test('desktop: + oferece Novo atendimento e Bloquear agenda', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginOwner(page);
    await navAgenda(page);

    await page.locator('#btn-new-appointment').click();
    await expect(page.getByTestId('agenda-create-choice')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId('agenda-choice-new-appointment')).toBeVisible();
    await expect(page.getByTestId('agenda-choice-block')).toContainText(/Bloquear agenda/i);

    await page.getByTestId('agenda-choice-block').click();
    await expect(page.getByTestId('agenda-block-form')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/motivo/i)).toHaveCount(0);
    await expect(page.getByTestId('agenda-block-professional')).toBeVisible();
  });

  test('mobile 390: slot vazio oferece Bloquear a partir daqui com horário preenchido', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginOwner(page);
    await navAgenda(page);

    const emptySlot = page.getByRole('button', { name: /Novo agendamento às/i }).first();
    await emptySlot.waitFor({ timeout: 15_000 });
    const label = (await emptySlot.getAttribute('aria-label')) || '';
    const timeMatch = label.match(/às\s+(\d{2}:\d{2})/i);
    const slotTime = timeMatch?.[1] ?? '';

    await emptySlot.click();
    await expect(page.getByTestId('agenda-create-choice')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId('agenda-choice-block')).toContainText(/Bloquear a partir daqui/i);
    await page.getByTestId('agenda-choice-block').click();
    await expect(page.getByTestId('agenda-block-form')).toBeVisible({ timeout: 8_000 });
    if (slotTime) {
      await expect(page.getByTestId('agenda-block-start-time')).toHaveValue(slotTime);
    }
  });
});
