/**
 * E2E PR-7 — sino de pedido online, aceite/recusa por profissional, Ajustes do staff.
 * Mocks de rede; escritas no Supabase de produção são bloqueadas.
 *
 *   npx playwright test e2e/overhaul-pr7.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installProdWriteGuard, type ProdWriteGuard } from './helpers/prodWriteGuard';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = process.env.E2E_SUPABASE_REF || 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const STAFF_X_ID = 'bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeee1';
const STAFF_Y_ID = 'bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeee2';
const PRO_X = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee1';
const PRO_Y = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee2';
const ARTIFACTS = '/opt/cursor/artifacts/screenshots/pr7';
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
] as const;
const NOW = '2026-10-04T12:00:00.000Z';
const NEW_COPY = 'Novo pedido: Zé Cliente, Corte tesoura, dom., 04/10 às 14:00';
const EDIT_COPY = 'Pedido de alteração: Zé Cliente, de dom., 04/10 às 12:00 para dom., 04/10 às 14:00';

const HOURS = {
  mon: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
  tue: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
  wed: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
  thu: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
  fri: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
  sat: { isOpen: true, blocks: [{ start: '09:00', end: '14:00' }] },
  sun: { isOpen: true, blocks: [{ start: '09:00', end: '14:00' }] },
};

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

async function settle(page: Page) {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation: none !important;
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition: none !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      caret-color: transparent !important;
    }`,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) active.blur();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
  await page.waitForTimeout(350);
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await settle(page);
  const dest = path.join(ARTIFACTS, `${name}.png`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: dest, fullPage: false });
}

function notif(id: string, userId: string, message: string, type: string) {
  return {
    id,
    user_id: userId,
    title: type === 'edit' ? 'Pedido de alteração' : 'Novo pedido',
    message,
    type,
    read: false,
    link: '/agenda',
    booking_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa07',
    created_at: NOW,
    event_key: `${type}:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa07`,
  };
}

const X_REQUEST = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa07',
  business_id: OWNER_ID,
  customer_name: 'Zé Cliente',
  customer_phone: '5511999998888',
  appointment_time: '2026-10-04T17:00:00.000Z',
  original_appointment_time: null,
  total_price: 45,
  professional_id: PRO_X,
  service_ids: ['svc-1'],
  status: 'pending',
  is_edit: false,
  notes: null,
};

type AppRole = 'owner' | 'staff-x' | 'staff-y';

async function stubApp(
  page: Page,
  role: AppRole,
  opts: {
    notifications?: unknown[];
    pending?: unknown[];
    scope?: 'none' | 'own' | 'all';
  } = {},
) {
  const userId = role === 'owner' ? OWNER_ID : role === 'staff-x' ? STAFF_X_ID : STAFF_Y_ID;
  const email = role === 'owner' ? 'owner.pr7@example.test' : role === 'staff-x' ? 'x.pr7@example.test' : 'y.pr7@example.test';
  const fullName = role === 'owner' ? 'Rhian Owner' : role === 'staff-x' ? 'Aline X' : 'Yago Y';
  const session = fakeSession(userId, email, fullName);
  const unread = [...(opts.notifications ?? [])];

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session },
  );

  const ownerProfile = {
    id: OWNER_ID,
    role: 'owner',
    company_id: OWNER_ID,
    full_name: 'Rhian Owner',
    business_name: 'Barbearia São João',
    business_slug: 'pr7-bell',
    public_booking_enabled: true,
    booking_lead_time_hours: 2,
    user_type: 'barber',
    region: 'BR',
    subscription_status: 'active',
    trial_ends_at: null,
    tutorial_completed: true,
    aios_enabled: false,
    photo_url: null,
    phone: '11999998888',
  };

  const staffProfile = {
    id: userId,
    role: 'staff',
    company_id: OWNER_ID,
    full_name: fullName,
    business_name: null,
    user_type: 'barber',
    region: 'BR',
    subscription_status: 'active',
    trial_ends_at: null,
    tutorial_completed: true,
    aios_enabled: false,
    photo_url: null,
  };

  const members = [
    {
      id: PRO_X,
      name: 'Aline X',
      photo_url: null,
      active: true,
      staff_user_id: STAFF_X_ID,
      user_id: OWNER_ID,
      is_owner: false,
      display_order: 1,
    },
    {
      id: PRO_Y,
      name: 'Yago Y',
      photo_url: null,
      active: true,
      staff_user_id: STAFF_Y_ID,
      user_id: OWNER_ID,
      is_owner: false,
      display_order: 2,
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

    if (pathname.includes('/rest/v1/notifications') && (method === 'PATCH' || method === 'POST')) {
      unread.forEach((row) => {
        (row as { read: boolean }).read = true;
      });
      await route.fallback();
      return;
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      await route.fallback();
      return;
    }

    if (pathname.includes('/rest/v1/notifications')) {
      await fulfillJson(route, unread);
      return;
    }
    if (pathname.includes('/rest/v1/profiles')) {
      if (role !== 'owner' && url.searchParams.get('id') === `eq.${OWNER_ID}`) {
        await fulfillJson(route, [ownerProfile]);
        return;
      }
      await fulfillJson(route, [role === 'owner' ? ownerProfile : staffProfile]);
      return;
    }
    if (pathname.includes('/rest/v1/team_members')) {
      if (url.search.includes(`staff_user_id=eq.${STAFF_X_ID}`)) {
        await fulfillJson(route, [members[0]]);
        return;
      }
      if (url.search.includes(`staff_user_id=eq.${STAFF_Y_ID}`)) {
        await fulfillJson(route, [members[1]]);
        return;
      }
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
        enable_self_rescheduling: true,
        public_products_enabled: false,
        timezone: 'America/Sao_Paulo',
        business_hours: HOURS,
        onboarding_completed: true,
        cancellation_policy: 'flexible',
        client_cancel_cutoff_hours: 2,
        client_cancel_note: null,
        staff_appointment_edit_scope: opts.scope ?? 'none',
      }]);
      return;
    }
    if (pathname.includes('/rest/v1/services')) {
      await fulfillJson(route, [{
        id: 'svc-1', name: 'Corte tesoura', price: 45, duration_minutes: 40, category_id: 'cat-1', active: true,
      }]);
      return;
    }
    if (pathname.includes('/rest/v1/appointments')) {
      await fulfillJson(route, []);
      return;
    }
    if (pathname.includes('/rest/v1/')) {
      await fulfillJson(route, []);
      return;
    }
    await route.fallback();
  });
}

async function openBell(page: Page) {
  await page.locator('#header-notifications-btn').click();
  await expect(page.getByTestId('notifications-panel')).toBeVisible({ timeout: 15_000 });
}

test.describe('PR-7 notificações de pedido', () => {
  test.setTimeout(90_000);

  for (const vp of VIEWPORTS) {
    test(`bell-owner-novo-pedido ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date(NOW));
      guard.stubRpc('list_company_pending_public_bookings', { body: [X_REQUEST] });
      guard.stubRpc('list_agenda_blocks', { body: [] });
      guard.stubRpc('get_commissions_due', { body: [] });
      guard.stubTable('notifications', { body: [] });
      await stubApp(page, 'owner', {
        notifications: [notif('n-owner-new', OWNER_ID, NEW_COPY, 'new')],
        pending: [X_REQUEST],
      });
      await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('notification-badge')).toHaveText('1', { timeout: 20_000 });
      await openBell(page);
      await expect(page.getByTestId('bell-notification-message')).toHaveText(NEW_COPY);
      await expect(page.getByTestId('bell-relative-time')).toHaveText('agora');
      await expect(page.getByTestId('bell-unread-dot')).toBeVisible();
      await expect(page.getByTestId('mark-all-read')).toBeVisible();
      await shot(page, `bell-owner-novo-pedido-${vp.name}`);
      guard.assertNoLeak();
    });

    test(`bell-staff-novo-pedido ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date(NOW));
      guard.stubRpc('list_company_pending_public_bookings', { body: [X_REQUEST] });
      guard.stubRpc('list_agenda_blocks', { body: [] });
      guard.stubRpc('get_commissions_due', { body: [] });
      guard.stubRpc('relink_staff_if_unbound', { body: null });
      guard.stubTable('notifications', { body: [] });
      await stubApp(page, 'staff-x', {
        notifications: [notif('n-x-new', STAFF_X_ID, NEW_COPY, 'new')],
        pending: [X_REQUEST],
      });
      await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('notification-badge')).toHaveText('1', { timeout: 20_000 });
      await openBell(page);
      await expect(page.getByTestId('bell-notification-message')).toHaveText(NEW_COPY);
      await expect(page.getByTestId('bell-relative-time')).toHaveText('agora');
      await expect(page.getByTestId('bell-unread-dot')).toBeVisible();
      await expect(page.getByTestId('mark-all-read')).toBeVisible();
      await shot(page, `bell-staff-novo-pedido-${vp.name}`);
      guard.assertNoLeak();
    });

    test(`bell-alteracao ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date(NOW));
      const editReq = {
        ...X_REQUEST,
        is_edit: true,
        original_appointment_time: '2026-10-04T15:00:00.000Z',
      };
      guard.stubRpc('list_company_pending_public_bookings', { body: [editReq] });
      guard.stubRpc('list_agenda_blocks', { body: [] });
      guard.stubRpc('get_commissions_due', { body: [] });
      guard.stubTable('notifications', { body: [] });
      await stubApp(page, 'owner', {
        notifications: [notif('n-owner-edit', OWNER_ID, EDIT_COPY, 'edit')],
        pending: [editReq],
      });
      await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('notification-badge')).toHaveText('1', { timeout: 20_000 });
      await openBell(page);
      await expect(page.getByTestId('bell-notification-message')).toHaveText(EDIT_COPY);
      await expect(page.getByTestId('bell-relative-time')).toHaveText('agora');
      await shot(page, `bell-alteracao-${vp.name}`);
      guard.assertNoLeak();
    });

    test(`agenda-staff-sem-botoes ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date(NOW));
      guard.stubRpc('list_company_pending_public_bookings', { body: [X_REQUEST] });
      guard.stubRpc('list_agenda_blocks', { body: [] });
      guard.stubRpc('get_commissions_due', { body: [] });
      guard.stubRpc('relink_staff_if_unbound', { body: null });
      guard.stubTable('notifications', { body: [] });
      await stubApp(page, 'staff-y', { notifications: [], pending: [X_REQUEST], scope: 'none' });
      await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('agenda-public-bookings')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Zé Cliente')).toBeVisible();
      await expect(page.getByRole('button', { name: /^Aceitar$/ })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Recusar$/ })).toHaveCount(0);
      await expect(page.getByText('aceite ou recuse')).toHaveCount(0);
      await expect(page.getByText('Pedido para Aline X. Só Aline X ou o dono podem responder.')).toBeVisible();
      await shot(page, `agenda-staff-sem-botoes-${vp.name}`);
      guard.assertNoLeak();
    });

    test(`bell-after-read ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date(NOW));
      guard.stubRpc('list_company_pending_public_bookings', { body: [X_REQUEST] });
      guard.stubRpc('list_agenda_blocks', { body: [] });
      guard.stubRpc('get_commissions_due', { body: [] });
      guard.stubTable('notifications', { body: [] });
      await stubApp(page, 'owner', {
        notifications: [notif('n-owner-new', OWNER_ID, NEW_COPY, 'new')],
        pending: [X_REQUEST],
      });
      await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('notification-badge')).toHaveText('1', { timeout: 20_000 });
      await openBell(page);
      await page.getByTestId('mark-all-read').click();
      await expect(page.getByTestId('notification-badge')).toHaveCount(0);
      await expect(page.getByTestId('mark-all-read')).toHaveCount(0);
      await expect(page.getByTestId('bell-notification')).toHaveAttribute('data-read', 'true');
      await expect(page.getByText('Nenhuma notificação nova')).toHaveCount(0);
      await expect(page.getByTestId('bell-notification-message')).toHaveText(NEW_COPY);
      await shot(page, `bell-after-read-${vp.name}`);
      guard.assertNoLeak();
    });
  }

  test('clicar na notificação marca lida e foca o pedido na agenda', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const guard = await installProdWriteGuard(page);
    await page.clock.setFixedTime(new Date(NOW));
    guard.stubRpc('list_company_pending_public_bookings', { body: [X_REQUEST] });
    guard.stubRpc('list_agenda_blocks', { body: [] });
    guard.stubRpc('get_commissions_due', { body: [] });
    guard.stubTable('notifications', { body: [] });
    await stubApp(page, 'owner', {
      notifications: [notif('n-owner-new', OWNER_ID, NEW_COPY, 'new')],
      pending: [X_REQUEST],
    });
    await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('notification-badge')).toHaveText('1', { timeout: 20_000 });
    await openBell(page);
    await page.getByTestId('bell-notification').click();
    await expect(page).toHaveURL(/booking=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa07/);
    await expect(page.getByTestId('agenda-public-booking-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa07'))
      .toHaveAttribute('data-highlighted', 'true');
    await expect(page.getByTestId('notification-badge')).toHaveCount(0);
    guard.assertNoLeak();
  });

  test('staff não vê cards de Ajustes do dono', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const guard = await installProdWriteGuard(page);
    guard.stubRpc('list_company_pending_public_bookings', { body: [] });
    guard.stubRpc('list_agenda_blocks', { body: [] });
    guard.stubRpc('relink_staff_if_unbound', { body: null });
    guard.stubRpc('get_commissions_due', { body: [] });
    guard.stubTable('notifications', { body: [] });
    await stubApp(page, 'staff-y', { notifications: [] });
    await page.goto(`${BASE}/#/configuracoes/agendamento`, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/configuracoes\/agendamento/);
    await expect(page.getByText('Agendamento online')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Ajustes' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Geral' })).toHaveCount(0);
    guard.assertNoLeak();
  });
});
