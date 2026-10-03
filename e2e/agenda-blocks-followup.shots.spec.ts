import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { login } from './helpers/agendixLogin';
import { installProdWriteGuard, type ProdWriteGuard } from './helpers/prodWriteGuard';

const phase = process.env.SHOT_PHASE === 'before' ? 'before' : 'after';
const outDir = process.env.SHOT_DIR ?? `/opt/cursor/artifacts/screenshots/pr2-agenda-blocks/${phase}`;

const M2 = 'Não foi possível aceitar: o horário deste pedido está bloqueado na agenda de Diego. Recuse o pedido ou remova o bloqueio.';
const PAST = 'O início do bloqueio já passou. Ajustamos para agora — confira e confirme de novo.';

async function shot(page: Page, name: string) {
  fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

test.describe('follow-up bloqueio — copy M2 e bloqueio no passado', () => {
  let guard: ProdWriteGuard;

  test.beforeEach(async ({ page }) => {
    guard = await installProdWriteGuard(page);
  });

  test.afterEach(() => {
    guard.assertNoLeak();
  });

  for (const role of ['owner', 'staff'] as const) {
    for (const width of [375, 390, 1440]) {
      test(`${role} ${width} mostra M2 ao aceitar pedido bloqueado`, async ({ page }) => {
        await page.setViewportSize({ width, height: width >= 1000 ? 900 : 812 });
        guard.stubRpc('list_company_pending_public_bookings', {
          body: [{
            id: '70000000-0000-0000-0000-0000000000aa',
            customer_name: 'Aline Costa',
            customer_phone: '351600000001',
            appointment_time: new Date(Date.now() + 86400000).toISOString(),
            total_price: 45,
            duration_minutes: 30,
            professional_id: '10000000-0000-0000-0000-000000000001',
            professional_name: 'Diego',
            service_ids: [],
            status: 'pending',
          }],
        });
        guard.stubRpc('accept_public_booking', {
          status: 400,
          body: {
            message: 'Horário bloqueado na agenda de Diego. Para agendar, remova o bloqueio primeiro.',
            hint: 'professional_blocked',
            code: 'P0001',
          },
        });
        await login(page, role);
        await page.goto('/#/agenda');
        const accept = page.getByRole('button', { name: 'Aceitar' }).first();
        await expect(accept).toBeVisible({ timeout: 20000 });
        await shot(page, `${role}-${width}-1-pedido.png`);
        await accept.click();
        const toast = page.getByText(M2);
        if (phase === 'after') {
          await expect(toast).toBeVisible({ timeout: 10000 });
        }
        await shot(page, `${role}-${width}-2-m2.png`);
      });

      test(`${role} ${width} recusa bloqueio com início no passado`, async ({ page }) => {
        await page.setViewportSize({ width, height: width >= 1000 ? 900 : 812 });
        guard.stubRpc('list_company_pending_public_bookings', { body: [] });
        guard.stubRpc('create_agenda_block', {
          body: { success: false, code: 'block_starts_in_past', message: PAST },
        });
        await login(page, role);
        await page.goto('/#/agenda');
        await page.locator('#btn-new-appointment').click();
        const blockChoice = page.getByTestId('agenda-choice-block');
        if (await blockChoice.isVisible().catch(() => false)) {
          await blockChoice.click();
        }
        await expect(page.getByTestId('agenda-block-form')).toBeVisible({ timeout: 15000 });
        await shot(page, `${role}-${width}-3-form.png`);
        await page.getByTestId('agenda-block-submit').click();
        if (phase === 'after') {
          await expect(page.getByText(PAST)).toBeVisible({ timeout: 10000 });
        }
        await shot(page, `${role}-${width}-4-passado.png`);
      });
    }
  }
});
