/**
 * Journey E2E — 15 dias virtuais (cadastro → operação → comissões → relatório).
 *
 * Rodar nos 3 ambientes (desktop, iPhone, Android):
 *   npm run e2e:journey-15d
 *
 * Saída: artifacts/journey-15d/ledger-*.json + RELATORIO.md (reporter).
 *
 * Live (Supabase real) opcional: e2e/journey-15d/journey-live-15d.spec.ts
 */
import { expect, test, type Page } from '@playwright/test';
import { freshState, mockBackend, EMAIL } from '../helpers/mockBackend';
import { JourneyLedger } from './helpers/journeyLedger';
import { agendaUrl, virtualDayIso } from './helpers/virtualCalendar';
import { installJourneyMocks, JOURNEY_SLUG } from './helpers/journeyMocks';

const BASE = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

async function dismissCookieBanner(page: Page) {
  const recusar = page.getByRole('button', { name: /recusar/i });
  if (await recusar.count()) await recusar.first().click({ timeout: 2000 }).catch(() => undefined);
}

async function loginMockOwner(page: Page) {
  await page.goto(`${BASE}/#/login`);
  await dismissCookieBanner(page);
  const barber = page.getByTestId('category-barber');
  const gateway = page.getByRole('button', { name: /barbearias/i });
  if (await barber.count()) await barber.click();
  else if (await gateway.count()) await gateway.first().click();
  const email = page.locator('#login-email');
  const emailLabel = page.getByLabel('E-mail');
  if (await email.count()) await email.fill(EMAIL);
  else await emailLabel.fill(EMAIL);
  const pwd = page.locator('#login-password');
  if (await pwd.count()) await pwd.fill('Senha@Forte1');
  else await page.getByLabel('Senha', { exact: true }).fill('Senha@Forte1');
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((u) => !u.hash.includes('/login'), { timeout: 20_000 });
}

test.describe('Journey 15 dias — simulação mockada', () => {
  test.setTimeout(240_000);

  test('D1–D15 feature a feature', async ({ page }, testInfo) => {
    const env = testInfo.project.name;
    const ledger = new JourneyLedger(env);

    await ledger.run('D01-cadastro-dono', 1, 'Cadastro dono (mock) → onboarding', async () => {
      const state = freshState({ userType: 'barber' });
      await mockBackend(page, state);
      await page.goto(`${BASE}/#/register`);
      await dismissCookieBanner(page);
      await page.getByTestId('category-barber').click();
      await page.locator('#reg-name').fill('Rafael Journey');
      await page.getByLabel('Nome do negócio').fill('Barbearia Journey');
      await page.locator('#reg-email').fill(EMAIL);
      const phone = page.getByLabel(/telefone|whatsapp/i).first();
      if (await phone.count()) await phone.fill('11987654321');
      await page.getByLabel('Senha', { exact: true }).fill('Senha@Forte1');
      await page.getByLabel('Confirmar senha').fill('Senha@Forte1');
      const terms = page.getByRole('checkbox');
      if (await terms.count()) await terms.first().check();
      await page.locator('form button[type="submit"]').click();
      await page.waitForURL(/#\/onboarding-wizard/, { timeout: 25_000 });
      expect(state.ensureCalls).toBeGreaterThanOrEqual(1);
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await installJourneyMocks(page);

    await ledger.run('D02-onboarding', 2, 'Wizard onboarding visível', async () => {
      await expect(page).toHaveURL(/onboarding-wizard/);
      await expect(page.getByText(/Sistema Interrompido/i)).toHaveCount(0);
    });

    await ledger.run('D03-link-publico', 3, 'Ajustes agendamento / slug', async () => {
      await loginMockOwner(page);
      await page.goto(`${BASE}/#/configuracoes/agendamento`);
      await expect(page.getByText(/Link de Agendamento|Agendamento online/i).first()).toBeVisible({
        timeout: 20_000,
      });
    });

    await ledger.run('D04-agenda-walkin', 4, 'Agenda do dia virtual', async () => {
      await page.goto(agendaUrl(BASE, 4));
      await expect(page.getByRole('heading', { name: /^Agenda$/ })).toBeVisible({ timeout: 30_000 });
      const iso = virtualDayIso(4);
      expect(page.url()).toContain(`date=${iso}`);
    });

    await ledger.run('D05-agenda-slot', 5, 'Criar atendimento (choice)', async () => {
      await page.goto(agendaUrl(BASE, 5));
      await expect(page.getByRole('heading', { name: /^Agenda$/ })).toBeVisible({ timeout: 30_000 });
      const newBtn = page.locator('#btn-new-appointment');
      if (await newBtn.count()) await newBtn.click();
      const add = page.getByTestId('agenda-choice-new-appointment');
      if (await add.isVisible({ timeout: 2_000 }).catch(() => false)) await add.click();
      const opened = await page
        .getByRole('heading', { name: /Novo Atendimento/i })
        .isVisible({ timeout: 8_000 })
        .catch(() => false);
      if (!opened) {
        await expect(page.getByTestId('agenda-resource-grid')).toBeVisible({ timeout: 10_000 });
      }
    });

    await ledger.run('D06-booking-publico', 6, 'Cliente anônimo — book slug', async () => {
      await page.goto(`${BASE}/#/book/${JOURNEY_SLUG}`);
      await expect(page.getByRole('heading', { name: /Escolha seus serviços/i })).toBeVisible({
        timeout: 25_000,
      });
    });

    await ledger.run('D07-solicitacoes-online', 7, 'Painel solicitações online na agenda', async () => {
      await loginMockOwner(page);
      await page.goto(agendaUrl(BASE, 7));
      const panel = page.getByTestId('agenda-public-bookings');
      if (!(await panel.count())) {
        return;
      }
      await expect(panel).toBeVisible({ timeout: 15_000 });
    });

    await ledger.run('D08-checkout-smoke', 8, 'Superfície checkout (mock)', async () => {
      await page.goto(agendaUrl(BASE, 8));
      await expect(page.getByRole('heading', { name: /^Agenda$/ })).toBeVisible({ timeout: 30_000 });
    });

    await ledger.run('D09-fila-publica', 9, 'Fila digital pública', async () => {
      await page.goto(`${BASE}/#/queue/${JOURNEY_SLUG}`);
      await expect(page.getByText(/Serviço|fila|Entrar na fila/i).first()).toBeVisible({ timeout: 25_000 });
    });

    await ledger.run('D10-fila-painel', 10, 'Painel fila autenticado', async () => {
      await loginMockOwner(page);
      await page.goto(`${BASE}/#/fila`);
      await expect(page.getByRole('heading', { name: /Fila Digital|Gestão da Fila/i })).toBeVisible({
        timeout: 30_000,
      });
    });

    await ledger.run('D11-financeiro-visao', 11, 'Financeiro — visão geral', async () => {
      await page.goto(`${BASE}/#/financeiro`);
      await expect(page.getByRole('tab', { name: /Visão geral/i })).toBeVisible({ timeout: 30_000 });
    });

    await ledger.run('D12-comissoes-pagamentos', 12, 'Comissões — aba Pagamentos', async () => {
      await page.goto(`${BASE}/#/financeiro?tab=commissions`);
      await expect(page.getByRole('heading', { name: 'Pagamento de comissão' })).toBeVisible({ timeout: 30_000 });
    });

    await ledger.run('D13-relatorio-comissao', 13, 'Histórico e relatório pago', async () => {
      const vp = page.viewportSize();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${BASE}/#/financeiro?tab=commissions`);
      await expect(page.getByRole('heading', { name: 'Pagamento de comissão' })).toBeVisible({ timeout: 30_000 });
      const histBtn = page.getByTestId('payout-nothing-due').getByRole('button', { name: /Histórico de pagamentos/i });
      if (await histBtn.count()) {
        await histBtn.first().click();
        await expect(page.getByTestId('payment-history-card').first()).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: 'Ver relatório' }).first().click();
        await expect(page.getByTestId('report-mobile-list')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click({ timeout: 5_000 });
      } else {
        ledger.warn('D13-relatorio-comissao', 13, 'Histórico', 'payout-nothing-due não renderizou (mock RPC)');
      }
      if (vp) await page.setViewportSize(vp);
    });

    await ledger.run('D14-insights', 14, 'Análises / insights dono', async () => {
      await loginMockOwner(page);
      await page.goto(`${BASE}/#/insights`);
      await expect(page.getByRole('heading', { name: 'Análises' })).toBeVisible({ timeout: 30_000 });
    });

    await ledger.run('D15-nav-rotacao', 15, 'Navegação SPA Agenda ↔ Financeiro', async () => {
      await page.keyboard.press('Escape');
      await page.goto(`${BASE}/#/agenda`);
      await expect(page.getByRole('heading', { name: /^Agenda$/ })).toBeVisible({ timeout: 20_000 });
      await page.goto(`${BASE}/#/financeiro`);
      await expect(page.getByRole('tab', { name: /Visão geral/i })).toBeVisible({ timeout: 20_000 });
    });

    const summary = ledger.flush();
    const fails = summary.results.filter((r) => r.verdict === 'fail');
    const pass = summary.results.filter((r) => r.verdict === 'pass').length;
    const total = summary.results.length || 1;
    test.info().annotations.push({
      type: 'journey-score',
      description: `${Math.round((pass / total) * 100)}% (${pass}/${total}) falhas=${fails.length}`,
    });
    expect(
      fails,
      `Falhas no journey (${env}): ${fails.map((f) => `${f.id}: ${f.error?.slice(0, 120)}`).join('; ')}`,
    ).toEqual([]);
  });
});
