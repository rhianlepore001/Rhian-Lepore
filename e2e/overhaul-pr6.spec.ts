/**
 * E2E PR-6 — pedido de alteração do cliente (sem duplicar agendamento).
 * Mocks de rede; escritas no Supabase de produção são bloqueadas.
 *
 *   npx playwright test e2e/overhaul-pr6.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installProdWriteGuard, type ProdWriteGuard } from './helpers/prodWriteGuard';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = process.env.E2E_SUPABASE_REF || 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const BIZ_ID = 'biz-pr6';
const ARTIFACTS = '/opt/cursor/artifacts/screenshots/pr6';
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
] as const;
const NOW = '2026-10-04T12:00:00.000Z';
const EDIT_SENT =
  'Pedido de alteração enviado. Seu horário original (dom., 04 de out. às 12:00) continua reservado até a resposta.';
const ALTERACAO = 'Alteração: de 04/10 · 12:00 para 04/10 · 14:00';

const PROFILE_PUBLIC = {
  id: BIZ_ID,
  business_name: 'Barbearia São João',
  user_type: 'barber',
  region: 'BR',
  business_slug: 'pr6-edit',
  public_booking_enabled: true,
  phone: '11999998888',
  logo_url: null,
  cover_photo_url: null,
  allow_client_rescheduling: true,
};

const SETTINGS_PUBLIC = {
  timezone: 'America/Sao_Paulo',
  enable_self_rescheduling: true,
  cancellation_policy: 'flexible',
  client_cancel_cutoff_hours: 2,
  client_cancel_note: null,
  business_hours: {
    mon: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    tue: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    wed: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    thu: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    fri: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
    sat: { isOpen: true, blocks: [{ start: '09:00', end: '14:00' }] },
    sun: { isOpen: true, blocks: [{ start: '09:00', end: '14:00' }] },
  },
};

const ORIGINAL_ISO = '2026-10-04T15:00:00.000Z';
const REQUESTED_ISO = '2026-10-04T17:00:00.000Z';

function bookingBase(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    appointment_time: ORIGINAL_ISO,
    status: 'confirmed',
    service_ids: ['svc-1'],
    service_names: ['Corte tesoura'],
    professional_id: 'pro-1',
    professional_name: 'Mário',
    total_price: 45,
    duration_minutes: 40,
    created_at: '2026-10-01T00:00:00.000Z',
    is_edit: false,
    original_appointment_time: null,
    ...extra,
  };
}

const PENDING_EDIT = bookingBase('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa06', {
  status: 'pending',
  is_edit: true,
  appointment_time: REQUESTED_ISO,
  original_appointment_time: ORIGINAL_ISO,
  customer_name: 'Zé Cliente',
  customer_phone: '5511999998888',
  business_id: BIZ_ID,
});

const CONFIRMED_AFTER_ACCEPT = bookingBase('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa07', {
  status: 'confirmed',
  is_edit: false,
  appointment_time: REQUESTED_ISO,
  original_appointment_time: null,
});

const CONFIRMED_AFTER_REJECT = bookingBase('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa08', {
  status: 'confirmed',
  is_edit: false,
  appointment_time: ORIGINAL_ISO,
  original_appointment_time: null,
});

const OWNER_EDIT_REQUEST = {
  id: PENDING_EDIT.id,
  business_id: OWNER_ID,
  customer_name: 'Zé Cliente',
  customer_phone: '5511999998888',
  appointment_time: REQUESTED_ISO,
  original_appointment_time: ORIGINAL_ISO,
  total_price: 45,
  professional_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  service_ids: ['svc-1'],
  status: 'pending',
  is_edit: true,
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

async function shot(page: Page, name: string, selector?: string) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await settle(page);
  const dest = path.join(ARTIFACTS, `${name}.png`);
  const mobile = name.endsWith('-390');
  if (selector && mobile) {
    await page.locator(selector).first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: dest, fullPage: false });
    return;
  }
  if (selector) {
    const loc = page.locator(selector).first();
    await loc.scrollIntoViewIfNeeded();
    await loc.screenshot({ path: dest });
    return;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: dest, fullPage: false });
}

function stubPublic(guard: ProdWriteGuard, bookings: unknown[], active: unknown[] = []) {
  guard.stubRpc('get_public_profile_by_slug', { body: PROFILE_PUBLIC });
  guard.stubRpc('get_public_business_settings_json', { body: SETTINGS_PUBLIC });
  guard.stubRpc('get_client_bookings_history_v2', { body: bookings });
  guard.stubRpc('get_client_bookings_history', { body: bookings });
  guard.stubRpc('get_client_booking_cancellations', { body: {} });
  guard.stubRpc('get_public_membership_plans', { body: [] });
  guard.stubRpc('get_public_client_membership', { body: null });
  guard.stubRpc('get_public_pix_config', { body: null });
  guard.stubRpc('find_active_queue_entry_by_phone', { body: [] });
  guard.stubRpc('get_public_services_catalog', {
    body: [{ id: 'svc-1', name: 'Corte tesoura', duration_minutes: 40, price: 45, category_id: 'cat-1', active: true }],
  });
  guard.stubRpc('get_public_categories_catalog', { body: [{ id: 'cat-1', name: 'Cabelo' }] });
  guard.stubRpc('get_public_team_catalog', {
    body: [{ id: 'pro-1', full_name: 'Mário', name: 'Mário', photo_url: null, specialties: [], individual_rating: 5, total_reviews: 0 }],
  });
  guard.stubRpc('get_public_gallery_catalog', { body: [] });
  guard.stubRpc('get_public_products_catalog', { body: [] });
  guard.stubRpc('get_first_available_professional', { body: 'pro-1' });
  guard.stubRpc('get_full_dates', { body: [] });
  guard.stubRpc('get_full_dates_v2', { body: [] });
  guard.stubRpc('get_available_slots', { body: { slots: ['10:00', '12:00', '14:00'] } });
  guard.stubRpc('get_available_slots_v2', { body: { slots: ['10:00', '12:00', '14:00'], lead_time_hours: 2, empty_reason: null } });
  guard.stubRpc('get_active_booking_by_phone', { body: active });
  guard.stubRpc('get_public_booking_by_id', { body: active });
  guard.stubRpc('get_booking_by_id_v2', { body: active });
  guard.stubRpc('get_booking_by_id', { body: active });
  guard.stubRpc('get_public_client_by_phone', { body: [{ name: 'Zé Cliente', photo_url: null }] });
}

async function mockPublicClient(page: Page) {
  await page.addInitScript(
    ({ bizId, client }) => {
      localStorage.setItem(`rhian_public_client_${bizId}`, JSON.stringify(client));
    },
    {
      bizId: BIZ_ID,
      client: { id: 'cli-1', name: 'Zé Cliente', phone: '5511999998888', business_id: BIZ_ID },
    },
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: '[]',
      });
      return;
    }
    if (pathname.includes('/auth/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: '{}',
      });
      return;
    }
    await route.fallback();
  });
}

async function stubOwner(page: Page, extras?: { pending?: unknown[] }) {
  const session = fakeSession(OWNER_ID, 'owner.pr6@example.test', 'Rhian Owner');
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
    business_slug: 'pr6-edit',
    public_booking_enabled: true,
    booking_lead_time_hours: 2,
    max_bookings_per_day: null,
    user_type: 'barber',
    region: 'BR',
    subscription_status: 'active',
    trial_ends_at: null,
    tutorial_completed: true,
    aios_enabled: false,
    photo_url: null,
    phone: '11999998888',
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
      await fulfillJson(route, [ownerProfile]);
      return;
    }
    if (pathname.includes('/rest/v1/team_members')) {
      await fulfillJson(route, [{
        id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        name: 'Mário',
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
        enable_self_rescheduling: true,
        public_products_enabled: false,
        timezone: 'America/Sao_Paulo',
        business_hours: SETTINGS_PUBLIC.business_hours,
        onboarding_completed: true,
        cancellation_policy: 'flexible',
        client_cancel_cutoff_hours: 2,
        client_cancel_note: null,
        service_only_edit_skip_acceptance: false,
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
      await fulfillJson(route, extras?.pending ?? []);
      return;
    }
    await route.fallback();
  });
}

test.describe('PR-6 pedido de alteração', () => {
  test.setTimeout(90_000);

  for (const vp of VIEWPORTS) {
    test(`client-edit-sent ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date(NOW));
      stubPublic(guard, [PENDING_EDIT], [PENDING_EDIT]);
      // Sem este stub vazio o fetch de cliente público retorna cedo e não abre a tela de sucesso.
      guard.stubRpc('get_public_client_by_phone', { body: [] });
      await mockPublicClient(page);
      await page.goto(`${BASE}/#/book/pr6-edit?agendar=1`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('client-edit-sent-message')).toHaveText(EDIT_SENT, { timeout: 20_000 });
      await expect(page.getByText('ALTERAÇÃO ENVIADA')).toBeVisible();
      await shot(page, `client-edit-sent-${vp.name}`, '[data-testid="booking-success"]');
      guard.assertNoLeak();
    });

    test(`client-card-pending-change ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date(NOW));
      stubPublic(guard, [PENDING_EDIT]);
      await mockPublicClient(page);
      await page.goto(`${BASE}/#/minha-area/pr6-edit`, { waitUntil: 'domcontentloaded' });
      const card = page.locator(`[data-booking-id="${PENDING_EDIT.id}"]`);
      await expect(card.getByText('Alteração pendente')).toBeVisible({ timeout: 20_000 });
      await expect(card.getByText('14:00')).toBeVisible();
      await expect(card.getByTestId('client-edit-sent-message')).toHaveText(EDIT_SENT);
      await expect(card.getByTestId('client-edit-reserved-line')).toHaveText(
        'Horário original reservado: dom., 04 de out. às 12:00',
      );
      await shot(page, `client-card-pending-change-${vp.name}`, `[data-booking-id="${PENDING_EDIT.id}"]`);
      guard.assertNoLeak();
    });

    test(`agenda-request-alteracao ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date(NOW));
      guard.stubRpc('list_company_pending_public_bookings', { body: [OWNER_EDIT_REQUEST] });
      guard.stubRpc('list_agenda_blocks', { body: [] });
      await stubOwner(page);
      await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('agenda-public-bookings')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('agenda-booking-alteracao')).toHaveText(ALTERACAO);
      await expect(page.getByText('1 alteração aguardando aprovação')).toBeVisible();
      await shot(page, `agenda-request-alteracao-${vp.name}`, '[data-testid="agenda-public-bookings"]');
      guard.assertNoLeak();
    });

    test(`ajustes-service-only ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await stubOwner(page);
      await page.goto(`${BASE}/#/configuracoes/agendamento`, { waitUntil: 'domcontentloaded' });
      const row = page.getByTestId('service-only-edit-skip-row');
      await expect(row).toBeVisible({ timeout: 20_000 });
      await expect(page.getByLabel('Trocar só o serviço sem aprovação')).not.toBeChecked();
      await row.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await shot(page, `ajustes-service-only-${vp.name}`, '[data-testid="service-only-edit-skip-row"]');
      guard.assertNoLeak();
    });

    test(`client-confirmed-after-accept ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date(NOW));
      stubPublic(guard, [CONFIRMED_AFTER_ACCEPT]);
      await mockPublicClient(page);
      await page.goto(`${BASE}/#/minha-area/pr6-edit`, { waitUntil: 'domcontentloaded' });
      const card = page.locator(`[data-booking-id="${CONFIRMED_AFTER_ACCEPT.id}"]`);
      await expect(card.getByText('Confirmado')).toBeVisible({ timeout: 20_000 });
      await expect(card.getByText('14:00')).toBeVisible();
      await expect(card.getByTestId('client-edit-sent-message')).toHaveCount(0);
      await shot(page, `client-confirmed-after-accept-${vp.name}`, `[data-booking-id="${CONFIRMED_AFTER_ACCEPT.id}"]`);
      guard.assertNoLeak();
    });

    test(`client-after-reject ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date(NOW));
      stubPublic(guard, [CONFIRMED_AFTER_REJECT]);
      await mockPublicClient(page);
      await page.goto(`${BASE}/#/minha-area/pr6-edit`, { waitUntil: 'domcontentloaded' });
      const card = page.locator(`[data-booking-id="${CONFIRMED_AFTER_REJECT.id}"]`);
      await expect(card.getByText('Confirmado')).toBeVisible({ timeout: 20_000 });
      await expect(card.getByText('12:00')).toBeVisible();
      await expect(card.getByText('Cancelado')).toHaveCount(0);
      await shot(page, `client-after-reject-${vp.name}`, `[data-booking-id="${CONFIRMED_AFTER_REJECT.id}"]`);
      guard.assertNoLeak();
    });
  }
});
