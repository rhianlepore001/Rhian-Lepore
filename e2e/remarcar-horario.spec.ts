/**
 * E2E — Remarcar horário (PR C). Telas 375/390/1440, dono e staff (none/own/all).
 *
 * Tudo mockado: nenhum POST/PATCH/PUT/DELETE (nem GET) chega em produção.
 *
 *   npx playwright test e2e/remarcar-horario.spec.ts --project=chromium-legacy
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  AGENDA_DATE,
  installRemarcarMocks,
  type RemarcarMockHandle,
} from './helpers/remarcarMocks';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const OUT_DIR = process.env.SHOT_DIR ?? path.join(process.cwd(), 'batch-shots/remarcar/after');
const ARTIFACTS = process.env.E2E_ARTIFACTS_DIR || '/opt/cursor/artifacts/screenshots/remarcar';

const WIDTHS = [375, 390, 1440] as const;
const SLOT_BUSY = 'Esse horário já está ocupado na agenda de Bob. Escolha outro.';
const M1 = 'Horário bloqueado na agenda de Bob. Para agendar, remova o bloqueio primeiro.';
const PAST = 'Esse horário já passou — use para lançar um atendimento que já aconteceu.';

async function settle(page: Page) {
  await page.evaluate(() => {
    document.getAnimations?.().forEach((a) => {
      try { a.finish(); } catch { /* ignore */ }
    });
  });
  await page.waitForTimeout(280);
}

async function shot(page: Page, name: string) {
  await settle(page);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const buf = await page.screenshot({ fullPage: true });
  fs.writeFileSync(path.join(OUT_DIR, name), buf);
  fs.writeFileSync(path.join(ARTIFACTS, name), buf);
}

async function openAgenda(page: Page, width: number) {
  await page.setViewportSize({ width, height: width >= 1000 ? 900 : 844 });
  await page.goto(`${BASE}/#/agenda?date=${AGENDA_DATE}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Agenda/i }).first()).toBeVisible({ timeout: 30_000 });
  await settle(page);
}

async function openDetails(page: Page) {
  const card = page.getByRole('button', { name: /Aline Lima/ }).first();
  await expect(card).toBeVisible({ timeout: 20_000 });
  await card.click();
  await expect(page.getByRole('heading', { name: /Detalhes do Agendamento/i })).toBeVisible({ timeout: 10_000 });
  await settle(page);
}

async function openReschedule(page: Page) {
  await page.getByTestId('appointment-reschedule').click();
  await expect(page.getByRole('heading', { name: 'Remarcar horário' })).toBeVisible();
  await settle(page);
}

async function dismissToasts(page: Page) {
  const closes = page.locator('[role="alert"] button[aria-label="Fechar"], [role="status"] button[aria-label="Fechar"]');
  const n = await closes.count();
  for (let i = n - 1; i >= 0; i -= 1) {
    await closes.nth(i).click({ force: true }).catch(() => undefined);
  }
}

test.describe('PR C — Remarcar horário', () => {
  test.use({ locale: 'pt-BR', timezoneId: 'Europe/Lisbon' });
  test.setTimeout(120_000);
  let guard: RemarcarMockHandle | undefined;

  test.afterEach(() => {
    guard?.assertNoLeak();
  });

  for (const width of WIDTHS) {
    test(`T-P06 dono ${width}: detalhes com Remarcar + modal`, async ({ page }) => {
      guard = await installRemarcarMocks(page, { role: 'owner' });
      await openAgenda(page, width);
      await shot(page, `owner-${width}-1-agenda.png`);
      await openDetails(page);
      await expect(page.getByTestId('appointment-reschedule')).toBeVisible();
      await expect(page.getByTestId('appointment-rescheduled-by')).toContainText('Remarcado por');
      await shot(page, `owner-${width}-2-detalhes.png`);
      await openReschedule(page);
      await expect(page.getByTestId('reschedule-current')).toContainText('Atual:');
      await expect(page.getByTestId('reschedule-confirm')).toBeDisabled();
      await expect(page.getByTestId('reschedule-past-note').first()).toHaveText(PAST);
      await expect(page.getByRole('button', { name: '06:00 Atual' })).toBeVisible();
      await expect(page.getByRole('button', { name: '10:00 Ocupado' })).toBeDisabled();
      await expect(page.getByRole('button', { name: /12:00 Bloqueado/ })).toBeDisabled();
      await shot(page, `owner-${width}-3-remarcar-modal.png`);
      await page.getByTestId('reschedule-modal-body').getByRole('button', { name: '11:30' }).click();
      await expect(page.getByTestId('reschedule-confirm')).toBeEnabled();
      await expect(page.getByTestId('reschedule-summary').first()).toContainText('De');
      await expect(page.getByTestId('reschedule-summary').first()).toContainText('Para');
      await shot(page, `owner-${width}-4-remarcar-resumo.png`);
    });

    test(`T-P07 dono ${width}: Editar sem data/hora/profissional editáveis`, async ({ page }) => {
      guard = await installRemarcarMocks(page, { role: 'owner' });
      await openAgenda(page, width);
      await openDetails(page);
      await page.getByRole('button', { name: 'Editar' }).click();
      await expect(page.getByRole('heading', { name: /Editar Agendamento/i })).toBeVisible();
      await expect(page.getByTestId('edit-readonly-date')).toHaveText(/23\/08\/2026/);
      await expect(page.getByTestId('edit-readonly-time')).toHaveText('06:00');
      await expect(page.getByTestId('edit-readonly-professional')).toHaveText('Bob');
      await expect(page.getByTestId('edit-reschedule-link')).toBeVisible();
      const box = await page.getByTestId('edit-reschedule-link').boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      await shot(page, `owner-${width}-5-editar-readonly.png`);
    });

    test(`C-R01 staff none ${width}: sem Remarcar`, async ({ page }) => {
      guard = await installRemarcarMocks(page, { role: 'staff', scope: 'none' });
      await openAgenda(page, width);
      await openDetails(page);
      await expect(page.getByTestId('appointment-reschedule')).toHaveCount(0);
      await expect(page.getByTestId('staff-edit-blocked-note')).toBeVisible();
      await shot(page, `staff-none-${width}-2-detalhes-sem-editar.png`);
    });
  }

  test('T-P06 390: conflito R-06, bloqueio M1, sucesso + foco', async ({ page }) => {
    guard = await installRemarcarMocks(page, { role: 'owner' });
    await openAgenda(page, 390);
    await openDetails(page);
    await openReschedule(page);
    await page.getByTestId('reschedule-modal-body').getByRole('button', { name: '11:30' }).click();

    guard.setRpc({
      status: 400,
      body: { message: SLOT_BUSY, hint: 'reschedule_slot_busy', code: 'P0001' },
    });
    await page.getByTestId('reschedule-confirm').click();
    await expect(page.getByText(SLOT_BUSY)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Remarcar horário' })).toBeVisible();
    await shot(page, 'owner-390-6-conflito.png');
    await dismissToasts(page);

    guard.setRpc({
      status: 400,
      body: { message: M1, hint: 'professional_blocked', code: 'P0001' },
    });
    await page.getByTestId('reschedule-confirm').click();
    await expect(page.getByText(M1)).toBeVisible({ timeout: 10_000 });
    await shot(page, 'owner-390-7-bloqueio-m1.png');
    await dismissToasts(page);

    guard.setRpc({
      status: 200,
      body: { success: true, id: '50000000-0000-4000-8000-000000000001', appointment_time: '2026-08-23T09:30:00.000Z', professional_id: '10000000-0000-4000-8000-000000000001' },
    });
    await page.getByTestId('reschedule-confirm').click();
    await expect(page.getByText('Horário remarcado.')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-highlight="true"]')).toBeVisible({ timeout: 15_000 });
    await shot(page, 'owner-390-8-sucesso-foco.png');
  });

  test('T-P06 1440: conflito e sucesso', async ({ page }) => {
    guard = await installRemarcarMocks(page, { role: 'owner' });
    await openAgenda(page, 1440);
    await openDetails(page);
    await openReschedule(page);
    await page.getByTestId('reschedule-modal-body').getByRole('button', { name: '11:30' }).click();

    guard.setRpc({
      status: 400,
      body: { message: SLOT_BUSY, hint: 'reschedule_slot_busy', code: 'P0001' },
    });
    await page.getByTestId('reschedule-confirm').click();
    await expect(page.getByText(SLOT_BUSY)).toBeVisible({ timeout: 10_000 });
    await shot(page, 'owner-1440-6-conflito.png');
    await dismissToasts(page);

    guard.setRpc({
      status: 200,
      body: { success: true, id: '50000000-0000-4000-8000-000000000001', appointment_time: '2026-08-23T09:30:00.000Z', professional_id: '10000000-0000-4000-8000-000000000001' },
    });
    await page.getByTestId('reschedule-confirm').click();
    await expect(page.getByText('Horário remarcado.')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-highlight="true"]')).toBeVisible({ timeout: 15_000 });
    await shot(page, 'owner-1440-8-sucesso.png');
  });

  test('T-P06 390: slot passado selecionado', async ({ page }) => {
    guard = await installRemarcarMocks(page, { role: 'owner' });
    await openAgenda(page, 390);
    await openDetails(page);
    await openReschedule(page);
    await page.getByTestId('reschedule-modal-body').getByRole('button', { name: '05:00' }).click();
    await expect(page.getByTestId('reschedule-past-note').first()).toHaveText(PAST);
    await expect(page.getByTestId('reschedule-confirm')).toBeEnabled();
    await shot(page, 'owner-390-9-passado-selecionado.png');
  });

  test('C-R03 staff own 390: Remarcar no próprio com profissional travado', async ({ page }) => {
    guard = await installRemarcarMocks(page, { role: 'staff', scope: 'own' });
    await openAgenda(page, 390);
    await openDetails(page);
    await expect(page.getByTestId('appointment-reschedule')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Detalhes do Agendamento/i })).toBeVisible();
    await expect(page.getByText(/Aline Lima/).first()).toBeVisible();
    await expect(page.getByText(/Bob/).first()).toBeVisible();
    await shot(page, 'staff-own-390-2-detalhes.png');
    await openReschedule(page);
    await expect(page.getByTestId('reschedule-lock-pro-note')).toBeVisible();
    await expect(page.getByTestId('reschedule-modal-body').getByRole('button', { name: /Bruna/ })).toBeDisabled();
    await expect(page.getByTestId('reschedule-modal-body').getByRole('button', { name: /Bob/ }).first()).toBeEnabled();
    await expect(page.getByTestId('reschedule-current')).toContainText('com Bob');
    await page.getByTestId('reschedule-lock-pro-note').scrollIntoViewIfNeeded();
    await settle(page);
    await shot(page, 'staff-own-390-3-seletor-travado.png');
  });

  test('C-R04 staff all 390: Remarcar qualquer um e troca profissional', async ({ page }) => {
    guard = await installRemarcarMocks(page, { role: 'staff', scope: 'all' });
    await openAgenda(page, 390);
    await openDetails(page);
    await expect(page.getByTestId('appointment-reschedule')).toBeVisible();
    await openReschedule(page);
    await expect(page.getByTestId('reschedule-lock-pro-note')).toHaveCount(0);
    await page.getByTestId('reschedule-modal-body').getByRole('button', { name: /Bruna/ }).click();
    await expect(page.getByTestId('reschedule-modal-body').getByRole('button', { name: /Bruna/ })).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('reschedule-modal-body').getByRole('button', { name: '11:30' }).click();
    await expect(page.getByTestId('reschedule-summary').first()).toContainText('Bruna');
    await page.getByTestId('wizard-pro-list').scrollIntoViewIfNeeded();
    await settle(page);
    await shot(page, 'staff-all-390-3-troca-profissional.png');
  });

  test('C-R09 390: link do cliente mostra o horário novo', async ({ page }) => {
    guard = await installRemarcarMocks(page, { role: 'owner' });
    guard.setRpc({
      status: 200,
      body: {
        success: true,
        id: '50000000-0000-4000-8000-000000000001',
        appointment_time: '2027-10-10T09:30:00.000Z',
        professional_id: '10000000-0000-4000-8000-000000000001',
      },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/#/minha-area/barbearia-bob`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/10:30/).first()).toBeVisible({ timeout: 20_000 });
    await shot(page, 'client-390-c-r09-horario-novo.png');
  });
});
