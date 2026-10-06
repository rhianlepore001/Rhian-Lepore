/**
 * Screenshots — excluir profissional com atendimento em aberto.
 * Prod SÓ LEITURA com o dono de teste: toda escrita no Supabase é bloqueada
 * (installProdWriteGuard) e delete_staff_collaborator é STUBADO com o erro da guarda
 * nova (nada é excluído de verdade). A lista vem dos atendimentos reais do Bob.
 *
 *   E2E_OWNER_EMAIL=Bob.teste@gmail.com E2E_OWNER_PASS='BobTeste@123' \
 *   SHOTS_DIR=/workspace/screens/delete-staff \
 *     npx playwright test e2e/delete-staff-open-appointments.shots.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { BASE, login } from './helpers/agendixLogin';
import { installProdWriteGuard } from './helpers/prodWriteGuard';

const SHOTS = process.env.SHOTS_DIR || '/workspace/screens/delete-staff';
const MEMBER = process.env.E2E_MEMBER_NAME || 'Bob Funcionario';

async function openDeleteModal(page: Page) {
  await page.goto(`${BASE}/#/configuracoes/equipe`, { waitUntil: 'domcontentloaded' });
  const row = page.getByTestId('team-member-row').filter({ hasText: MEMBER }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByRole('button', { name: `Editar ${MEMBER}` }).click();
  await page.getByRole('button', { name: 'Excluir profissional' }).click();
  const confirm = page.getByRole('dialog').filter({ hasText: /remove o acesso/i });
  await expect(confirm).toBeVisible({ timeout: 10_000 });
  await confirm.getByRole('button', { name: 'Excluir', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Ainda há atendimentos em aberto' });
  await expect(modal).toBeVisible({ timeout: 15_000 });
  await expect(modal.getByTestId('staff-open-appointment-row').first()).toBeVisible({ timeout: 20_000 });
  await page.mouse.move(2, 2); // sem hover "preso" na linha sob o cursor
  await page.waitForTimeout(400); // animação de entrada
  return modal;
}

const variants = [
  { name: 'barber-light', mode: 'light', viewport: { width: 1440, height: 900 } },
  { name: 'barber-dark', mode: 'dark', viewport: { width: 1440, height: 900 } },
  { name: 'mobile-375-dark', mode: 'dark', viewport: { width: 375, height: 812 } },
  { name: 'mobile-375-light', mode: 'light', viewport: { width: 375, height: 812 } },
] as const;

test.describe('Excluir profissional com atendimento em aberto (screens)', () => {
  test.setTimeout(240_000);

  for (const v of variants) {
    test(`modal ${v.name}`, async ({ page }) => {
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.addInitScript((mode) => localStorage.setItem('agendix_color_mode', mode), v.mode);
      await page.setViewportSize(v.viewport);
      const guard = await installProdWriteGuard(page);
      guard.stubRpc('delete_staff_collaborator', {
        status: 400,
        body: { code: 'P0001', message: 'STAFF_HAS_OPEN_APPOINTMENTS', details: 'open_count=1', hint: 'staff_has_open_appointments' },
      });
      // RPC de leitura (POST) que a Agenda chama no load: stub vazio, nada vai para a rede.
      guard.stubRpc('list_company_pending_public_bookings', { status: 200, body: [] });
      await login(page, 'owner');
      const modal = await openDeleteModal(page);
      await page.screenshot({ path: path.join(SHOTS, `modal-${v.name}.png`) });

      if (v.name === 'barber-light' || v.name === 'mobile-375-dark') {
        await modal.getByTestId('staff-open-appointments-view').click();
        await expect(page).toHaveURL(/#\/agenda\?date=\d{4}-\d{2}-\d{2}&appointment=/, { timeout: 15_000 });
        // detalhe do atendimento aberto pelo deep link
        await expect(page.getByRole('dialog').filter({ hasText: /Finalizar|Concluir|Detalhes/i }).first()).toBeVisible({ timeout: 30_000 });
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SHOTS, `agenda-after-ver-atendimento-${v.name}.png`) });
      }
      expect(guard.blocked.some((b) => b.url.includes('/rpc/delete_staff_collaborator') && b.stubbed)).toBe(true);
      guard.assertNoLeak();
    });
  }

  test('legado 23503: mensagem amigável, sem código cru', async ({ page }) => {
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.addInitScript(() => localStorage.setItem('agendix_color_mode', 'light'));
    await page.setViewportSize({ width: 1440, height: 900 });
    const guard = await installProdWriteGuard(page);
    guard.stubRpc('delete_staff_collaborator', {
      status: 409,
      body: {
        code: '23503',
        message: 'update or delete on table "profiles" violates foreign key constraint "appointments_user_id_fkey" on table "appointments"',
        details: 'Key (id)=(…) is still referenced from table "appointments".',
        hint: null,
      },
    });
    await login(page, 'owner');
    await page.goto(`${BASE}/#/configuracoes/equipe`, { waitUntil: 'domcontentloaded' });
    const row = page.getByTestId('team-member-row').filter({ hasText: MEMBER }).first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.getByRole('button', { name: `Editar ${MEMBER}` }).click();
    await page.getByRole('button', { name: 'Excluir profissional' }).click();
    const confirm = page.getByRole('dialog').filter({ hasText: /remove o acesso/i });
    await confirm.getByRole('button', { name: 'Excluir', exact: true }).click();
    await expect(page.getByText(/registros antigos ligados ao acesso dele/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('23503')).toHaveCount(0);
    await page.screenshot({ path: path.join(SHOTS, 'toast-legacy-23503-barber-light.png') });
    guard.assertNoLeak();
  });
});
