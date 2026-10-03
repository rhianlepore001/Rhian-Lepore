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
  try {
    fs.writeFileSync(path.join(ARTIFACTS, name), buf);
  } catch {
    // artifacts pode falhar por I/O do ambiente; o print em OUT_DIR basta
  }
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

async function pickTime(page: Page, name: string) {
  const btn = page.getByTestId('reschedule-modal-body').getByRole('button', { name });
  await btn.evaluate((el) => {
    const grid = el.closest('[data-testid="reschedule-time-grid"]');
    if (!(grid instanceof HTMLElement) || !(el instanceof HTMLElement)) return;
    const box = grid.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const pad = 8;
    let delta = 0;
    if (r.top < box.top + pad) delta = r.top - box.top - pad;
    else if (r.bottom > box.bottom - pad) delta = r.bottom - box.bottom + pad;
    if (Math.abs(delta) > 1) grid.scrollTop += delta;
  });
  await btn.click({ force: true });
  await settle(page);
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
      await expect(page.getByTestId('reschedule-current')).toBeVisible();
      await expect(page.getByTestId('wizard-pro-list')).toBeVisible();
      await expect(page.getByTestId('reschedule-confirm')).toBeDisabled();
      await expect(page.getByTestId('reschedule-past-note')).toHaveCount(0);
      const atual = page.getByRole('button', { name: '06:00 Atual' });
      await expect(atual).toBeVisible();
      await expect(atual).toHaveAttribute('data-slot-state', 'atual');
      const atualClass = await atual.getAttribute('class');
      expect(atualClass).toMatch(/ring-2/);
      expect(atualClass).not.toMatch(/\bbg-theme-accent\b/);
      const dialogBox = await page.locator('[data-ui-modal-dialog]').boundingBox();
      const currentBox = await page.getByTestId('reschedule-current').boundingBox();
      const proBox = await page.getByTestId('wizard-pro-list').boundingBox();
      expect((currentBox?.y ?? 999) - (dialogBox?.y ?? 0)).toBeLessThan(140);
      expect((proBox?.y ?? 999) - (dialogBox?.y ?? 0)).toBeLessThan(420);
      await expect(page.getByRole('button', { name: '06:00 Atual' })).toBeVisible();
      await expect(page.getByRole('button', { name: '10:00 Ocupado' })).toBeDisabled();
      await expect(page.getByRole('button', { name: '15:00 Ocupado' })).toBeDisabled();
      await expect(page.getByRole('button', { name: '16:00 Ocupado' })).toBeDisabled();
      await expect(page.getByRole('button', { name: /12:00 Bloqueado/ })).toBeDisabled();
      await shot(page, `owner-${width}-3-remarcar-modal.png`);
      await pickTime(page, '11:30');
      await expect(page.getByTestId('reschedule-confirm')).toBeEnabled();
      await expect(page.getByTestId('reschedule-summary').first()).toContainText('De');
      await expect(page.getByTestId('reschedule-summary').first()).toContainText('Para');
      const picked = page.getByTestId('reschedule-modal-body').getByRole('button', { name: '11:30' });
      const gridBox = await page.getByTestId('reschedule-time-grid').boundingBox();
      const pickedBox = await picked.boundingBox();
      expect(pickedBox && gridBox).toBeTruthy();
      expect(pickedBox!.y).toBeGreaterThanOrEqual(gridBox!.y - 2);
      expect(pickedBox!.y + pickedBox!.height).toBeLessThanOrEqual(gridBox!.y + gridBox!.height + 2);
      if (width <= 390) {
        const slotButtons = page.getByTestId('reschedule-time-grid').locator('button[data-time]');
        const n = await slotButtons.count();
        const rowYs = new Set<number>();
        for (let i = 0; i < n; i++) {
          const b = await slotButtons.nth(i).boundingBox();
          if (!b || !gridBox) continue;
          const top = Math.max(b.y, gridBox.y);
          const bottom = Math.min(b.y + b.height, gridBox.y + gridBox.height);
          if (bottom - top >= b.height * 0.9) {
            rowYs.add(Math.round(b.y));
          }
        }
        expect(rowYs.size).toBeGreaterThanOrEqual(4);
      }
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

  for (const width of [375, 1440] as const) {
    test(`T-P06 ${width}: conflito R-06 e sucesso`, async ({ page }) => {
      guard = await installRemarcarMocks(page, { role: 'owner' });
      await openAgenda(page, width);
      await openDetails(page);
      await openReschedule(page);
      await pickTime(page, '11:30');

      guard.setRpc({
        status: 400,
        body: { message: SLOT_BUSY, hint: 'reschedule_slot_busy', code: 'P0001' },
      });
      await page.getByTestId('reschedule-confirm').click();
      await expect(page.getByTestId('reschedule-inline-error')).toHaveText(SLOT_BUSY, { timeout: 10_000 });
      await expect(page.getByRole('button', { name: '11:30 Ocupado' })).toBeDisabled();
      await expect(page.getByTestId('reschedule-confirm')).toBeDisabled();
      await expect(page.getByTestId('reschedule-summary')).toHaveCount(0);
      await shot(page, `owner-${width}-6-conflito.png`);

      await pickTime(page, '13:00');
      await expect(page.getByTestId('reschedule-inline-error')).toHaveCount(0);
      guard.setRpc({
        status: 200,
        body: { success: true, id: '50000000-0000-4000-8000-000000000001', appointment_time: '2026-08-23T12:00:00.000Z', professional_id: '10000000-0000-4000-8000-000000000001' },
      });
      await page.getByTestId('reschedule-confirm').click();
      await expect(page.getByText('Horário remarcado.')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('[data-highlight="true"]')).toBeVisible({ timeout: 15_000 });
      await shot(page, `owner-${width}-8-sucesso.png`);
    });
  }

  test('T-P06 390: conflito R-06, bloqueio M1, sucesso + foco', async ({ page }) => {
    guard = await installRemarcarMocks(page, { role: 'owner' });
    await openAgenda(page, 390);
    await openDetails(page);
    await openReschedule(page);
    await pickTime(page, '11:30');

    guard.setRpc({
      status: 400,
      body: { message: SLOT_BUSY, hint: 'reschedule_slot_busy', code: 'P0001' },
    });
    await page.getByTestId('reschedule-confirm').click();
    await expect(page.getByTestId('reschedule-inline-error')).toHaveText(SLOT_BUSY);
    await expect(page.getByRole('heading', { name: 'Remarcar horário' })).toBeVisible();
    await expect(page.getByRole('button', { name: '11:30 Ocupado' })).toBeDisabled();
    await expect(page.getByTestId('reschedule-confirm')).toBeDisabled();
    await expect(page.getByTestId('reschedule-summary')).toHaveCount(0);
    await shot(page, 'owner-390-6-conflito.png');

    await pickTime(page, '13:00');
    await expect(page.getByTestId('reschedule-inline-error')).toHaveCount(0);
    guard.setRpc({
      status: 400,
      body: { message: M1, hint: 'professional_blocked', code: 'P0001' },
    });
    await page.getByTestId('reschedule-confirm').click();
    await expect(page.getByTestId('reschedule-inline-error')).toHaveText(M1, { timeout: 10_000 });
    await shot(page, 'owner-390-7-bloqueio-m1.png');

    guard.setRpc({
      status: 200,
      body: { success: true, id: '50000000-0000-4000-8000-000000000001', appointment_time: '2026-08-23T12:00:00.000Z', professional_id: '10000000-0000-4000-8000-000000000001' },
    });
    await page.getByTestId('reschedule-confirm').click();
    await expect(page.getByText('Horário remarcado.')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-highlight="true"]')).toBeVisible({ timeout: 15_000 });
    await shot(page, 'owner-390-8-sucesso-foco.png');
  });

  test('T-P06 390: slot passado selecionado', async ({ page }) => {
    guard = await installRemarcarMocks(page, { role: 'owner' });
    await openAgenda(page, 390);
    await openDetails(page);
    await openReschedule(page);
    await pickTime(page, '05:00');
    await expect(page.getByTestId('reschedule-past-note').first()).toHaveText(PAST);
    await expect(page.getByTestId('reschedule-confirm')).toBeEnabled();
    await shot(page, 'owner-390-9-passado-selecionado.png');
  });

  for (const width of WIDTHS) {
    test(`C-R03 staff own ${width}: Remarcar no próprio com profissional travado`, async ({ page }) => {
      guard = await installRemarcarMocks(page, { role: 'staff', scope: 'own' });
      await openAgenda(page, width);
      await openDetails(page);
      await expect(page.getByTestId('appointment-reschedule')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Detalhes do Agendamento/i })).toBeVisible();
      await expect(page.getByText(/Aline Lima/).first()).toBeVisible();
      await expect(page.getByText(/Bob/).first()).toBeVisible();
      await shot(page, `staff-own-${width}-2-detalhes.png`);
      await openReschedule(page);
      await expect(page.getByTestId('reschedule-current')).toBeVisible();
      await expect(page.getByTestId('wizard-pro-list')).toBeVisible();
      await expect(page.getByTestId('reschedule-lock-pro-note')).toBeVisible();
      const dialogBox = await page.locator('[data-ui-modal-dialog]').boundingBox();
      const lockBox = await page.getByTestId('reschedule-lock-pro-note').boundingBox();
      const currentBox = await page.getByTestId('reschedule-current').boundingBox();
      expect((currentBox?.y ?? 999) - (dialogBox?.y ?? 0)).toBeLessThan(140);
      expect((lockBox?.y ?? 999) - (dialogBox?.y ?? 0)).toBeLessThan(280);
      await expect(page.getByTestId('reschedule-modal-body').getByRole('button', { name: /Bruna/ })).toBeDisabled();
      await expect(page.getByTestId('reschedule-modal-body').getByRole('button', { name: /Bob/ }).first()).toBeEnabled();
      await expect(page.getByTestId('reschedule-current')).toContainText('com Bob');
      await shot(page, `staff-own-${width}-3-seletor-travado.png`);
    });
  }

  test('C-R04 staff all 390: Remarcar qualquer um e troca profissional', async ({ page }) => {
    guard = await installRemarcarMocks(page, { role: 'staff', scope: 'all' });
    await openAgenda(page, 390);
    await openDetails(page);
    await expect(page.getByTestId('appointment-reschedule')).toBeVisible();
    await openReschedule(page);
    await expect(page.getByTestId('reschedule-lock-pro-note')).toHaveCount(0);
    await page.getByTestId('reschedule-modal-body').getByRole('button', { name: /Bruna/ }).click();
    await expect(page.getByTestId('reschedule-modal-body').getByRole('button', { name: /Bruna/ })).toHaveAttribute('aria-pressed', 'true');
    await pickTime(page, '11:30');
    await expect(page.getByTestId('reschedule-summary').first()).toContainText('Bruna');
    await settle(page);
    await shot(page, 'staff-all-390-3-troca-profissional.png');
  });

  // C-R09 UI-only: este spec só vê o mock de Minha Área. Cobertura real: T-R06 SQL.
  test('C-R09 390 (UI-only): link do cliente mostra o horário do mock', async ({ page }) => {
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
