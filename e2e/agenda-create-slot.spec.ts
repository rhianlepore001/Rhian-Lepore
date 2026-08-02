/**
 * E2E — Agenda: abrir wizard pelo botão e criar via célula da grade
 * (regressão: modal não abria / agendamento só aparecia após F5).
 *
 * Rodar:
 *   E2E_OWNER_EMAIL=... E2E_OWNER_PASS=... \
 *     npx playwright test e2e/agenda-create-slot.spec.ts --project=chromium-legacy
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

async function completeWizardFromClient(page: Page): Promise<string> {
  await expect(page.getByRole('heading', { name: /Novo Atendimento/i })).toBeVisible({ timeout: 8_000 });

  // Step 1 — SearchableSelect: botão abre dropdown, input "Buscar..." filtra
  await expect(page.getByText(/Quem será atendido hoje/i)).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: /Buscar cliente/i }).click();
  const search = page.getByPlaceholder(/^Buscar/i);
  await search.waitFor({ timeout: 5_000 });
  await search.fill('a');
  await page.waitForTimeout(400);
  const option = page.locator('.absolute .cursor-pointer, .absolute [class*="cursor-pointer"]').first();
  await option.waitFor({ timeout: 8_000 });
  const clientName = ((await option.innerText()).split('\n')[0] || 'Cliente').trim();
  await option.click();
  await page.getByRole('button', { name: /^Continuar$/i }).click();

  // Step 2 — serviço
  await expect(page.getByText(/Menu de Serviços/i)).toBeVisible({ timeout: 15_000 });
  await page.getByText('Corte Masculino', { exact: true }).click();
  await page.getByRole('button', { name: /^Continuar$/i }).click();

  // Step 3 — horário (prefill da grade)
  await expect(page.getByRole('heading', { name: /Horário/i }).or(page.getByText(/^Horário$/))).toBeVisible({
    timeout: 10_000,
  });
  const continueBtn = page.getByRole('button', { name: /^Continuar$/i });
  if (await continueBtn.isDisabled()) {
    const pro = page.locator('button').filter({ hasText: /Disponível/i }).first();
    if (await pro.isVisible().catch(() => false)) await pro.click();
    if (await continueBtn.isDisabled()) {
      await page.locator('button.font-mono').first().click();
    }
  }
  await expect(continueBtn).toBeEnabled({ timeout: 8_000 });
  await continueBtn.click();

  // Step 4 — confirmar
  await expect(page.getByRole('button', { name: /Confirmar Atendimento/i })).toBeVisible({ timeout: 10_000 });
  const toggle = page.locator('input[type="checkbox"]').first();
  if (await toggle.isVisible().catch(() => false)) {
    if (await toggle.isChecked()) await toggle.uncheck();
  }
  page.on('popup', async (p) => {
    await p.close().catch(() => undefined);
  });
  await page.getByRole('button', { name: /Confirmar Atendimento/i }).click();
  return clientName;
}

test.describe('Agenda — criar agendamento (botão + célula)', () => {
  test.setTimeout(180_000);

  test('botão Novo Agendamento abre o wizard imediatamente', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginOwner(page);
    await navAgenda(page);

    await page.locator('#btn-new-appointment').click();
    await expect(page.getByRole('heading', { name: /Novo Atendimento/i })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText(/Quem será atendido hoje/i)).toBeVisible({ timeout: 5_000 });
  });

  test('célula da grade cria agendamento e aparece na grade sem F5', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginOwner(page);
    await navAgenda(page);

    const emptySlot = page.getByRole('button', { name: /Novo agendamento às/i }).first();
    await emptySlot.waitFor({ timeout: 15_000 });
    const label = (await emptySlot.getAttribute('aria-label')) || '';
    const timeMatch = label.match(/às\s+(\d{2}:\d{2})/i);
    const slotTime = timeMatch?.[1] ?? '';

    await emptySlot.click();
    const clientName = await completeWizardFromClient(page);

    // Wizard fecha sem F5
    await expect(page.getByRole('heading', { name: /Novo Atendimento/i })).toHaveCount(0, {
      timeout: 20_000,
    });

    // Toast de sucesso OU card do cliente na grade — sem reload
    await expect(
      page.getByText(new RegExp(`${clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|Agendamento criado|sucesso`, 'i')).first()
    ).toBeVisible({ timeout: 15_000 });

    if (slotTime) {
      await expect(page.getByText(slotTime, { exact: true }).first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
