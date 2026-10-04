/**
 * E2E Fin PR-G — acertos de UI vindos do celular real (Android Chrome ~412 px, salão, escuro):
 * 1) Assistente desligado (sem item no "⋯", sem botão, sem painel e sem módulo carregado);
 * 2) Pagamentos: período, resumo, seletor de ciclo e A pagar/Pagos num único cartão;
 * 3) Sem rolagem lateral no Financeiro (3 abas × 360/390/412 × claro/escuro). Mocks, sem escrita em prod.
 *
 *   E2E_SHOTS_DIR=/workspace/pr-g-shots npx playwright test e2e/fin-g-ui.spec.ts --project=chromium-legacy
 */
import { expect, test, type Page } from '@playwright/test';
import { installProdWriteGuard } from './helpers/prodWriteGuard';
import { cycle, openFinance, setMode, shot, staffId, stubApp } from './helpers/finLayoutMocks';

const ARTIFACTS = process.env.E2E_SHOTS_DIR || '/opt/cursor/artifacts/screenshots/fin-g';
const snap = (page: Page, name: string, fullPage = false) => shot(page, ARTIFACTS, name, fullPage);

const member = (over: Record<string, unknown>) => ({
  status: 'nada_a_pagar', inactive: false, photo_url: null, pago_ciclo: null, a_pagar_ciclo: 0,
  pago_ciclo_em: null, pago_calculado: 0, produtos_ciclo: 0, saldo_anterior: 0, primeiro_nao_pago: null,
  servicos_ciclo: 0, saldo_acumulado: 0, ultimo_pagamento: null, ...over,
});
/** Como no print: ciclo mensal fechado 06/08 – 05/09, 68,00 € · 4 pendentes. */
const cycleClosed = {
  ...cycle,
  cycle: { start: '2026-08-06', end: '2026-09-05', open: false, pay_due: '2026-09-07' },
  pay_due: '2026-09-07', previous_end: '2026-08-05', next_end: '2026-10-05',
  totals: { a_pagar_ciclo: 68, pendentes: 4, pago_ciclo: 0 },
  members: ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Diego Rocha'].map((name, i) => member({
    name, professional_id: staffId(i), status: 'pendente', a_pagar_ciclo: 17, servicos_ciclo: 1,
    commission_rate: 40 - i, saldo_acumulado: 17, primeiro_nao_pago: '2026-08-10',
  })),
};
const HISTORY = ['May', 'June', 'July', 'August', 'September', 'October'].map((m, i) => ({
  month_name: m, year_num: 2026, revenue: 12800 + i * 900, expenses: 3000 + i * 200, profit: 9800 + i * 700,
}));
const SALAO = { theme: 'beauty' as const, businessName: 'Barbearia Silva', cycle: cycleClosed, monthlyHistory: HISTORY };
const TABS = [
  { id: 'overview', name: 'Visão geral' },
  { id: 'commissions', name: 'Pagamentos' },
  { id: 'history', name: 'Histórico' },
] as const;

async function tabReady(page: Page, id: (typeof TABS)[number]['id']) {
  if (id === 'overview') await expect(page.getByTestId('finance-tx-card').first()).toBeVisible({ timeout: 15_000 });
  if (id === 'commissions') await expect(page.getByTestId('payout-summary-card')).toBeVisible({ timeout: 15_000 });
  if (id === 'history') await expect(page.getByTestId('history-kpis')).toBeVisible({ timeout: 15_000 });
}

/** Nem o documento nem o contêiner de rolagem do app (Layout) podem ser mais largos que a tela. */
async function expectNoSideScroll(page: Page, label: string) {
  await expect(page.locator('[data-app-scroll]')).toHaveCount(1);
  const r = await page.evaluate(() => {
    const app = document.querySelector('[data-app-scroll]') as HTMLElement;
    return {
      doc: document.scrollingElement!.scrollWidth,
      iw: window.innerWidth,
      app: app.scrollWidth - app.clientWidth,
    };
  });
  expect(r.doc, `${label}: document.scrollingElement.scrollWidth <= innerWidth`).toBeLessThanOrEqual(r.iw);
  expect(r.app, `${label}: contêiner do app sem largura extra`).toBeLessThanOrEqual(0);
}

test.describe('Fin PR-G UI', () => {
  test.setTimeout(240_000);
  test.use({ isMobile: true, hasTouch: true });

  test('1 · Assistente desligado: "⋯" só com Filtrar e Exportar; nada de painel nem módulo', async ({ page }) => {
    const loaded: string[] = [];
    page.on('request', (req) => { if (/AIAssistant/i.test(req.url())) loaded.push(req.url()); });
    const guard = await installProdWriteGuard(page);
    await stubApp(page, guard, 'dark', SALAO);
    await page.setViewportSize({ width: 412, height: 915 });
    await openFinance(page);
    await tabReady(page, 'overview');
    await expect(page.getByRole('button', { name: /assistente/i })).toHaveCount(0);
    const more = page.getByRole('button', { name: 'Mais ações do financeiro' });
    await more.click();
    const menu = page.getByRole('menu', { name: 'Mais ações do financeiro' });
    await expect(menu.getByRole('menuitem')).toHaveText(['Filtrar', 'Exportar']);
    await snap(page, 'financeiro-412-dark-menu');
    await page.keyboard.press('Escape');

    // Pagamentos e Histórico não têm ações extras: sem "⋯" vazio.
    await page.getByRole('tab', { name: 'Pagamentos' }).click();
    await tabReady(page, 'commissions');
    await expect(more).toHaveCount(0);
    await page.getByRole('tab', { name: 'Histórico' }).click();
    await expect(more).toHaveCount(0);

    await setMode(page, 'light');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('tab', { name: 'Visão geral' }).click();
    await tabReady(page, 'overview');
    await more.click();
    await expect(menu.getByRole('menuitem')).toHaveText(['Filtrar', 'Exportar']);
    await snap(page, 'financeiro-390-light-menu');
    await page.keyboard.press('Escape');

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole('button', { name: 'Filtrar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Exportar' })).toBeVisible();
    await expect(page.getByRole('button', { name: /assistente/i })).toHaveCount(0);
    await expect(page.getByText('Assistente AgendiX')).toHaveCount(0);
    expect(loaded, 'módulo do assistente não carrega').toEqual([]);
    guard.assertNoLeak();
  });

  for (const v of [{ w: 412, h: 915, mode: 'dark' as const }, { w: 390, h: 844, mode: 'light' as const }]) {
    test(`2 · Pagamentos ${v.w} ${v.mode}: período, resumo, ciclo e A pagar/Pagos num só cartão`, async ({ page }) => {
      const guard = await installProdWriteGuard(page);
      await stubApp(page, guard, v.mode, SALAO);
      await page.setViewportSize({ width: v.w, height: v.h });
      await openFinance(page, 'commissions');
      const card = page.getByTestId('payout-summary-card');
      await expect(card).toBeVisible({ timeout: 15_000 });
      await expect(card.getByRole('button', { name: 'Ciclo anterior' })).toBeVisible();
      await expect(card).toContainText('Mensal · fechado');
      await expect(card.getByTestId('commission-cycle-header')).toContainText('Período 06/08 – 05/09');
      await expect(card.getByTestId('commission-cycle-header')).toContainText('pagar até 07/09');
      await expect(card.getByTestId('payout-summary')).toContainText('A pagar');
      await expect(card.getByTestId('payout-summary')).toContainText('68,00');
      await expect(card.getByTestId('payout-summary')).toContainText('4 pendentes');
      await expect(card.getByTestId('payout-summary')).toContainText('Pago neste ciclo');
      await expect(card.getByRole('tablist', { name: 'Repasses' })).toBeVisible();
      // Cartão de verdade: fundo e borda próprios, ocupando a largura do conteúdo.
      const style = await card.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { bg: cs.backgroundColor, border: cs.borderTopWidth };
      });
      expect(style.bg).not.toBe('rgba(0, 0, 0, 0)');
      expect(parseFloat(style.border)).toBeGreaterThan(0);
      const box = (await card.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(v.w);
      // O valor a pagar é o número em destaque do cartão.
      const big = card.getByTestId('payout-summary-amount');
      await expect(big).toContainText('68,00');
      const fs = await big.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(fs).toBeGreaterThanOrEqual(24);
      // A pagar / Pagos continua alternando.
      await card.getByRole('tab', { name: 'Pagos' }).click();
      await expect(card.getByRole('tab', { name: 'Pagos' })).toHaveAttribute('aria-selected', 'true');
      await card.getByRole('tab', { name: 'A pagar' }).click();
      await expect(page.getByTestId(`payout-row-${staffId(0)}`)).toBeVisible();
      guard.assertNoLeak();
    });
  }

  test('3 · Sem rolagem lateral: 3 abas × 360/390/412 × claro/escuro', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    await stubApp(page, guard, 'dark', SALAO);
    await page.setViewportSize({ width: 412, height: 915 });
    await openFinance(page);
    for (const mode of ['light', 'dark'] as const) {
      await setMode(page, mode);
      for (const w of [360, 390, 412]) {
        await page.setViewportSize({ width: w, height: 860 });
        for (const t of TABS) {
          await page.getByRole('tab', { name: t.name }).click();
          await tabReady(page, t.id);
          await page.waitForTimeout(600);
          await expectNoSideScroll(page, `${t.name} ${w} ${mode}`);
          const shotFor = (w === 412 && mode === 'dark') || (w === 390 && mode === 'light');
          if (shotFor) await snap(page, `${t.id === 'overview' ? 'financeiro' : t.id === 'commissions' ? 'pagamentos' : 'historico'}-${w}-${mode}`);
        }
      }
    }
    guard.assertNoLeak();
  });
});
