/**
 * E2E PR-3 — status ao vivo (cliente e dono).
 * Mocks de rede; escritas no Supabase de produção são bloqueadas.
 *
 *   npx playwright test e2e/overhaul-pr3-realtime.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installProdWriteGuard, type ProdWriteGuard } from './helpers/prodWriteGuard';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const BIZ_ID = 'biz-pr3';
const ARTIFACTS = '/opt/cursor/artifacts/screenshots/pr3-realtime';
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
] as const;

const BOOKING_PENDING = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  appointment_time: '2026-10-10T14:00:00.000Z',
  status: 'pending',
  service_ids: ['svc-1'],
  service_names: ['Corte tesoura'],
  professional_id: 'pro-1',
  professional_name: 'Mário',
  total_price: 25,
  duration_minutes: 30,
  created_at: '2026-10-01T00:00:00.000Z',
};

const BOOKING_OTHER = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  appointment_time: '2026-10-11T16:00:00.000Z',
  status: 'pending',
  service_ids: ['svc-1'],
  service_names: ['Barba'],
  professional_id: 'pro-1',
  professional_name: 'Mário',
  total_price: 15,
  duration_minutes: 20,
  created_at: '2026-10-01T00:00:00.000Z',
};

const OWNER_REQUEST = {
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  business_id: OWNER_ID,
  customer_name: 'Carla Online',
  customer_phone: '11977776666',
  appointment_time: '2026-10-12T15:00:00.000Z',
  total_price: 40,
  professional_id: 'tm-1',
  service_ids: ['svc-1'],
  status: 'pending',
  notes: null,
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

const PROFILE_PUBLIC = {
  id: BIZ_ID,
  business_name: 'Barbearia São João',
  user_type: 'barber',
  region: 'PT',
  business_slug: 'pr3-live',
  public_booking_enabled: true,
  phone: '912345678',
  logo_url: null,
  cover_photo_url: null,
  allow_client_rescheduling: true,
};

const SETTINGS_PUBLIC = {
  timezone: 'Europe/Lisbon',
  enable_self_rescheduling: true,
  cancellation_policy: 'flexible',
  business_hours: {
    mon: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    tue: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    wed: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    thu: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    fri: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    sat: { isOpen: true, blocks: [{ start: '09:00', end: '14:00' }] },
    sun: { isOpen: false, blocks: [] },
  },
};

function stubClientRpcs(guard: ProdWriteGuard, bookingsRef: { rows: unknown[] }) {
  guard.stubRpc('get_public_profile_by_slug', { body: PROFILE_PUBLIC });
  guard.stubRpc('get_public_business_settings_json', { body: SETTINGS_PUBLIC });
  guard.stubRpc('get_client_bookings_history', () => ({ body: bookingsRef.rows }));
  guard.stubRpc('get_client_booking_cancellations', { body: {} });
  guard.stubRpc('get_public_membership_plans', { body: [] });
  guard.stubRpc('get_public_client_membership', { body: null });
  guard.stubRpc('find_active_queue_entry_by_phone', { body: [] });
}

async function mockPublicClient(page: Page, bookingsRef: { rows: unknown[] }) {
  const sessionClient = { id: 'cli-1', name: 'Zé Cliente', phone: '11999998888', business_id: BIZ_ID };
  await page.addInitScript(
    ({ bizId, client }) => {
      localStorage.setItem(`rhian_public_client_${bizId}`, JSON.stringify(client));
    },
    { bizId: BIZ_ID, client: sessionClient },
  );

  await page.route(`**/${PROJECT_REF}.supabase.co/**`, async (route) => {
    const req = route.request();
    const method = req.method();
    const pathname = new URL(req.url()).pathname;
    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
        },
      });
      return;
    }
    if (method === 'GET' || method === 'HEAD') {
      await fulfillJson(route, []);
      return;
    }
    if (pathname.includes('/auth/')) {
      await fulfillJson(route, {});
      return;
    }
    await route.fallback();
  });
}

async function mockOwnerAgenda(page: Page, pendingRef: { rows: unknown[] }) {
  const accessToken = fakeJwt(OWNER_ID, 'owner.pr3@example.test');
  const session = {
    access_token: accessToken,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: OWNER_ID,
      email: 'owner.pr3@example.test',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: 'Rhian Owner' },
      created_at: '2026-01-01T00:00:00.000Z',
    },
  };

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session },
  );

  await page.route(`**/${PROJECT_REF}.supabase.co/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;

    if (req.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
        },
      });
      return;
    }
    if (pathname.includes('/auth/v1/token') || pathname.includes('/auth/v1/session')) {
      return fulfillJson(route, session);
    }
    if (pathname.includes('/auth/v1/user')) return fulfillJson(route, session.user);
    if (req.method() !== 'GET' && req.method() !== 'HEAD') {
      await route.fallback();
      return;
    }
    if (pathname.includes('/rest/v1/profiles')) {
      return fulfillJson(route, [{
        id: OWNER_ID,
        role: 'owner',
        company_id: OWNER_ID,
        full_name: 'Rhian Owner',
        business_name: 'Barbearia São João',
        business_slug: 'pr3-live',
        public_booking_enabled: true,
        user_type: 'barber',
        region: 'PT',
        subscription_status: 'active',
        trial_ends_at: null,
        tutorial_completed: true,
        aios_enabled: false,
        photo_url: null,
        phone: '912345678',
      }]);
    }
    if (pathname.includes('/rest/v1/business_settings')) {
      return fulfillJson(route, [{
        user_id: OWNER_ID,
        timezone: 'Europe/Lisbon',
        cancellation_policy: 'flexible',
        enable_self_rescheduling: true,
        public_products_enabled: false,
        staff_can_block_agenda: true,
        machine_fee_enabled: false,
        debit_fee_percent: 0,
        credit_fee_percent: 0,
        business_hours: SETTINGS_PUBLIC.business_hours,
      }]);
    }
    if (pathname.includes('/rest/v1/onboarding_progress')) {
      return fulfillJson(route, [{ is_completed: true }]);
    }
    if (pathname.includes('/rest/v1/team_members')) {
      return fulfillJson(route, [{
        id: 'tm-1',
        name: 'Mário Cesar',
        photo_url: null,
        active: true,
        staff_user_id: null,
        user_id: OWNER_ID,
        is_owner: true,
      }]);
    }
    if (pathname.includes('/rest/v1/services')) {
      return fulfillJson(route, [{
        id: 'svc-1', name: 'Corte tesoura', price: 25, duration_minutes: 30, category_id: 'cat-1', active: true,
      }]);
    }
    if (pathname.includes('/rest/v1/service_categories')) {
      return fulfillJson(route, [{ id: 'cat-1', name: 'Cabelo' }]);
    }
    if (pathname.includes('/rest/v1/appointments')) return fulfillJson(route, []);
    if (pathname.includes('/rest/v1/clients')) return fulfillJson(route, []);
    if (pathname.includes('/rest/v1/agenda_blocks')) return fulfillJson(route, []);
    if (pathname.includes('/rest/v1/')) return fulfillJson(route, []);
    await route.fallback();
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
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
}

async function shot(page: Page, name: string, selector?: string) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await settle(page);
  const dest = path.join(ARTIFACTS, `${name}.png`);
  if (selector) {
    const loc = page.locator(selector).first();
    await loc.scrollIntoViewIfNeeded();
    await loc.screenshot({ path: dest });
    return;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: dest, fullPage: false });
}

async function dispatchBookingStatus(page: Page, detail: Record<string, unknown>) {
  await page.evaluate((payload) => {
    window.dispatchEvent(new CustomEvent('agendix:booking-status', { detail: payload }));
  }, detail);
}

test.describe('PR-3 status ao vivo', () => {
  test.setTimeout(90_000);

  for (const vp of VIEWPORTS) {
    test(`cliente: aceitar e recusar atualizam o card ${vp.name}`, async ({ page }) => {
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date('2026-10-03T12:00:00.000Z'));
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const bookingsRef = { rows: [{ ...BOOKING_PENDING }, { ...BOOKING_OTHER }] as unknown[] };
      stubClientRpcs(guard, bookingsRef);
      await mockPublicClient(page, bookingsRef);

      await page.goto(`${BASE}/#/minha-area/pr3-live`, { waitUntil: 'domcontentloaded' });
      const pendingCard = page.locator(`[data-booking-id="${BOOKING_PENDING.id}"]`);
      const otherCard = page.locator(`[data-booking-id="${BOOKING_OTHER.id}"]`);
      await expect(pendingCard.getByText('Aguardando')).toBeVisible({ timeout: 20_000 });
      await expect(otherCard.getByText('Aguardando')).toBeVisible();
      await shot(page, `client-before-${vp.name}`, `[data-booking-id="${BOOKING_PENDING.id}"]`);

      bookingsRef.rows = [
        { ...BOOKING_PENDING, status: 'confirmed' },
        { ...BOOKING_OTHER },
      ];
      await dispatchBookingStatus(page, {
        id: BOOKING_PENDING.id,
        status: 'confirmed',
        appointment_time: BOOKING_PENDING.appointment_time,
        op: 'UPDATE',
        at: '2026-10-03T12:00:01.000Z',
      });

      await expect(pendingCard.getByText('Confirmado')).toBeVisible({ timeout: 3_000 });
      await expect(otherCard.getByText('Aguardando')).toBeVisible();
      await shot(page, `client-after-confirm-${vp.name}`, `[data-booking-id="${BOOKING_PENDING.id}"]`);

      bookingsRef.rows = [
        { ...BOOKING_PENDING, status: 'confirmed' },
        { ...BOOKING_OTHER, status: 'cancelled' },
      ];
      await dispatchBookingStatus(page, {
        id: BOOKING_OTHER.id,
        status: 'cancelled',
        appointment_time: BOOKING_OTHER.appointment_time,
        op: 'UPDATE',
        at: '2026-10-03T12:00:02.000Z',
      });
      await expect(otherCard.getByText('Cancelado', { exact: true })).toBeVisible({ timeout: 3_000 });
      await expect(pendingCard.getByText('Confirmado')).toBeVisible();
      guard.assertNoLeak();
    });

    test(`dono: nova solicitação entra na lista ${vp.name}`, async ({ page }) => {
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date('2026-10-03T12:00:00.000Z'));
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const pending = { rows: [] as unknown[] };
      guard.stubRpc('list_company_pending_public_bookings', () => ({ body: pending.rows }));
      guard.stubRpc('list_agenda_blocks', { body: [] });
      await mockOwnerAgenda(page, pending);

      await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: /Agenda/i }).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('agenda-public-bookings')).toHaveCount(0);

      pending.rows = [OWNER_REQUEST];
      await page.evaluate((row) => {
        window.dispatchEvent(new CustomEvent('agendix:public-booking-change', {
          detail: { eventType: 'INSERT', new: row },
        }));
      }, OWNER_REQUEST);

      await expect(page.getByTestId(`agenda-public-booking-${OWNER_REQUEST.id}`)).toBeVisible({ timeout: 3_000 });
      await expect(page.getByText('Carla Online')).toBeVisible();
      await expect(page.getByText(/1 solicitação online/)).toBeVisible();
      await shot(page, `owner-request-${vp.name}`, '[data-testid="agenda-public-bookings"]');
      guard.assertNoLeak();
    });
  }
});
