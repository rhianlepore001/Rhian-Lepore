/**
 * Mocks compartilhados dos e2e de layout do Financeiro (PR-E, PR-F). Sem escrita em prod.
 */
import { expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { ProdWriteGuard } from './prodWriteGuard';

export const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
export const PROJECT_REF = process.env.E2E_SUPABASE_REF || 'lcqwrngscsziysyfhpfj';
export const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';

export const STAFF_NAMES = [
  'Ana Souza', 'Bruno Lima', 'Carla Dias', 'Diego Rocha', 'Eva Martins',
  'Fábio Nunes', 'Gabi Torres', 'Hugo Alves', 'Inês Prado', 'João Reis',
];
export const staffId = (i: number) => `7d3f2a9c-4b1e-4c8a-9f6d-2e5b8a1c0d${String(i).padStart(2, '0')}`;
export const ANA_ID = staffId(0);
export const BRUNO_ID = staffId(1);

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
export const TXS = Array.from({ length: 12 }, (_, i) => tx(i));

export function members() {
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

export const cycle = {
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

export interface StubOptions {
  cycle?: unknown;
  monthlyHistory?: unknown[];
  /** 'beauty' = salão (acento roxo). Padrão: 'barber'. */
  theme?: 'barber' | 'beauty';
  businessName?: string;
}

export async function stubApp(page: Page, guard: ProdWriteGuard, mode: 'light' | 'dark', opts: StubOptions = {}) {
  const session = fakeSession(OWNER_ID, 'owner.fine@example.test', 'Rhian Owner');
  const theme = opts.theme ?? 'barber';
  await page.addInitScript(
    ({ key, value, colorMode, themeId }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem('agendix_color_mode', colorMode);
      document.documentElement.setAttribute('data-mode', colorMode);
      document.documentElement.setAttribute('data-theme', themeId);
      void navigator.serviceWorker?.getRegistrations?.().then((rs) => rs.forEach((r) => r.unregister()));
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session, colorMode: mode, themeId: theme },
  );
  const profile = {
    id: OWNER_ID, role: 'owner', company_id: OWNER_ID, full_name: 'Rhian Owner',
    business_name: opts.businessName ?? 'Studio Atlas', user_type: theme, region: 'PT', subscription_status: 'active',
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
  guard.stubRpc('get_monthly_finance_history', { body: opts.monthlyHistory ?? [] });
  guard.stubRpc('get_commission_cycle_v1', { body: opts.cycle ?? cycle });
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

export async function setMode(page: Page, mode: 'light' | 'dark') {
  await page.evaluate((next) => {
    document.documentElement.setAttribute('data-mode', next);
    localStorage.setItem('agendix_color_mode', next);
  }, mode);
  await page.waitForTimeout(1000);
}

export async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) active.blur();
  });
  await page.waitForTimeout(400);
}

export async function shot(page: Page, dir: string, name: string, fullPage = true) {
  fs.mkdirSync(dir, { recursive: true });
  await settle(page);
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage });
}

export async function openFinance(page: Page, tab?: 'commissions' | 'history') {
  await page.goto(`${BASE}/#/financeiro${tab ? `?tab=${tab}` : ''}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Financeiro', level: 1 })).toBeVisible({ timeout: 20_000 });
}

