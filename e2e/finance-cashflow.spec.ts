/**
 * E2E PR-C Finance — gráfico Entradas e saídas (tenant mockado).
 *
 *   npx playwright test e2e/finance-cashflow.spec.ts --project=chromium-legacy
 */
import { expect, test, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installProdWriteGuard } from './helpers/prodWriteGuard';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const ARTIFACTS = process.env.E2E_SHOTS_DIR ? `${process.env.E2E_SHOTS_DIR}/fin-c` : '/opt/cursor/artifacts/screenshots/fin-c';

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function fakeJwt(sub: string, email: string): string {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    email,
  });
  return `${header}.${payload}.e2e-fake-sig`;
}

function fakeSession(userId: string, email: string, fullName: string) {
  const accessToken = fakeJwt(userId, email);
  return {
    access_token: accessToken,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: userId,
      email,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: fullName },
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
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
    },
    body: JSON.stringify(payload),
  });
}

async function settle(page: Page) {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation: none !important;
      animation-duration: 0s !important;
      animation-delay: 0s !important;
    }`,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
  await page.waitForTimeout(300);
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await settle(page);
  await page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`), fullPage: false });
}

function tx(partial: {
  id: string;
  created_at: string;
  amount?: number;
  expense?: number;
  type?: string;
  service_name?: string;
}) {
  return {
    id: partial.id,
    created_at: partial.created_at,
    barber_name: 'Ana Souza',
    professional_id: '10000000-0000-0000-0000-0000000000a1',
    client_name: 'Maria Silva',
    amount: partial.amount ?? 0,
    expense: partial.expense ?? 0,
    commission_paid: partial.type === 'expense',
    payment_method: 'pix',
    status: 'paid',
    type: partial.type ?? 'revenue',
    service_name: partial.service_name ?? 'Corte',
    description: null,
  };
}

/** Setembro 2026 no fuso de Lisboa: semanas com movimento visível. */
const SEPTEMBER_TX = [
  tx({ id: 's1a', created_at: '2026-09-01T10:00:00.000+01:00', amount: 180, service_name: 'Corte' }),
  tx({ id: 's1b', created_at: '2026-09-03T15:00:00.000+01:00', amount: 150, service_name: 'Barba' }),
  tx({ id: 's1c', created_at: '2026-09-04T12:00:00.000+01:00', expense: 30, type: 'expense', service_name: 'Aluguel' }),
  tx({ id: 's2a', created_at: '2026-09-08T11:00:00.000+01:00', amount: 90, service_name: 'Corte' }),
  tx({ id: 's3a', created_at: '2026-09-16T14:00:00.000+01:00', amount: 220, service_name: 'Combo' }),
  tx({ id: 's3b', created_at: '2026-09-18T09:30:00.000+01:00', expense: 40, type: 'expense', service_name: 'Produtos' }),
  tx({ id: 's4a', created_at: '2026-09-22T16:00:00.000+01:00', amount: 70, service_name: 'Corte' }),
  tx({ id: 's5a', created_at: '2026-09-30T22:30:00.000+01:00', amount: 80, service_name: 'Pomada' }),
];

/** Valores grandes para verificar que os totais cabem a 360 px sem truncar. */
const BIG_SEPTEMBER_TX = [
  tx({ id: 'b1', created_at: '2026-09-02T10:00:00.000+01:00', amount: 12345, service_name: 'Pacote' }),
  tx({ id: 'b2', created_at: '2026-09-15T10:00:00.000+01:00', amount: 12345, service_name: 'Pacote' }),
  tx({ id: 'b3', created_at: '2026-09-20T10:00:00.000+01:00', expense: 12345, type: 'expense', service_name: 'Obra' }),
];

const TINY_AUGUST_TX = [
  tx({ id: 'a1', created_at: '2026-08-12T10:00:00.000+01:00', amount: 20, service_name: 'Ajuste' }),
];

function statsBody(transactions: ReturnType<typeof tx>[]) {
  const revenue = transactions.filter((t) => t.type !== 'expense').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.expense, 0);
  return {
    revenue,
    expenses,
    commissions_pending: 0,
    profit: revenue - expenses,
    revenue_by_method: { pix: revenue, mbway: 0, dinheiro: 0, cartao: 0 },
    pendingExpenses: 0,
    transactions,
  };
}

async function stubSession(page: Page) {
  const session = fakeSession(OWNER_ID, 'owner.finc@example.test', 'Rhian Owner');
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session },
  );

  const profile = {
    id: OWNER_ID,
    role: 'owner',
    company_id: OWNER_ID,
    full_name: 'Rhian Owner',
    business_name: 'Studio AgendiX',
    business_slug: 'fin-c',
    public_booking_enabled: true,
    user_type: 'barber',
    region: 'PT',
    subscription_status: 'active',
    trial_ends_at: null,
    tutorial_completed: true,
    aios_enabled: false,
    photo_url: null,
  };

  await page.route(/\.supabase\.co\/(auth|rest)\//, async (route) => {
    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());
    const pathname = url.pathname;

    if (pathname.includes('/auth/v1/user') || pathname.includes('/auth/v1/token')) {
      await fulfillJson(route, pathname.includes('/auth/v1/user') ? session.user : session);
      return;
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      await route.fallback();
      return;
    }
    if (pathname.includes('/rest/v1/profiles')) {
      await fulfillJson(route, [profile]);
      return;
    }
    if (pathname.includes('/rest/v1/team_members')) {
      await fulfillJson(route, [{
        id: '10000000-0000-0000-0000-0000000000a1',
        name: 'Rhian Owner',
        photo_url: null,
        active: true,
        staff_user_id: OWNER_ID,
        user_id: OWNER_ID,
        is_owner: true,
        display_order: 0,
      }]);
      return;
    }
    if (pathname.includes('/rest/v1/onboarding_progress')) {
      await fulfillJson(route, [{ is_completed: true }]);
      return;
    }
    if (pathname.includes('/rest/v1/business_settings')) {
      await fulfillJson(route, [{
        user_id: OWNER_ID,
        timezone: 'Europe/Lisbon',
        business_hours: {},
        onboarding_completed: true,
      }]);
      return;
    }
    if (pathname.includes('/rest/v1/')) {
      await fulfillJson(route, []);
      return;
    }
    await route.fallback();
  });
}

async function setMode(page: Page, mode: 'light' | 'dark') {
  await page.evaluate((next) => {
    document.documentElement.setAttribute('data-mode', next);
  }, mode);
  await page.waitForTimeout(1100);
}

/** Resize + repaint forçado: sem isso o Chromium headless deixa tiles sem pintar (fundo preto). */
async function resizeAndRepaint(page: Page, width: number, height: number, mode: 'light' | 'dark' = 'light') {
  await page.setViewportSize({ width, height });
  await setMode(page, mode === 'light' ? 'dark' : 'light');
  await setMode(page, mode);
}

async function frameChart(page: Page) {
  await page.evaluate(() => {
    const el = document.getElementById('finance-cashflow')
      || document.querySelector('[data-testid="finance-cashflow-chart"]');
    // scroll-margin-top no card desconta o header fixo.
    el?.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(250);
  await expectChartTitleBelowHeader(page);
}

async function expectChartTitleBelowHeader(page: Page) {
  const { titleTop, headerBottom } = await page.evaluate(() => {
    const title = document.querySelector('#finance-cashflow h3');
    const header = document.querySelector('header');
    return {
      titleTop: title?.getBoundingClientRect().top ?? -1,
      headerBottom: header?.getBoundingClientRect().bottom ?? 0,
    };
  });
  expect(titleTop).toBeGreaterThanOrEqual(headerBottom);
}

function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0']).slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function expectYTicksAA(page: Page) {
  const { fill, card } = await page.evaluate(() => {
    const tick = document.querySelector('[data-testid="cashflow-ytick"]') as SVGTextElement | null;
    const cardEl = document.getElementById('finance-cashflow');
    return {
      fill: tick ? getComputedStyle(tick).fill : '',
      card: cardEl ? getComputedStyle(cardEl).backgroundColor : '',
    };
  });
  const [hi, lo] = [luminance(fill), luminance(card)].sort((a, b) => b - a);
  expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5);
}

async function openFinanceSeptember(page: Page) {
  await page.goto(`${BASE}/#/financeiro`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible({ timeout: 20_000 });
  // PR-F: seletor de mês na linha do título
  const monthLabel = page.getByTestId('finance-month-stepper');
  await expect(monthLabel).toBeVisible({ timeout: 15_000 });
  if (!(await monthLabel.textContent())?.includes('Setembro')) {
    await page.getByRole('button', { name: 'Mês anterior' }).click();
    await expect(monthLabel).toContainText('Setembro', { timeout: 10_000 });
  }
  await expect(page.getByTestId('finance-cashflow-chart')).toBeVisible({ timeout: 15_000 });
}

test.describe('PR-C gráfico entradas e saídas', () => {
  test.setTimeout(120_000);

  test('visão geral, tooltip, mês anterior pequeno', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    guard.stubRpc('get_finance_stats', (_route, payload) => {
      const start = String((payload as { p_start_date?: string })?.p_start_date ?? '');
      if (start.startsWith('2026-08')) return { body: statsBody(TINY_AUGUST_TX) };
      return { body: statsBody(SEPTEMBER_TX) };
    });
    guard.stubRpc('get_monthly_finance_history', { body: [] });
    await stubSession(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await openFinanceSeptember(page);
    await setMode(page, 'light');
    await expect(page.getByText('Mês anterior com pouco movimento')).toBeVisible();
    await page.getByText('Mês anterior com pouco movimento').scrollIntoViewIfNeeded();
    await shot(page, 'small-previous-390-light');

    // Segunda versão: viewport alto para caber o KPI com «pouco movimento» e o card do gráfico.
    await resizeAndRepaint(page, 390, 1500);
    await page.evaluate(() => {
      document.querySelector('[data-testid="finance-cashflow-chart"]')
        ?.scrollIntoView({ block: 'end' });
    });
    await page.waitForTimeout(250);
    await expect(page.getByText('Mês anterior com pouco movimento')).toBeInViewport();
    await expect(page.getByTestId('finance-cashflow-chart')).toBeInViewport();
    await shot(page, 'small-previous-390-with-chart-light');
    await resizeAndRepaint(page, 390, 844);

    await frameChart(page);
    await expectYTicksAA(page);
    await shot(page, 'overview-390-light');

    await page.getByTestId('cashflow-hit-0').click();
    await expect(page.getByTestId('finance-cashflow-tooltip')).toContainText('1–6 set');
    await shot(page, 'week-tooltip-390-light');
    await page.keyboard.press('Escape');

    await setMode(page, 'dark');
    await frameChart(page);
    await expectYTicksAA(page);
    await shot(page, 'overview-390-dark');

    await page.setViewportSize({ width: 360, height: 800 });
    await setMode(page, 'light');
    await frameChart(page);
    await shot(page, 'overview-360-light');

    await page.setViewportSize({ width: 1440, height: 900 });
    await setMode(page, 'light');
    await frameChart(page);
    await expect(page.getByTestId('finance-cashflow-svg')).toBeVisible();
    await shot(page, 'overview-1440-light');

    await setMode(page, 'dark');
    await frameChart(page);
    await shot(page, 'overview-1440-dark');

    guard.assertNoLeak();
  });

  test('totais grandes cabem a 360 px sem overflow', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    guard.stubRpc('get_finance_stats', (_route, payload) => {
      const start = String((payload as { p_start_date?: string })?.p_start_date ?? '');
      if (start.startsWith('2026-08')) return { body: statsBody(TINY_AUGUST_TX) };
      return { body: statsBody(BIG_SEPTEMBER_TX) };
    });
    guard.stubRpc('get_monthly_finance_history', { body: [] });
    await stubSession(page);

    await page.setViewportSize({ width: 360, height: 800 });
    await openFinanceSeptember(page);
    await setMode(page, 'light');
    await frameChart(page);

    await expect(page.getByTestId('finance-cashflow-entradas')).toHaveText(/24[.\s]690,00\s€/);
    await expect(page.getByTestId('finance-cashflow-sobrou')).toHaveText(/12[.\s]345,00\s€/);

    const metrics = await page.evaluate(() => {
      const ids = ['finance-cashflow-totals', 'finance-cashflow-entradas', 'finance-cashflow-saidas', 'finance-cashflow-sobrou'];
      const card = document.getElementById('finance-cashflow')!.getBoundingClientRect();
      return ids.map((id) => {
        const el = document.querySelector(`[data-testid="${id}"]`) as HTMLElement;
        const r = el.getBoundingClientRect();
        return {
          id,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          insideCard: r.left >= card.left - 0.5 && r.right <= card.right + 0.5,
          ellipsis: getComputedStyle(el).textOverflow === 'ellipsis',
        };
      });
    });
    for (const m of metrics) {
      expect(m.scrollWidth, `${m.id} overflow`).toBeLessThanOrEqual(m.clientWidth);
      expect(m.insideCard, `${m.id} dentro do card`).toBe(true);
      expect(m.ellipsis, `${m.id} sem truncar`).toBe(false);
    }
    await shot(page, 'overview-360-big-light');

    guard.assertNoLeak();
  });
});
