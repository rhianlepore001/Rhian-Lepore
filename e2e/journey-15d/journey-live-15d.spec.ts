/**
 * Journey live — recorte do ciclo de receita + financeiro (requer credenciais).
 * Complementa journey-15d.spec.ts nos 3 viewports quando E2E_OWNER_* estiver definido.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { JourneyLedger } from './helpers/journeyLedger';
import { agendaUrl } from './helpers/virtualCalendar';

const BASE = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? '';
const OWNER_PASS = process.env.E2E_OWNER_PASS ?? '';
const TZ = 'America/Sao_Paulo';

async function loginOwner(page: Page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'load' });
  const entrar = page.getByText('ENTRAR').first();
  await entrar.waitFor({ timeout: 20_000 });
  await entrar.click();
  await page.locator('input[type="email"]').fill(OWNER_EMAIL);
  await page.locator('input[type="password"]').fill(OWNER_PASS);
  await page.locator('button[type="submit"]').click();
  await page.getByText('Olá,').first().waitFor({ timeout: 30_000 });
}

test.describe('Journey live — dono real', () => {
  test.beforeEach(() => {
    test.skip(!OWNER_EMAIL || !OWNER_PASS, 'Defina E2E_OWNER_EMAIL e E2E_OWNER_PASS para o journey live.');
  });
  test.setTimeout(400_000);

  test('ciclo receita + comissões (live)', async ({ browser }, testInfo) => {
    const ledger = new JourneyLedger(`live-${testInfo.project.name}`);
    const ownerCtx = await browser.newContext({
      timezoneId: TZ,
      locale: 'pt-BR',
      viewport: testInfo.project.use?.viewport ?? { width: 1440, height: 900 },
    });
    const owner = await ownerCtx.newPage();

    await ledger.run('LIVE-agenda', 8, 'Agenda com data âncora', async () => {
      await loginOwner(owner);
      await owner.goto(agendaUrl(BASE, 8));
      await expect(owner.getByRole('heading', { name: /^Agenda$/ })).toBeVisible({ timeout: 30_000 });
    });

    await ledger.run('LIVE-financeiro', 11, 'Financeiro visível', async () => {
      await owner.goto(`${BASE}/#/financeiro`);
      await expect(owner.getByRole('tab', { name: /Visão geral/i })).toBeVisible({ timeout: 30_000 });
    });

    await ledger.run('LIVE-comissoes', 12, 'Aba comissões', async () => {
      await owner.goto(`${BASE}/#/financeiro?tab=commissions`);
      await expect(owner.getByRole('heading', { name: 'Pagamento de comissão' })).toBeVisible({ timeout: 30_000 });
    });

    ledger.flush();
    await ownerCtx.close();
  });
});
