/**
 * E2E Fin PR-D — ciclo de comissão semanal/quinzenal/mensal (mocks, sem escrita em prod).
 *
 *   npx playwright test e2e/fin-d-commission-schedule.spec.ts --project=chromium-legacy
 */
import { expect, test, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installProdWriteGuard, type ProdWriteGuard } from './helpers/prodWriteGuard';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = process.env.E2E_SUPABASE_REF || 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const ANA_ID = '7d3f2a9c-4b1e-4c8a-9f6d-2e5b8a1c0d4f';  // uuid v4 válido (teamMemberSchema)
const ARTIFACTS = process.env.E2E_SHOTS_DIR ? `${process.env.E2E_SHOTS_DIR}/fin-d` : '/opt/cursor/artifacts/screenshots/fin-d';
const NOW = '2026-10-04T15:00:00.000Z';

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
    headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

const businessSchedule = {
  id: 'sch-biz',
  user_id: OWNER_ID,
  professional_id: null,
  frequency: 'monthly',
  close_days: [5],
  anchor_date: null,
  pay_offset_days: 2,
  reminder_offsets: [2, 0],
  effective_from: '2000-01-01',
};

function schedulesPayload(notice = true, exceptions: unknown[] = []) {
  return {
    today: '2026-10-04',
    tz: 'Europe/Lisbon',
    notice,
    business: businessSchedule,
    exceptions,
    current_end: '2026-10-05',
  };
}

function anaMember(cycle: {
  start: string;
  end: string;
  open: boolean;
  pay_due: string;
  previous_end: string;
  next_end: string;
}) {
  return {
    tz: 'Europe/Lisbon',
    currency: 'EUR',
    settlement_day: 5,
    frequency: 'biweekly',
    pay_offset_days: 2,
    pay_due: cycle.pay_due,
    cycle: { start: cycle.start, end: cycle.end, open: cycle.open, pay_due: cycle.pay_due },
    previous_end: cycle.previous_end,
    next_end: cycle.next_end,
    totals: { a_pagar_ciclo: 39, pendentes: 1, pago_ciclo: 0 },
    members: [{
      name: 'Ana Souza',
      status: 'pendente',
      inactive: false,
      photo_url: null,
      pago_ciclo: null,
      a_pagar_ciclo: 39,
      pago_ciclo_em: null,
      pago_calculado: 0,
      produtos_ciclo: 0,
      saldo_anterior: 0,
      primeiro_nao_pago: cycle.start,
      servicos_ciclo: 2,
      commission_rate: 40,
      professional_id: ANA_ID,
      saldo_acumulado: 39,
      ultimo_pagamento: null,
    }],
  };
}

const closedBiweekly = anaMember({
  start: '2026-09-06',
  end: '2026-09-20',
  open: false,
  pay_due: '2026-09-22',
  previous_end: '2026-08-20',
  next_end: '2026-10-05',
});

const openBiweekly = anaMember({
  start: '2026-09-21',
  end: '2026-10-05',
  open: true,
  pay_due: '2026-10-07',
  previous_end: '2026-09-20',
  next_end: '2026-10-20',
});

const reminderNotif = {
  id: 'n-comm-1',
  user_id: OWNER_ID,
  title: 'Pagamento de comissão',
  message: 'Faltam 2 dias para o fechamento do ciclo. Você paga até 07/10.',
  type: 'commission_reminder',
  read: false,
  link: '/financeiro?tab=commissions',
  booking_id: null,
  event_key: `commission:${OWNER_ID}:_:2026-10-05:2`,
  created_at: NOW,
};

type Scene = 'settings' | 'pay-closed' | 'pay-open' | 'home';

async function stubApp(page: Page, scene: Scene, mode: 'light' | 'dark') {
  const session = fakeSession(OWNER_ID, 'owner.find@example.test', 'Rhian Owner');
  const notifications = scene === 'home' ? [reminderNotif] : [];

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
    id: OWNER_ID,
    role: 'owner',
    company_id: OWNER_ID,
    full_name: 'Rhian Owner',
    business_name: 'Studio Atlas',
    user_type: 'barber',
    region: 'PT',
    subscription_status: 'active',
    trial_ends_at: null,
    tutorial_completed: true,
    aios_enabled: false,
    photo_url: null,
  };

  const members = [
    {
      id: OWNER_ID,
      name: 'Rhian Owner',
      role: 'Dono',
      photo_url: null,
      active: true,
      is_owner: true,
      user_id: OWNER_ID,
      commission_rate: 0,
      staff_user_id: OWNER_ID,
    },
    {
      id: ANA_ID,
      name: 'Ana Souza',
      role: 'Barbeira',
      photo_url: null,
      active: true,
      is_owner: false,
      user_id: OWNER_ID,
      commission_rate: 40,
      staff_user_id: null,
    },
  ];

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

    if (pathname.includes('/rest/v1/notifications')) {
      await fulfillJson(route, notifications);
      return;
    }
    if (pathname.includes('/rest/v1/profiles')) {
      await fulfillJson(route, [profile]);
      return;
    }
    if (pathname.includes('/rest/v1/team_members')) {
      await fulfillJson(route, members);
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
        commission_settlement_day_of_month: 5,
        onboarding_completed: true,
        machine_fee_enabled: false,
        debit_fee_percent: 0,
        credit_fee_percent: 0,
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

function stubRpcs(guard: ProdWriteGuard, scene: Scene) {
  const cycle = scene === 'pay-open' ? openBiweekly : closedBiweekly;
  guard.stubRpc('get_commission_schedules_v1', { body: schedulesPayload(true) });
  guard.stubRpc('set_commission_schedule_v1', {
    body: { id: 'sch-new', effective_from: '2026-10-05', current_end: '2026-10-05', professional_id: null },
  });
  guard.stubRpc('dismiss_commission_schedule_notice_v1', { body: { ok: true } });
  guard.stubRpc('generate_commission_reminders_v1', { body: { inserted: scene === 'home' ? 1 : 0 } });
  guard.stubRpc('preview_commission_schedule_v1', {
    body: {
      today: '2026-10-04',
      tz: 'Europe/Lisbon',
      current_end: '2026-10-05',
      effective_from: '2026-10-05',
      closes: ['2026-10-05', '2026-10-20'],
      pay_dues: ['2026-10-07', '2026-10-22'],
      reminders: ['2026-10-03', '2026-10-18'],
    },
  });
  guard.stubRpc('get_commission_cycle_v1', { body: cycle });
  guard.stubRpc('preview_commission_pay_v1', {
    body: { amount: 39, count: 1, start: cycle.cycle.start, end: scene === 'pay-open' ? '2026-10-04' : cycle.cycle.end, tz: 'Europe/Lisbon' },
  });
  guard.stubRpc('pay_commission_v1', { body: { amount: 39, count: 1, start: cycle.cycle.start, end: cycle.cycle.end, tz: 'Europe/Lisbon' } });
  guard.stubRpc('get_finance_stats', {
    body: { revenue: 0, expenses: 0, profit: 0, commissions_pending: 39, pendingExpenses: 0, revenue_by_method: {}, transactions: [] },
  });
  guard.stubRpc('get_commissions_due', { body: [] });
  guard.stubRpc('list_agenda_blocks', { body: [] });
  guard.stubRpc('list_company_pending_public_bookings', { body: [] });
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) active.blur();
  });
  await page.waitForTimeout(400);
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await settle(page);
  await page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`), fullPage: true });
}

async function shotEl(page: Page, locator: ReturnType<Page['locator']>, name: string) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const vp = page.viewportSize()!;
  const h = await locator.evaluate((el) => el.getBoundingClientRect().height);
  await page.setViewportSize({ width: vp.width, height: Math.ceil(h) + 520 });
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await settle(page);
  const box = (await locator.boundingBox())!;
  await page.screenshot({
    path: path.join(ARTIFACTS, `${name}.png`),
    clip: { x: 0, y: Math.max(0, box.y - 16), width: vp.width, height: box.height + 32 },
  });
  await page.setViewportSize(vp);
}

const scheduleSection = (page: Page) =>
  page.getByTestId('commission-schedule-editor').locator('xpath=ancestor::section[1]');

async function openSettingsEditor(page: Page) {
  await page.goto(`${BASE}/#/configuracoes/equipe`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('commission-schedule-editor')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('commission-schedule-editor').scrollIntoViewIfNeeded();
}

test.describe('Fin PR-D ciclo de comissão', () => {
  test.setTimeout(90_000);

  test('ajustes: mensal, quinzenal com preview, semanal e salvar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const guard = await installProdWriteGuard(page);
    await page.clock.setFixedTime(new Date(NOW));
    stubRpcs(guard, 'settings');
    await stubApp(page, 'settings', 'light');
    await openSettingsEditor(page);
    await expect(page.getByTestId('commission-schedule-notice')).toContainText('regra da barbearia');
    await expect(page.getByRole('tab', { name: 'Mensal' })).toHaveAttribute('aria-selected', 'true');
    await shotEl(page, scheduleSection(page), 'settings-390-light-monthly');

    await page.getByRole('tab', { name: 'Quinzenal' }).click();
    await expect(page.getByTestId('commission-schedule-preview')).toContainText(
      'Próximos fechamentos: 20/10 e 05/11. Você paga até 22/10 e 07/11.',
    );
    await expect(page.getByTestId('commission-schedule-change')).toContainText(
      'A mudança vale a partir do próximo fechamento (20/10). O período atual continua até 05/10.',
    );
    await shotEl(page, scheduleSection(page), 'settings-390-light-biweekly');

    await page.getByRole('tab', { name: 'Semanal' }).click();
    await page.getByRole('button', { name: 'Sex' }).click();
    await expect(page.getByTestId('commission-schedule-preview')).toContainText('09/10');
    await shotEl(page, scheduleSection(page), 'settings-390-light-weekly');

    await page.getByTestId('commission-schedule-save').click();
    await expect(page.getByText('Pagamento da comissão salvo.')).toBeVisible({ timeout: 10_000 });
    guard.assertNoLeak();
  });

  test('ajustes 390 dark e 1440 light', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    await page.clock.setFixedTime(new Date(NOW));
    stubRpcs(guard, 'settings');
    await stubApp(page, 'settings', 'light');
    await page.setViewportSize({ width: 390, height: 844 });
    await openSettingsEditor(page);
    await page.locator('#header-theme-toggle').click();
    await page.waitForTimeout(1000);
    await page.getByTestId('commission-schedule-editor').scrollIntoViewIfNeeded();
    await shotEl(page, scheduleSection(page), 'settings-390-dark-monthly');

    await page.locator('#header-theme-toggle').click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(1000);
    await page.getByTestId('commission-schedule-editor').scrollIntoViewIfNeeded();
    await shotEl(page, scheduleSection(page), 'settings-1440-light-monthly');
    guard.assertNoLeak();
  });

  test('exceção no drawer do colaborador', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const guard = await installProdWriteGuard(page);
    await page.clock.setFixedTime(new Date(NOW));
    stubRpcs(guard, 'settings');
    await stubApp(page, 'settings', 'light');
    await page.goto(`${BASE}/#/configuracoes/equipe`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ana Souza')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Editar Ana Souza' }).click();
    const toggle = page.getByLabel('Usar regra do negócio');
    await expect(toggle).toBeVisible({ timeout: 10_000 });
    await expect(toggle).toBeChecked();
    await page.locator('label[for="use-business-schedule"]').filter({ hasText: 'Usar regra do negócio' }).click();
    const drawer = page.getByTestId('collaborator-schedule-exception');
    await expect(drawer.getByTestId('commission-schedule-editor')).toBeVisible();
    await drawer.getByRole('tab', { name: 'Semanal' }).click();
    await drawer.getByRole('button', { name: 'Sex' }).click();
    await shotEl(page, page.getByTestId('collaborator-schedule-exception'), 'exception-drawer-390');
    await page.getByTestId('collaborator-schedule-exception').scrollIntoViewIfNeeded();
    await shot(page, 'exception-drawer-390-viewport');
    guard.assertNoLeak();
  });

  test('Pagamentos quinzenal + Pagar agora', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const guard = await installProdWriteGuard(page);
    await page.clock.setFixedTime(new Date(NOW));
    stubRpcs(guard, 'pay-closed');
    await stubApp(page, 'pay-closed', 'light');
    await page.goto(`${BASE}/#/financeiro`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'Pagamentos' }).click();
    await expect(page.getByTestId('commission-cycle-header')).toContainText('Período 06/09 – 20/09', { timeout: 20_000 });
    await expect(page.getByTestId('commission-cycle-header')).toContainText('fecha em 20/09');
    await expect(page.getByTestId('commission-cycle-header')).toContainText('pagar até 22/09');
    await shot(page, 'pagamentos-header-390-biweekly');
    guard.assertNoLeak();
  });

  test('Pagar agora em ciclo aberto usa hoje', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const guard = await installProdWriteGuard(page);
    await page.clock.setFixedTime(new Date(NOW));
    stubRpcs(guard, 'pay-open');
    await stubApp(page, 'pay-open', 'light');
    await page.goto(`${BASE}/#/financeiro`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'Pagamentos' }).click();
    await expect(page.getByRole('button', { name: 'Pagar Ana Souza' })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Pagar Ana Souza' }).click();
    await expect(page.getByText('Confirmar repasse')).toBeVisible();
    await expect(page.getByRole('button', { name: /Pagar .* de .* a hoje/ })).toBeVisible();
    await shot(page, 'pagar-agora-390');
    guard.assertNoLeak();
  });

  test('sino e banner no Início', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const guard = await installProdWriteGuard(page);
    await page.clock.setFixedTime(new Date(NOW));
    stubRpcs(guard, 'home');
    await stubApp(page, 'home', 'light');
    await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('attention-commission-due')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('attention-commission-due').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await shot(page, 'inicio-banner-390');
    await page.locator('#header-notifications-btn').click();
    await expect(page.getByTestId('notifications-panel')).toBeVisible();
    await expect(page.getByTestId('bell-notification')).toContainText('fechamento do ciclo');
    await shot(page, 'bell-reminder-390');
    guard.assertNoLeak();
  });
});
