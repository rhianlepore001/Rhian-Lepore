/**
 * Prints antes/depois do hotfix B-41 (fechar senha da fila durante bloqueio).
 * Toda escrita em prod é bloqueada (e2e/helpers/prodWriteGuard.ts); o retorno de
 * settle_queue_ticket é simulado com a resposta exata do live:
 *   SHOT_PHASE=before → erro do trigger ("Este horário está bloqueado...")
 *   SHOT_PHASE=after  → 204 (comportamento com 20261003110000)
 * A comanda aberta é injetada na resposta GET de queue_entries (não grava nada).
 *
 *   SHOT_PHASE=before SHOT_DIR=/opt/cursor/artifacts/screenshots/pr1/before \
 *     npx playwright test e2e/agenda-blocks-queue-settle.shots.spec.ts --project=chromium-legacy
 */
import { test, expect } from '@playwright/test';
import { installProdWriteGuard } from './helpers/prodWriteGuard';
import { BASE, login, type Role } from './helpers/agendixLogin';

const PHASE = process.env.SHOT_PHASE === 'after' ? 'after' : 'before';
const DIR = process.env.SHOT_DIR || `artifacts/agenda-blocks/pr1/${PHASE}`;
const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
];
const ROLES: Role[] = ['owner', 'staff'];

test.use({ serviceWorkers: 'block' });

for (const role of ROLES) {
  for (const vp of VIEWPORTS) {
    test(`${PHASE} ${role} ${vp.name}: fechar comanda da fila com bloqueio ativo`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);

      let professionalId: string | null = null;
      await page.route(/\/rest\/v1\/team_members\?/, async (route) => {
        const response = await route.fetch();
        const rows = await response.json().catch(() => null);
        if (Array.isArray(rows) && rows[0]?.id && !professionalId) professionalId = rows[0].id;
        await route.fulfill({ response, json: rows });
      });
      await page.route(/\/rest\/v1\/queue_entries\?.*status=in/, async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const response = await route.fetch();
        const rows = await response.json().catch(() => []);
        const businessId = new URL(route.request().url()).searchParams.get('business_id')?.replace(/^eq\./, '') ?? 'x';
        const now = new Date().toISOString();
        const injected = {
          id: '00000000-0000-4000-8000-0000000b4141',
          business_id: businessId,
          client_name: 'Marta Teste (simulado)',
          client_phone: '351600000077',
          service_id: null,
          professional_id: professionalId,
          status: 'completed',
          joined_at: now,
          serving_at: now,
          closed_at: now,
          duration_minutes: 30,
          service_price_cents: 1500,
          payment_method: 'cash',
          payment_status: 'paid',
          ticket_status: 'open',
          ticket_items: [],
        };
        await route.fulfill({ response, json: [...(Array.isArray(rows) ? rows : []), injected] });
      });

      guard.stubRpc('settle_queue_ticket', PHASE === 'before'
        ? { status: 400, body: { code: 'P0001', message: 'Este horário está bloqueado. Remova o bloqueio para agendar.', hint: 'agenda_blocked', details: null } }
        : { status: 204 });

      await login(page, role);
      await page.goto(`${BASE}/#/fila`, { waitUntil: 'load' });
      const card = page.getByText('Marta Teste (simulado)').first();
      await card.waitFor({ timeout: 30_000 });
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${DIR}/${role}-${vp.name}-1-comanda.png`, fullPage: false });

      await page.locator('div', { has: card }).getByRole('button', { name: 'Finalizar' }).last().click();
      const finalize = page.getByRole('button', { name: /Finalizar atendimento|e finalizar/ }).first();
      await finalize.waitFor({ timeout: 10_000 });
      const whoServed = page.getByRole('combobox', { name: 'Quem atendeu' });
      if (await whoServed.isVisible().catch(() => false)) {
        await whoServed.selectOption({ index: 1 });
      }
      await finalize.click();

      const toast = PHASE === 'before'
        ? page.getByText('Não foi possível finalizar a comanda. Tente de novo.')
        : page.getByText(/Atendimento de Marta Teste \(simulado\) finalizado\./);
      await expect(toast.first()).toBeVisible({ timeout: 10_000 });
      await page.screenshot({ path: `${DIR}/${role}-${vp.name}-2-resultado.png`, fullPage: false });

      expect(guard.blocked.some((b) => b.url.includes('/rpc/settle_queue_ticket') && b.stubbed)).toBe(true);
      guard.assertNoLeak();
    });
  }
}
