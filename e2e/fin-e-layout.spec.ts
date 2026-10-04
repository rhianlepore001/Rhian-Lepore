/**
 * E2E Fin PR-E — layout do Financeiro e de Ajustes › Equipe (mocks, sem escrita em prod).
 *
 *   npx playwright test e2e/fin-e-layout.spec.ts --project=chromium-legacy
 *   E2E_SHOTS_DIR=/tmp/shots npx playwright test e2e/fin-e-layout.spec.ts --project=chromium-legacy
 */
import { expect, test, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installProdWriteGuard, type ProdWriteGuard } from './helpers/prodWriteGuard';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = process.env.E2E_SUPABASE_REF || 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const ARTIFACTS = process.env.E2E_SHOTS_DIR || '/opt/cursor/artifacts/screenshots/fin-e';

const STAFF_NAMES = [
  'Ana Souza', 'Bruno Lima', 'Carla Dias', 'Diego Rocha', 'Eva Martins',
  'Fábio Nunes', 'Gabi Torres', 'Hugo Alves', 'Inês Prado', 'João Reis',
];
const staffId = (i: number) => `7d3f2a9c-4b1e-4c8a-9f6d-2e5b8a1c0d${String(i).padStart(2, '0')}`;
const ANA_ID = staffId(0);
const BRUNO_ID = staffId(1);

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function fakeSession(userId: string, email: string, fullName: string) {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub: userId, role: 'authenticated', aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 86400, email,
  });
  return {
    access_token: `${header}.${payload}.e2e-fake-sig`,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: userId, email, aud: 'authenticated', role: 'authenticated',
      app_metadata: { provider: 'email' }, user_metadata: { full_name: fullName },
      created_at: '2026-01-01T00:00:00.000Z',
    },
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  const accept = route.request().headers()['accept'] || '';
  const wantsObject = accept.includes('vnd.pgrst.object+json');
  const payload = wantsObject && Array.isArray(body) ? (body[0] ?? null) : body;
  await route.fulfill({
    status: wantsObject && payload === null ? 406 : status,
    headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function tx(i: number) {
  const day = String(1 + (i % 3)).padStart(2, '0');
  const expense = i % 5 === 4;
  return {
    id: `t${i}`,
    created_at: `2026-10-${day}T1${i % 10}:00:00.000+01:00`,
    barber_name: 'Ana Souza',
    professional_id: ANA_ID,
    client_name: 'Maria Silva',
    amount: expense ? 0 : 40 + i,
    expense: expense ? 25 : 0,
    commission_paid: expense,
    payment_method: 'pix',
    status: 'paid',
    type: expense ? 'expense' : 'revenue',
    service_name: expense ? 'Produtos' : 'Corte',
    description: null,
  };
}
const TXS = Array.from({ length: 12 }, (_, i) => tx(i));

function members() {
  return [
    {
      id: OWNER_ID, name: 'Rhian Owner', role: 'Dono', photo_url: null, active: true, is_owner: true,
      user_id: OWNER_ID, commission_rate: 0, staff_user_id: OWNER_ID, display_order: 0,
    },
    ...STAFF_NAMES.map((name, i) => ({
      id: staffId(i), name, role: i % 2 ? 'Barbeiro' : 'Barbeira', photo_url: null, active: true,
      is_owner: false, user_id: OWNER_ID, commission_rate: 40 - i, commission_percent: 40 - i,
      staff_user_id: i === 0 ? null : `0000000${i}-0000-4000-8000-000000000000`, display_order: i + 1,
    })),
  ];
}

const cycle = {
  tz: 'Europe/Lisbon', currency: 'EUR', settlement_day: 5, frequency: 'monthly',
  pay_offset_days: 2, pay_due: '2026-10-07',
  cycle: { start: '2026-09-06', end: '2026-10-05', open: true, pay_due: '2026-10-07' },
  previous_end: '2026-09-05', next_end: '2026-11-05',
  totals: { a_pagar_ciclo: 39, pendentes: 1, pago_ciclo: 0 },
  members: [
    {
      name: 'Ana Souza', status: 'pendente', inactive: false, photo_url: null, pago_ciclo: null,
      a_pagar_ciclo: 39, pago_ciclo_em: null, pago_calculado: 0, produtos_ciclo: 0, saldo_anterior: 0,
      primeiro_nao_pago: '2026-09-10', servicos_ciclo: 2, commission_rate: 40, professional_id: ANA_ID,
      saldo_acumulado: 39, ultimo_pagamento: null,
    },
    {
      name: 'Bruno Lima', status: 'nada_a_pagar', inactive: false, photo_url: null, pago_ciclo: null,
      a_pagar_ciclo: 0, pago_ciclo_em: null, pago_calculado: 0, produtos_ciclo: 0, saldo_anterior: 0,
      primeiro_nao_pago: null, servicos_ciclo: 0, commission_rate: 39, professional_id: BRUNO_ID,
      saldo_acumulado: 0, ultimo_pagamento: null,
    },
  ],
};

async function stubApp(page: Page, guard: ProdWriteGuard, mode: 'light' | 'dark') {
  const session = fakeSession(OWNER_ID, 'owner.fine@example.test', 'Rhian Owner');
  await page.addInitScript(
    ({ key, value, colorMode }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem('agendix_color_mode', colorMode);
      document.documentElement.setAttribute('data-mode', colorMode);
      document.documentElement.setAttribute('data-theme', 'barber');
      void navigator.serviceWorker?.getRegistrations?.().then((rs) => rs.forEach((r) => r.unregister()));
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session, colorMode: mode },
  );
  const profile = {
    id: OWNER_ID, role: 'owner', company_id: OWNER_ID, full_name: 'Rhian Owner',
    business_name: 'Studio Atlas', user_type: 'barber', region: 'PT', subscription_status: 'active',
    trial_ends_at: null, tutorial_completed: true, aios_enabled: false, photo_url: null,
  };
  await page.route(/\.supabase\.co\/(auth|rest)\//, async (route) => {
    const req = route.request();
    const pathname = new URL(req.url()).pathname;
    if (pathname.includes('/auth/v1/user') || pathname.includes('/auth/v1/token')) {
      await fulfillJson(route, pathname.includes('/auth/v1/user') ? session.user : session);
      return;
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method())) { await route.fallback(); return; }
    if (pathname.includes('/rest/v1/profiles')) { await fulfillJson(route, [profile]); return; }
    if (pathname.includes('/rest/v1/team_members')) { await fulfillJson(route, members()); return; }
    if (pathname.includes('/rest/v1/onboarding_progress')) { await fulfillJson(route, [{ is_completed: true }]); return; }
    if (pathname.includes('/rest/v1/business_settings')) {
      await fulfillJson(route, [{
        user_id: OWNER_ID, timezone: 'Europe/Lisbon', business_hours: {}, commission_settlement_day_of_month: 5,
        onboarding_completed: true, machine_fee_enabled: false, debit_fee_percent: 0, credit_fee_percent: 0,
      }]);
      return;
    }
    if (pathname.includes('/rest/v1/')) { await fulfillJson(route, []); return; }
    await route.fallback();
  });

  const revenue = TXS.reduce((s, t) => s + t.amount, 0);
  const expenses = TXS.reduce((s, t) => s + t.expense, 0);
  guard.stubRpc('get_finance_stats', {
    body: {
      revenue, expenses, profit: revenue - expenses, commissions_pending: 39, pendingExpenses: 0,
      revenue_by_method: { pix: revenue, mbway: 0, dinheiro: 0, cartao: 0 }, transactions: TXS,
    },
  });
  guard.stubRpc('get_monthly_finance_history', { body: [] });
  guard.stubRpc('get_commission_cycle_v1', { body: cycle });
  guard.stubRpc('get_commissions_due', { body: [] });
  guard.stubRpc('get_commission_schedules_v1', {
    body: {
      today: '2026-10-04', tz: 'Europe/Lisbon', notice: false, exceptions: [], current_end: '2026-10-05',
      business: {
        id: 'sch-biz', user_id: OWNER_ID, professional_id: null, frequency: 'monthly', close_days: [5],
        anchor_date: null, pay_offset_days: 2, reminder_offsets: [2, 0], effective_from: '2000-01-01',
      },
    },
  });
  guard.stubRpc('generate_commission_reminders_v1', { body: { inserted: 0 } });
  guard.stubRpc('list_agenda_blocks', { body: [] });
  guard.stubRpc('list_company_pending_public_bookings', { body: [] });
  guard.stubRpc('recalculate_pending_commissions', { body: null });
  guard.stubTable('team_members', { status: 204 });
}

async function setMode(page: Page, mode: 'light' | 'dark') {
  await page.evaluate((next) => {
    document.documentElement.setAttribute('data-mode', next);
    localStorage.setItem('agendix_color_mode', next);
  }, mode);
  await page.waitForTimeout(1000);
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) active.blur();
  });
  await page.waitForTimeout(400);
}

async function shot(page: Page, name: string, fullPage = true) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await settle(page);
  await page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`), fullPage });
}

async function openFinance(page: Page, tab?: 'commissions' | 'history') {
  await page.goto(`${BASE}/#/financeiro${tab ? `?tab=${tab}` : ''}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Financeiro', level: 1 })).toBeVisible({ timeout: 20_000 });
}

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

    // Assistente: quadrado, mesma altura e centro do Filtrar.
    const bot = page.getByRole('button', { name: 'Abrir assistente IA' });
    const filter = page.getByRole('button', { name: 'Filtrar' });
    const [b, f] = [(await bot.boundingBox())!, (await filter.boundingBox())!];
    expect(Math.abs(b.width - b.height), 'assistente quadrado').toBeLessThanOrEqual(1);
    expect(b.height, 'assistente com área de toque').toBeGreaterThanOrEqual(40);
    expect(Math.abs(b.height - f.height), 'mesma altura do Filtrar').toBeLessThanOrEqual(1);
    expect(Math.abs((b.y + b.height / 2) - (f.y + f.height / 2)), 'alinhado ao Filtrar').toBeLessThanOrEqual(1);

    // Performance da equipe: cartão logo abaixo dos números do mês.
    const perf = page.getByTestId('finance-performance-card');
    await expect(perf).toBeVisible();
    await expect(perf).toContainText('Performance da equipe');
    await expect(perf).toContainText(/Como cada colaborador foi em setembro|Como cada colaborador foi em outubro/);
    await shot(page, 'financeiro-390-light', false);
    await shot(page, 'financeiro-390-light-full');

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
    await shot(page, 'financeiro-390-light-bottom', false);

    await setMode(page, 'dark');
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, 'financeiro-390-dark', false);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await shot(page, 'financeiro-390-dark-bottom', false);

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
    await shot(page, 'financeiro-320-light', false);
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
    await shot(page, 'financeiro-1440-light', false);
    await setMode(page, 'dark');
    await shot(page, 'financeiro-1440-dark', false);
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
    await shot(page, 'pagamentos-390-light');
    await setMode(page, 'dark');
    await shot(page, 'pagamentos-390-dark');
    await page.setViewportSize({ width: 1440, height: 900 });
    await setMode(page, 'light');
    await expect(page.getByRole('button', { name: /Alterar %/ })).toHaveCount(0);
    await shot(page, 'pagamentos-1440-light', false);
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
    await shot(page, 'equipe-390-light', false);
    await shot(page, 'equipe-390-light-full');
    await setMode(page, 'dark');
    await shot(page, 'equipe-390-dark', false);
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
    await shot(page, 'equipe-gaveta-390-light', false);
    await dialog.getByRole('heading', { name: 'Comissão' }).scrollIntoViewIfNeeded();
    await shot(page, 'equipe-gaveta-390-light-comissao', false);
    await setMode(page, 'dark');
    await shot(page, 'equipe-gaveta-390-dark', false);
    await setMode(page, 'light');

    await pct.fill('45');
    await dialog.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect.poll(() => recalc).toEqual({ p_professional_id: ANA_ID, p_new_rate: 45 });
    expect(patches.some((p) => (p as { commission_rate?: number }).commission_rate === 45)).toBe(true);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await shot(page, 'equipe-1440-light', false);
    guard.assertNoLeak();
  });
});
