/**
 * E2E Fin PR-E — layout do Financeiro e de Ajustes › Equipe (mocks, sem escrita em prod).
 *
 *   npx playwright test e2e/fin-e-layout.spec.ts --project=chromium-legacy
 *   E2E_SHOTS_DIR=/tmp/shots npx playwright test e2e/fin-e-layout.spec.ts --project=chromium-legacy
 */
import { expect, test, type Page } from '@playwright/test';
import { installProdWriteGuard } from './helpers/prodWriteGuard';
import {
  ANA_ID, BASE, openFinance, setMode, shot, stubApp,
} from './helpers/finLayoutMocks';

const ARTIFACTS = process.env.E2E_SHOTS_DIR || '/opt/cursor/artifacts/screenshots/fin-e';
const snap = (page: Page, name: string, fullPage = true) => shot(page, ARTIFACTS, name, fullPage);

async function expectTabsOneRow(page: Page) {
  const tablist = page.getByRole('tablist', { name: 'Seções do financeiro' });
  await expect(tablist).toBeVisible();
  const tabs = tablist.getByRole('tab');
  await expect(tabs).toHaveText(['Visão geral', 'Pagamentos', 'Histórico']);
  const m = await tablist.evaluate((el) => {
    const items = Array.from(el.querySelectorAll('[role="tab"]')) as HTMLElement[];
    const rects = items.map((t) => t.getBoundingClientRect());
    return {
      tops: rects.map((r) => Math.round(r.top)),
      widths: rects.map((r) => Math.round(r.width)),
      heights: rects.map((r) => Math.round(r.height)),
      overflow: el.scrollWidth - el.clientWidth,
      parentOverflow: (el.parentElement?.scrollWidth ?? 0) - (el.parentElement?.clientWidth ?? 0),
      transforms: items.map((t) => getComputedStyle(t).textTransform),
      families: items.map((t) => getComputedStyle(t).fontFamily),
      truncated: items.map((t) => {
        const label = (t.querySelector('[data-tab-label]') as HTMLElement | null) ?? t;
        return label.scrollWidth > label.clientWidth + 0.5;
      }),
      height: el.getBoundingClientRect().height,
    };
  });
  expect(new Set(m.tops).size, 'abas numa linha só').toBe(1);
  expect(Math.max(...m.widths) - Math.min(...m.widths), 'larguras iguais').toBeLessThanOrEqual(1);
  expect(m.overflow, 'sem scroll horizontal').toBeLessThanOrEqual(0);
  expect(m.parentOverflow, 'sem scroll horizontal no contêiner').toBeLessThanOrEqual(0);
  expect(m.transforms.every((t) => t === 'none'), 'sem caixa alta').toBe(true);
  expect(m.families.every((f) => !/mono/i.test(f)), 'sem fonte mono').toBe(true);
  expect(m.truncated.every((t) => !t), 'rótulos sem reticências').toBe(true);
  expect(m.heights.every((h) => h >= 40), 'altura de toque').toBe(true);
}

test.describe('Fin PR-E layout', () => {
  test.setTimeout(150_000);

  test('Financeiro 390: abas, performance, sem Registrar receita, assistente e FAB', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    await stubApp(page, guard, 'light');
    await page.setViewportSize({ width: 390, height: 844 });
    await openFinance(page);
    await expect(page.getByTestId('finance-tx-card').first()).toBeVisible({ timeout: 15_000 });

    await expectTabsOneRow(page);
    await expect(page.getByRole('button', { name: 'Registrar receita' })).toHaveCount(0);

    // PR-F: no celular, Filtrar/Exportar/Assistente ficam no "⋯" (ver fin-f-layout).
    await expect(page.getByRole('button', { name: 'Mais ações do financeiro' })).toBeVisible();

    // Performance da equipe: cartão logo abaixo dos números do mês.
    const perf = page.getByTestId('finance-performance-card');
    await expect(perf).toBeVisible();
    await expect(perf).toContainText('Performance da equipe');
    await expect(perf).toContainText(/Como cada colaborador foi em setembro|Como cada colaborador foi em outubro/);
    await snap(page, 'financeiro-390-light', false);
    await snap(page, 'financeiro-390-light-full');

    // FAB: no fim da página, a última transação fica acima do "+" com folga.
    // O app rola num contêiner (h-[100dvh] overflow-y-auto), não na janela.
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      document.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) {
          el.scrollTop = el.scrollHeight;
        }
      });
    });
    await page.waitForTimeout(300);
    const last = page.getByTestId('finance-tx-card').last();
    const fab = page.getByRole('button', { name: 'Ações rápidas' });
    const [l, fb] = [(await last.boundingBox())!, (await fab.boundingBox())!];
    expect(l.y + l.height, 'última transação acima do +').toBeLessThanOrEqual(fb.y - 16);
    await snap(page, 'financeiro-390-light-bottom', false);

    await setMode(page, 'dark');
    await page.evaluate(() => window.scrollTo(0, 0));
    await snap(page, 'financeiro-390-dark', false);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await snap(page, 'financeiro-390-dark-bottom', false);

    // Teclado: setas trocam de aba e a aba vai para a URL.
    await setMode(page, 'light');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('tab', { name: 'Visão geral' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Pagamentos' })).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/tab=commissions/);
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: 'Histórico' })).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/tab=history/);
    await page.keyboard.press('Home');
    await expect(page.getByRole('tab', { name: 'Visão geral' })).toHaveAttribute('aria-selected', 'true');

    await page.setViewportSize({ width: 320, height: 700 });
    await page.waitForTimeout(300);
    await expectTabsOneRow(page);
    await snap(page, 'financeiro-320-light', false);
    guard.assertNoLeak();
  });

  test('Financeiro 1440: Registrar receita e Performance no topo', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    await stubApp(page, guard, 'light');
    await page.setViewportSize({ width: 1440, height: 900 });
    await openFinance(page);
    await expect(page.getByRole('button', { name: 'Registrar receita' })).toBeVisible({ timeout: 15_000 });
    const perfBtn = page.getByTestId('finance-performance-button');
    await expect(perfBtn).toBeVisible();
    await expect(perfBtn).toHaveText(/Performance da equipe/);
    await expectTabsOneRow(page);
    await snap(page, 'financeiro-1440-light', false);
    await setMode(page, 'dark');
    await snap(page, 'financeiro-1440-dark', false);
    guard.assertNoLeak();
  });

  test('Pagamentos: % só como texto, cartão de performance', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    await stubApp(page, guard, 'light');
    await page.setViewportSize({ width: 390, height: 844 });
    await openFinance(page, 'commissions');
    await expect(page.getByTestId(`payout-row-${ANA_ID}`)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('tab', { name: 'Pagamentos' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Alterar %')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Alterar %/ })).toHaveCount(0);
    await expect(page.getByTestId(`payout-row-${ANA_ID}`)).toContainText('40%');
    await expect(page.getByTestId('finance-performance-card')).toBeVisible();
    await snap(page, 'pagamentos-390-light');
    await setMode(page, 'dark');
    await snap(page, 'pagamentos-390-dark');
    await page.setViewportSize({ width: 1440, height: 900 });
    await setMode(page, 'light');
    await expect(page.getByRole('button', { name: /Alterar %/ })).toHaveCount(0);
    await snap(page, 'pagamentos-1440-light', false);
    guard.assertNoLeak();
  });

  test('Ajustes › Equipe: linhas compactas e gaveta com Comissão', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    const patches: unknown[] = [];
    guard.stubTable('team_members', (_route, payload) => { patches.push(payload); return { status: 204 }; });
    await stubApp(page, guard, 'light');
    guard.stubTable('team_members', (_route, payload) => { patches.push(payload); return { status: 204 }; });
    let recalc: unknown = null;
    guard.stubRpc('recalculate_pending_commissions', (_route, payload) => { recalc = payload; return { body: null }; });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/#/configuracoes/equipe`, { waitUntil: 'domcontentloaded' });
    const rows = page.getByTestId('team-member-row');
    await expect(rows).toHaveCount(11, { timeout: 20_000 });

    const geo = await rows.evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + window.scrollY, h: r.height };
    }));
    expect(Math.max(...geo.map((g) => g.h)), 'linha ≤ 72 px').toBeLessThanOrEqual(72);
    const staffGeo = geo.slice(1);
    const span = staffGeo[staffGeo.length - 1].top + staffGeo[staffGeo.length - 1].h - staffGeo[0].top;
    expect(span, '10 colaboradores em até 1,5 tela').toBeLessThanOrEqual(844 * 1.5);

    const ana = rows.filter({ hasText: 'Ana Souza' });
    await expect(ana).toContainText('40% de comissão');
    await expect(ana.getByRole('button', { name: /Excluir/ })).toHaveCount(0);
    await expect(ana.getByText(/Bloque/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Comissão$/ })).toHaveCount(0);
    await snap(page, 'equipe-390-light', false);
    await snap(page, 'equipe-390-light-full');
    await setMode(page, 'dark');
    await snap(page, 'equipe-390-dark', false);
    await setMode(page, 'light');

    await ana.getByRole('button', { name: 'Editar Ana Souza' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Dados' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Comissão' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Bloqueios de agenda' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Excluir profissional' })).toBeVisible();
    const pct = dialog.getByLabel('Comissão (%)');
    await expect(pct).toHaveValue('40');
    await snap(page, 'equipe-gaveta-390-light', false);
    await dialog.getByRole('heading', { name: 'Comissão' }).scrollIntoViewIfNeeded();
    await snap(page, 'equipe-gaveta-390-light-comissao', false);
    await setMode(page, 'dark');
    await snap(page, 'equipe-gaveta-390-dark', false);
    await setMode(page, 'light');

    await pct.fill('45');
    await dialog.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect.poll(() => recalc).toEqual({ p_professional_id: ANA_ID, p_new_rate: 45 });
    expect(patches.some((p) => (p as { commission_rate?: number }).commission_rate === 45)).toBe(true);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await snap(page, 'equipe-1440-light', false);
    guard.assertNoLeak();
  });
});
