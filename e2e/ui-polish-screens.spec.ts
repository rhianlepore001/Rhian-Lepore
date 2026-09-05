/**
 * Prints mobile: grade da Agenda alinhada + Financeiro compacto.
 * npx playwright test e2e/ui-polish-screens.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const SELF_MEMBER_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const OTHER_MEMBER_ID = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
const ARTIFACTS = '/opt/cursor/artifacts';

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function fakeJwt(sub: string): string {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  });
  return `${header}.${payload}.e2e-fake-sig`;
}

function todayAt(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  const accept = route.request().headers()['accept'] || '';
  const wantsObject = accept.includes('vnd.pgrst.object+json');
  const payload = wantsObject && Array.isArray(body) ? (body[0] ?? null) : body;
  await route.fulfill({
    status: wantsObject && payload === null ? 406 : status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

async function installMocks(page: Page, mode: 'light' | 'dark') {
  const accessToken = fakeJwt(OWNER_ID);
  const session = {
    access_token: accessToken,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: OWNER_ID,
      email: 'owner.ui@example.test',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: 'Barbearia Silva' },
      created_at: '2026-01-01T00:00:00.000Z',
    },
  };

  const appointments = [
    {
      id: 'apt-1',
      service: 'Corte Feminino',
      appointment_time: todayAt(12, 0),
      price: 80,
      status: 'Confirmed',
      professional_id: SELF_MEMBER_ID,
      duration_minutes: 60,
      notes: null,
      edited_at: null,
      payment_method: 'cash',
      client_id: 'c1',
      clients: { name: 'Britocesar', id: 'c1', phone: '11999999999' },
    },
    {
      id: 'apt-2',
      service: 'Pedicure',
      appointment_time: todayAt(14, 0),
      price: 40,
      status: 'Confirmed',
      professional_id: OTHER_MEMBER_ID,
      duration_minutes: 30,
      notes: null,
      edited_at: null,
      payment_method: 'pix',
      client_id: 'c2',
      clients: { name: 'Maria raimunda', id: 'c2', phone: '11888888888' },
    },
  ];

  const now = new Date();
  const txDate = new Date(now.getFullYear(), now.getMonth(), 12, 18, 0, 0).toISOString();

  const financeStats = {
    revenue: 480,
    expenses: 500,
    profit: -20,
    commissions_pending: 0,
    pendingExpenses: 0,
    revenue_by_method: { pix: 160, mbway: 0, dinheiro: 240, cartao: 80 },
    transactions: [
      {
        id: 'tx-1',
        type: 'revenue',
        service_name: 'Corte Feminino',
        description: 'Corte Feminino',
        amount: 80,
        expense: 0,
        created_at: txDate,
        barber_name: 'Mario',
        professional_id: SELF_MEMBER_ID,
        client_name: 'asdasdasd',
        payment_method: 'cash',
        commission_paid: true,
        status: 'paid',
      },
      {
        id: 'tx-2',
        type: 'revenue',
        service_name: 'Corte Feminino',
        description: 'Corte Feminino',
        amount: 80,
        expense: 0,
        created_at: txDate,
        barber_name: 'Rhian Lepore',
        professional_id: OTHER_MEMBER_ID,
        client_name: 'arMar',
        payment_method: 'pix',
        commission_paid: true,
        status: 'paid',
      },
      {
        id: 'tx-3',
        type: 'expense',
        service_name: 'Produtos',
        description: 'Produtos',
        amount: 0,
        expense: 50,
        created_at: txDate,
        barber_name: 'Manual',
        professional_id: null,
        client_name: '',
        payment_method: 'pix',
        commission_paid: true,
        status: 'paid',
      },
    ],
  };

  await page.addInitScript(
    ({ key, value, mode: colorMode }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem('agendix_color_mode', colorMode);
      navigator.serviceWorker?.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session, mode },
  );

  await page.route(`**/${PROJECT_REF}.supabase.co/**`, async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname.includes('/auth/v1/user')) {
      await fulfillJson(route, session.user);
      return;
    }
    if (pathname.includes('/auth/v1/token') || pathname.includes('/auth/v1/session')) {
      await fulfillJson(route, session);
      return;
    }
    if (pathname.includes('/rest/v1/profiles')) {
      await fulfillJson(route, [
        {
          id: OWNER_ID,
          role: 'owner',
          company_id: OWNER_ID,
          full_name: 'Rhian',
          business_name: 'Barbearia Silva',
          user_type: 'beauty',
          region: 'PT',
          subscription_status: 'active',
          tutorial_completed: true,
        },
      ]);
      return;
    }
    if (pathname.includes('/rest/v1/team_members')) {
      await fulfillJson(route, [
        {
          id: SELF_MEMBER_ID,
          name: 'Mario Cesar',
          photo_url: null,
          active: true,
          staff_user_id: null,
          user_id: OWNER_ID,
          is_owner: true,
        },
        {
          id: OTHER_MEMBER_ID,
          name: 'Rhian Lepore',
          photo_url: null,
          active: true,
          staff_user_id: null,
          user_id: OWNER_ID,
          is_owner: false,
        },
      ]);
      return;
    }
    if (pathname.includes('/rest/v1/onboarding_progress')) {
      await fulfillJson(route, [{ is_completed: true }]);
      return;
    }
    if (pathname.includes('/rest/v1/business_settings')) {
      await fulfillJson(route, [{ user_id: OWNER_ID, business_hours: {} }]);
      return;
    }
    if (pathname.includes('/rest/v1/appointments')) {
      await fulfillJson(route, appointments);
      return;
    }
    if (pathname.includes('/rest/v1/services')) {
      await fulfillJson(route, [
        { name: 'Corte Feminino', price: 80, duration_minutes: 60 },
        { name: 'Pedicure', price: 40, duration_minutes: 30 },
      ]);
      return;
    }
    if (pathname.includes('/rpc/get_finance_stats')) {
      await fulfillJson(route, financeStats);
      return;
    }
    if (pathname.includes('/rest/v1/')) {
      await fulfillJson(route, []);
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test.describe('UI polish — Agenda e Financeiro', () => {
  test.setTimeout(120_000);

  test('grade alinhada e financeiro compacto no mobile', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });

    await installMocks(page, 'dark');
    await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('agenda-resource-grid')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /Britocesar/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Maria raimunda/ })).toBeVisible();

    const britocesar = page.getByRole('button', { name: /Britocesar/ });
    await britocesar.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const alignment = await page.evaluate(() => {
      const noon = [...document.querySelectorAll('[data-agenda-slot="12:00"]')] as HTMLElement[];
      const two = [...document.querySelectorAll('[data-agenda-slot="14:00"]')] as HTMLElement[];
      const tops = (els: HTMLElement[]) => els.map((el) => el.getBoundingClientRect().top);
      const heights = (els: HTMLElement[]) => els.map((el) => el.getBoundingClientRect().height);
      const delta = (vals: number[]) => (vals.length ? Math.max(...vals) - Math.min(...vals) : 0);
      const chip = document.querySelector('[data-agenda-span]') as HTMLElement | null;
      return {
        noonTops: tops(noon),
        twoTops: tops(two),
        noonHeights: heights(noon),
        noonDelta: delta(tops(noon)),
        twoDelta: delta(tops(two)),
        heightDelta: delta(heights(noon)),
        chipAbsolute: chip ? getComputedStyle(chip).position : null,
      };
    });

    expect(alignment.noonDelta).toBeLessThan(1);
    expect(alignment.twoDelta).toBeLessThan(1);
    expect(alignment.heightDelta).toBeLessThan(1);
    expect(alignment.chipAbsolute).toBe('absolute');

    await page.screenshot({ path: path.join(ARTIFACTS, 'agenda-grade-alinhada.png'), fullPage: false });

    await page.goto(`${BASE}/#/financeiro`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^Financeiro$/i })).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => {
      localStorage.setItem('agendix_color_mode', 'light');
      document.documentElement.setAttribute('data-mode', 'light');
      const scroller = [...document.querySelectorAll('div')].find((el) =>
        el.className.includes('overflow-y-auto') && el.className.includes('h-[100dvh]'),
      ) as HTMLElement | undefined;
      (scroller ?? document.scrollingElement)?.scrollTo(0, 0);
    });
    await expect(page.getByText('Receita').first()).toBeVisible();
    await expect(page.getByText('480,00').first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(200);

    const kpiMetrics = await page.evaluate(() => {
      const mainPad = document.querySelector('main > div') as HTMLElement | null;
      const cs = mainPad ? getComputedStyle(mainPad) : null;
      const cards = [...document.querySelectorAll('[data-testid="finance-tx-card"]')] as HTMLElement[];
      return {
        paddingLeft: cs ? parseFloat(cs.paddingLeft) : null,
        paddingRight: cs ? parseFloat(cs.paddingRight) : null,
        kpiCount: document.body.innerText.includes('Despesas') ? 3 : 0,
        txHeights: cards.map((c) => Math.round(c.getBoundingClientRect().height)),
      };
    });

    expect(kpiMetrics.paddingLeft).toBeLessThanOrEqual(20);
    expect(kpiMetrics.paddingRight).toBeLessThanOrEqual(20);

    await page.screenshot({ path: path.join(ARTIFACTS, 'financeiro-kpis-compactos.png'), fullPage: false });

    const txHeading = page.getByText('Transações recentes');
    await txHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('finance-tx-card').first()).toBeVisible();

    const txHeights = await page.locator('[data-testid="finance-tx-card"]').evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().height)),
    );
    expect(txHeights.length).toBeGreaterThan(0);
    expect(Math.max(...txHeights)).toBeLessThan(88);

    await page.screenshot({ path: path.join(ARTIFACTS, 'financeiro-transacoes-compactas.png'), fullPage: false });
  });
});
