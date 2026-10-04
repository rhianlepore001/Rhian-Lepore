/**
 * E2E PR-5 — prazo para o cliente cancelar + política gerada da regra.
 * Mocks de rede; escritas no Supabase de produção são bloqueadas.
 *
 *   npx playwright test e2e/overhaul-pr5.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installProdWriteGuard, type ProdWriteGuard } from './helpers/prodWriteGuard';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = process.env.E2E_SUPABASE_REF || 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const BIZ_ID = 'biz-pr5';
const ARTIFACTS = '/opt/cursor/artifacts/screenshots/pr5';
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
] as const;
const NOW = '2026-10-04T12:00:00.000Z';
const POLICY_TEXT = 'Você pode cancelar até 2h antes pela Minha Área';

const PROFILE_PUBLIC = {
  id: BIZ_ID,
  business_name: 'Barbearia São João',
  user_type: 'barber',
  region: 'BR',
  business_slug: 'pr5-cancel',
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
    sun: { isOpen: false, blocks: [] },
  },
};

function bookingAt(id: string, iso: string, status: 'confirmed' | 'pending') {
  return {
    id,
    appointment_time: iso,
    status,
    service_ids: ['svc-1'],
    service_names: ['Corte tesoura'],
    professional_id: 'pro-1',
    professional_name: 'Mário',
    total_price: 45,
    duration_minutes: 40,
    created_at: '2026-10-01T00:00:00.000Z',
  };
}

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
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
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
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`), fullPage: false });
}

function stubPublic(guard: ProdWriteGuard, bookings: unknown[]) {
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
  guard.stubRpc('get_available_slots', { body: { slots: ['10:00', '15:00'] } });
  guard.stubRpc('get_available_slots_v2', { body: { slots: ['10:00', '15:00'], lead_time_hours: 2, empty_reason: null } });
  guard.stubRpc('get_active_booking_by_phone', { body: [] });
}

async function mockPublicClient(page: Page) {
  await page.addInitScript(
    ({ bizId, client }) => {
      localStorage.setItem(`rhian_public_client_${bizId}`, JSON.stringify(client));
    },
    {
      bizId: BIZ_ID,
      client: { id: 'cli-1', name: 'Zé Cliente', phone: '11999998888', business_id: BIZ_ID },
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

async function stubOwner(page: Page) {
  const session = fakeSession(OWNER_ID, 'owner.pr5@example.test', 'Rhian Owner');
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
    business_slug: 'pr5-cancel',
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
        enable_self_rescheduling: true,
        public_products_enabled: false,
        timezone: 'America/Sao_Paulo',
        business_hours: {},
        onboarding_completed: true,
        cancellation_policy: 'flexible',
        client_cancel_cutoff_hours: 2,
        client_cancel_note: null,
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

test.describe('PR-5 prazo de cancelamento', () => {
  test.setTimeout(90_000);

  for (const vp of VIEWPORTS) {
    test(`Ajustes cutoff ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await stubOwner(page);
      await page.goto(`${BASE}/#/configuracoes/agendamento`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Cliente pode cancelar até' })).toBeVisible({ timeout: 20_000 });
      const section = page.getByTestId('cancel-cutoff-section');
      await section.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await expect(page.getByTestId('cancel-cutoff-preset-2')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: 'Não pode cancelar online' })).toBeVisible();
      await expect(page.getByTestId('cancel-cutoff-generated')).toHaveText(POLICY_TEXT);
      await expect(page.getByText('Flexível')).toHaveCount(0);
      await shot(page, `ajustes-${vp.name}`);
      guard.assertNoLeak();
    });

    test(`card Cancelar 3h ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date(NOW));
      const row = bookingAt('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', '2026-10-04T15:00:00.000Z', 'confirmed');
      stubPublic(guard, [row]);
      await mockPublicClient(page);
      await page.goto(`${BASE}/#/minha-area/pr5-cancel`, { waitUntil: 'domcontentloaded' });
      const card = page.locator(`[data-booking-id="${row.id}"]`);
      await expect(card.getByRole('button', { name: /^Cancelar$/ })).toBeVisible({ timeout: 20_000 });
      await expect(card.getByRole('button', { name: /Falar com Barbearia São João/ })).toHaveCount(0);
      await shot(page, `card-cancelar-${vp.name}`);
      guard.assertNoLeak();
    });

    test(`card Falar com 1h ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date(NOW));
      const row = bookingAt('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02', '2026-10-04T13:00:00.000Z', 'confirmed');
      stubPublic(guard, [row]);
      await mockPublicClient(page);
      await page.goto(`${BASE}/#/minha-area/pr5-cancel`, { waitUntil: 'domcontentloaded' });
      const card = page.locator(`[data-booking-id="${row.id}"]`);
      await expect(card.getByRole('button', { name: /Falar com Barbearia São João/ })).toBeVisible({ timeout: 20_000 });
      await expect(card.getByRole('button', { name: /^Cancelar$/ })).toHaveCount(0);
      await shot(page, `card-falar-${vp.name}`);
      guard.assertNoLeak();
    });

    test(`política pública ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date(NOW));
      stubPublic(guard, []);
      await page.goto(`${BASE}/#/book/pr5-cancel?agendar=1`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Corte tesoura').first()).toBeVisible({ timeout: 20_000 });
      await page.getByText('Corte tesoura').first().click();
      await page.getByRole('button', { name: /^Continuar$/ }).click();
      await expect(page.getByText('Qualquer profissional')).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: 'Qualquer profissional' }).click();
      await expect(page.getByRole('button', { name: /^Continuar$/ })).toBeEnabled();
      await page.getByRole('button', { name: /^Continuar$/ }).click();
      const enabledDate = page.locator('button[data-date]:not([disabled])').first();
      await enabledDate.waitFor({ timeout: 15_000 });
      await enabledDate.click();
      const slot = page.locator('button', { hasText: /^\d{2}:\d{2}$/ }).first();
      await slot.waitFor({ timeout: 15_000 });
      await slot.click();
      await page.getByRole('button', { name: /^Continuar$/ }).click();
      await expect(page.getByRole('button', { name: /diretrizes de cancelamento/i })).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: /diretrizes de cancelamento/i }).click();
      await expect(page.getByTestId('public-cancellation-policy')).toHaveText(POLICY_TEXT);
      await expect(page.getByText(/cobrança de 50%/i)).toHaveCount(0);
      await shot(page, `politica-${vp.name}`);
      guard.assertNoLeak();
    });
  }
});
