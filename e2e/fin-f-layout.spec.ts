/**
 * E2E Fin PR-F — topo do Financeiro com "⋯" e mês na linha do título (#9),
 * Pagamentos com "Nada a pagar" em lista simples (#10), Histórico com números
 * iguais aos da Visão geral (#11) e acertos de Ajustes › Equipe. Mocks, sem escrita em prod.
 *
 *   E2E_SHOTS_DIR=/tmp/shots npx playwright test e2e/fin-f-layout.spec.ts --project=chromium-legacy
 */
import { expect, test, type Page } from '@playwright/test';
import { installProdWriteGuard } from './helpers/prodWriteGuard';
import {
  ANA_ID, BASE, BRUNO_ID, cycle, openFinance, setMode, shot, staffId, stubApp,
} from './helpers/finLayoutMocks';

const ARTIFACTS = process.env.E2E_SHOTS_DIR || '/opt/cursor/artifacts/screenshots/fin-f';
const snap = (page: Page, name: string, fullPage = true) => shot(page, ARTIFACTS, name, fullPage);
const CARLA_ID = staffId(2);
const DIEGO_ID = staffId(3);

const member = (over: Record<string, unknown>) => ({
  status: 'nada_a_pagar', inactive: false, photo_url: null, pago_ciclo: null, a_pagar_ciclo: 0,
  pago_ciclo_em: null, pago_calculado: 0, produtos_ciclo: 0, saldo_anterior: 0, primeiro_nao_pago: null,
  servicos_ciclo: 0, saldo_acumulado: 0, ultimo_pagamento: null, ...over,
});

const cycleMixed = {
  ...cycle,
  totals: { a_pagar_ciclo: 39, pendentes: 1, pago_ciclo: 120 },
  members: [
    member({ name: 'Ana Souza', professional_id: ANA_ID, status: 'pendente', a_pagar_ciclo: 39, servicos_ciclo: 2, commission_rate: 40, saldo_acumulado: 39, primeiro_nao_pago: '2026-09-10' }),
    member({ name: 'Bruno Lima', professional_id: BRUNO_ID, commission_rate: 39 }),
    member({ name: 'Carla Dias', professional_id: CARLA_ID, status: 'pago', pago_ciclo: 120, pago_calculado: 120, pago_ciclo_em: '2026-10-02T10:00:00+01:00', servicos_ciclo: 6, commission_rate: 38 }),
    member({ name: 'Diego Rocha', professional_id: DIEGO_ID, commission_rate: 37 }),
  ],
};

const cycleNothing = {
  ...cycle,
  totals: { a_pagar_ciclo: 0, pendentes: 0, pago_ciclo: 0 },
  members: [
    member({ name: 'Ana Souza', professional_id: ANA_ID, commission_rate: 40 }),
    member({ name: 'Bruno Lima', professional_id: BRUNO_ID, commission_rate: 39 }),
  ],
};

const HISTORY = ['May', 'June', 'July', 'August', 'September', 'October'].map((m, i) => ({
  month_name: m, year_num: 2026, revenue: 800 + i * 90, expenses: 300 + i * 20, profit: 500 + i * 70,
}));

async function noHorizontalOverflow(page: Page) {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(o, 'sem scroll horizontal').toBeLessThanOrEqual(0);
}

async function titleLine(page: Page) {
  const h1 = page.getByRole('heading', { name: 'Financeiro', level: 1 });
  const stepper = page.getByTestId('finance-month-stepper');
  await expect(stepper).toBeVisible();
  const [a, b] = [(await h1.boundingBox())!, (await stepper.boundingBox())!];
  expect(Math.abs((a.y + a.height / 2) - (b.y + b.height / 2)), 'mês na linha do título').toBeLessThanOrEqual(6);
  return { h1, stepper, h1Box: a, stepperBox: b };
}

test.describe('Fin PR-F layout', () => {
  test.setTimeout(150_000);

  test('#9 Financeiro 390: título + mês na mesma linha + "⋯" (Filtrar, Exportar, Assistente)', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    await stubApp(page, guard, 'light');
    await page.setViewportSize({ width: 390, height: 844 });
    await openFinance(page);
    await expect(page.getByTestId('finance-tx-card').first()).toBeVisible({ timeout: 15_000 });

    const { stepper, h1Box } = await titleLine(page);
    await expect(stepper).toContainText(/out\.? 2026|outubro 2026/i);
    await expect(page.getByText(/mês atual/i)).toHaveCount(0); // sem o cartão grande de mês
    await expect(page.getByRole('button', { name: 'Próximo mês' })).toBeDisabled();

    // Filtrar / Exportar / Assistente saem do topo e vão para o "⋯".
    await expect(page.getByRole('button', { name: 'Filtrar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Exportar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Abrir assistente IA' })).toHaveCount(0);
    const more = page.getByRole('button', { name: 'Mais ações do financeiro' });
    const mb = (await more.boundingBox())!;
    expect(mb.width, '⋯ com área de toque').toBeGreaterThanOrEqual(44);
    expect(mb.height, '⋯ com área de toque').toBeGreaterThanOrEqual(44);
    expect(Math.abs((mb.y + mb.height / 2) - (h1Box.y + h1Box.height / 2)), '⋯ na linha do título').toBeLessThanOrEqual(6);
    await expect(more).toHaveAttribute('aria-haspopup', 'menu');
    await noHorizontalOverflow(page);
    await snap(page, 'financeiro-390-light', false);

    await more.click();
    const menu = page.getByRole('menu', { name: 'Mais ações do financeiro' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem')).toHaveText(['Filtrar', 'Exportar', 'Assistente']);
    await expect(menu.getByRole('menuitem').first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem', { name: 'Exportar' })).toBeFocused();
    await snap(page, 'financeiro-390-light-menu', false);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(more).toBeFocused();

    await more.click();
    await page.getByRole('menuitem', { name: 'Filtrar' }).click();
    await expect(page.getByRole('dialog', { name: 'Filtrar transações' })).toBeVisible();
    await page.keyboard.press('Escape');

    await more.click();
    await page.getByRole('menuitem', { name: 'Assistente' }).click();
    await expect(page.getByRole('button', { name: 'Fechar assistente' })).toBeVisible();
    await page.getByRole('button', { name: 'Fechar assistente' }).click();

    // Seta de mês continua funcionando no topo.
    await page.getByRole('button', { name: 'Mês anterior' }).click();
    await expect(stepper).toContainText(/set\.? 2026|setembro 2026/i);
    await expect(page.getByRole('button', { name: 'Próximo mês' })).toBeEnabled();
    await page.getByRole('button', { name: 'Próximo mês' }).click();

    await setMode(page, 'dark');
    await snap(page, 'financeiro-390-dark', false);
    await more.click();
    await snap(page, 'financeiro-390-dark-menu', false);
    await page.keyboard.press('Escape');

    // Pagamentos não tem mês (usa ciclos): só título + "⋯".
    await setMode(page, 'light');
    await page.getByRole('tab', { name: 'Pagamentos' }).click();
    await expect(page.getByTestId('finance-month-stepper')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mais ações do financeiro' })).toBeVisible();

    await page.setViewportSize({ width: 320, height: 700 });
    await page.getByRole('tab', { name: 'Visão geral' }).click();
    await expect(page.getByTestId('finance-month-stepper')).toBeVisible();
    await noHorizontalOverflow(page);
    await snap(page, 'financeiro-320-light', false);
    guard.assertNoLeak();
  });

  test('#9 Financeiro 1440: mês ao lado do título; Filtrar/Exportar/Assistente visíveis, sem "⋯"', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    await stubApp(page, guard, 'light');
    await page.setViewportSize({ width: 1440, height: 900 });
    await openFinance(page);
    await titleLine(page);
    await expect(page.getByText(/mês atual/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Filtrar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Exportar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir assistente IA' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mais ações do financeiro' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Registrar receita' })).toBeVisible();
    await snap(page, 'financeiro-1440-light', false);
    await setMode(page, 'dark');
    await snap(page, 'financeiro-1440-dark', false);
    guard.assertNoLeak();
  });

  test('#10 Pagamentos: cartões só para quem tem valor; "Nada a pagar" em lista simples; 1 link de histórico', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    await stubApp(page, guard, 'light', { cycle: cycleMixed });
    await page.setViewportSize({ width: 390, height: 844 });
    await openFinance(page, 'commissions');
    const ana = page.getByTestId(`payout-row-${ANA_ID}`);
    await expect(ana).toBeVisible({ timeout: 15_000 });
    await expect(ana.getByRole('button', { name: 'Pagar Ana Souza' })).toBeEnabled();
    await expect(ana).toContainText('Período 06/09 – 05/10');

    const nothing = page.getByTestId('payout-nothing-due');
    await expect(nothing).toHaveText('Nada a pagar neste período: Bruno Lima, Diego Rocha.');
    await expect(page.getByTestId(`payout-row-${BRUNO_ID}`)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Nada a pagar/ })).toHaveCount(0);
    await expect(page.getByText('Nenhum lançamento neste ciclo')).toHaveCount(0);

    const paid = page.getByTestId(`payout-paid-${CARLA_ID}`);
    await expect(paid).toContainText('Carla Dias');
    await expect(paid).toContainText('Pago em 02/10');

    const links = page.getByRole('link', { name: 'Ver histórico e análise' });
    await expect(links).toHaveCount(1);
    await expect(links).toHaveAttribute('href', /financeiro\/performance\?de=2026-09-06&ate=2026-10-05$/);
    await noHorizontalOverflow(page);
    await snap(page, 'pagamentos-390-light', false);
    await nothing.scrollIntoViewIfNeeded();
    await snap(page, 'pagamentos-390-light-lista', false);
    await setMode(page, 'dark');
    await snap(page, 'pagamentos-390-dark-lista', false);

    await page.setViewportSize({ width: 1440, height: 900 });
    await setMode(page, 'light');
    await expect(page.getByRole('link', { name: 'Ver histórico e análise' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /Nada a pagar/ })).toHaveCount(0);
    await snap(page, 'pagamentos-1440-light', false);
    await setMode(page, 'dark');
    await snap(page, 'pagamentos-1440-dark', false);
    guard.assertNoLeak();
  });

  test('#10 Pagamentos sem valores: estado simples, sem cartões', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    await stubApp(page, guard, 'light', { cycle: cycleNothing });
    await page.setViewportSize({ width: 390, height: 844 });
    await openFinance(page, 'commissions');
    const nothing = page.getByTestId('payout-nothing-due');
    await expect(nothing).toHaveText('Nada a pagar neste período: Ana Souza, Bruno Lima.', { timeout: 15_000 });
    await expect(page.locator('[data-testid^="payout-row-"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Ver histórico e análise' })).toHaveCount(1);
    await snap(page, 'pagamentos-390-light-vazio', false);
    guard.assertNoLeak();
  });

  test('#11 Histórico: três números com a mesma aparência da Visão geral, sem blocos coloridos', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    await stubApp(page, guard, 'light', { monthlyHistory: HISTORY });
    await page.setViewportSize({ width: 390, height: 844 });
    await openFinance(page);
    const overviewKpi = page.getByTestId('finance-kpi').first();
    await expect(overviewKpi).toBeVisible({ timeout: 15_000 });
    const look = (el: HTMLElement) => {
      const value = el.querySelector('[data-kpi-value]') as HTMLElement;
      const label = el.querySelector('[data-kpi-label]') as HTMLElement;
      const cs = getComputedStyle(el);
      return {
        bg: cs.backgroundColor, border: cs.borderTopColor, radius: cs.borderTopLeftRadius,
        valueFont: getComputedStyle(value).fontFamily, valueSize: getComputedStyle(value).fontSize,
        valueWeight: getComputedStyle(value).fontWeight, valueColor: getComputedStyle(value).color,
        labelSize: getComputedStyle(label).fontSize, labelColor: getComputedStyle(label).color,
      };
    };
    const base = await overviewKpi.evaluate(look);

    await page.getByRole('tab', { name: 'Histórico' }).click();
    const kpis = page.getByTestId('history-kpis').getByTestId('finance-kpi');
    await expect(kpis).toHaveCount(3);
    await expect(kpis.locator('[data-kpi-label]')).toHaveText(['Melhor mês', 'Crescimento médio', 'Receita em 6 meses']);
    for (const look2 of await kpis.evaluateAll((els, fn) => els.map((e) => new Function('el', `return (${fn})(el)`)(e)), look.toString())) {
      expect(look2).toEqual(base);
    }
    await expect(page.getByTestId('history-kpis')).not.toContainText(/MELHOR MÊS|CRESCIMENTO MÉDIO/);
    // Linhas e crescimento sem fundo colorido.
    const tinted = await page.locator('[data-testid="history-month"]').evaluateAll((els) =>
      els.filter((e) => {
        const bg = getComputedStyle(e).backgroundColor;
        return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== getComputedStyle(e.parentElement!).backgroundColor;
      }).length);
    expect(tinted, 'meses sem fundo colorido').toBe(0);
    await expect(page.locator('[data-testid="history-month"]').first()).toBeVisible();
    await noHorizontalOverflow(page);
    await snap(page, 'historico-390-light', false);
    await page.locator('[data-testid="history-month"]').first().scrollIntoViewIfNeeded();
    await snap(page, 'historico-390-light-meses', false);
    await setMode(page, 'dark');
    await snap(page, 'historico-390-dark-meses', false);
    await page.setViewportSize({ width: 1440, height: 900 });
    await setMode(page, 'light');
    await snap(page, 'historico-1440-light', false);
    await setMode(page, 'dark');
    await snap(page, 'historico-1440-dark', false);
    guard.assertNoLeak();
  });

  test('Ajustes › Equipe 390: título uma vez e logo nítido (marca leve, sem placeholder)', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    await stubApp(page, guard, 'light');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/#/configuracoes/equipe`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('team-member-row')).toHaveCount(11, { timeout: 20_000 });

    const titles = page.getByRole('heading', { name: /^Equipe e comissões$/i });
    await expect(titles).toHaveCount(1);

    const logo = page.locator('header').first().getByRole('img', { name: 'AgendiX' });
    await expect(logo).toBeVisible();
    const info = await logo.evaluate((img: HTMLImageElement) => ({
      src: img.currentSrc || img.src, natural: img.naturalWidth, complete: img.complete,
      w: img.getBoundingClientRect().width, h: img.getBoundingClientRect().height,
      blurredSibling: Array.from(img.closest('a')?.querySelectorAll('*') ?? []).some((e) => /blur/.test((e as HTMLElement).className)),
    }));
    expect(info.src, 'marca leve dedicada').toMatch(/agendix-mark-(light|dark)\.png$/);
    expect(info.complete && info.natural > 0, 'imagem carregada').toBe(true);
    expect(info.natural, 'asset pequeno (não o PNG de 1024 px)').toBeLessThanOrEqual(192);
    expect(info.blurredSibling, 'sem halo borrado atrás do logo').toBe(false);
    expect(Math.abs(info.w - info.h), 'marca quadrada, sem distorção').toBeLessThanOrEqual(1);
    await snap(page, 'equipe-390-light', false);
    await setMode(page, 'dark');
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.currentSrc || img.src)).toMatch(/agendix-mark-dark\.png$/);
    await snap(page, 'equipe-390-dark', false);
    await page.setViewportSize({ width: 1440, height: 900 });
    await setMode(page, 'light');
    await expect(titles).toHaveCount(1);
    await snap(page, 'equipe-1440-light', false);
    await setMode(page, 'dark');
    await snap(page, 'equipe-1440-dark', false);
    guard.assertNoLeak();
  });
});
