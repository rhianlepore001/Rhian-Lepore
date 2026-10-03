import { expect, test, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { login } from './helpers/agendixLogin';
import { installProdWriteGuard, type ProdWriteGuard } from './helpers/prodWriteGuard';

const phase = process.env.SHOT_PHASE === 'before' ? 'before' : 'after';
const outDir = process.env.SHOT_DIR ?? `/opt/cursor/artifacts/screenshots/pr2-lead-time/${phase}`;
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const SLUG = process.env.E2E_BOOK_SLUG || process.env.DEMO_SLUG || 'corte-fino';
const PROJECT_REF = process.env.E2E_SUPABASE_REF || 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const STAFF_ID = '6fc5cf83-b7b6-4be7-9ba7-414d9d2e92f1';
const SELF_MEMBER_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const LEAD_TOAST = 'Esse horário precisa ser marcado com pelo menos 8h de antecedência';
const HAS_OWNER = Boolean(process.env.E2E_OWNER_EMAIL && process.env.E2E_OWNER_PASS);
const HAS_STAFF = Boolean(process.env.E2E_STAFF_EMAIL && process.env.E2E_STAFF_PASS);

async function reveal(page: Page, testId: string) {
  const loc = page.getByTestId(testId);
  await loc.waitFor({ timeout: 20_000 });
  await loc.evaluate((el) => {
    if (window.innerWidth >= 768) {
      const heading = el.querySelector('h3') ?? el;
      heading.scrollIntoView({ block: 'center', inline: 'nearest' });
      return;
    }
    el.scrollIntoView({ block: 'start', inline: 'nearest' });
    const sticky = 220;
    const after = el.getBoundingClientRect().top;
    window.scrollBy({ top: after - sticky, behavior: 'instant' });
  });
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(outDir, { recursive: true });
  await settle(page);
  await page.screenshot({ path: path.join(outDir, name), fullPage: false, animations: 'disabled' });
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    const animations = typeof document.getAnimations === 'function' ? document.getAnimations() : [];
    await Promise.all(animations.map((a) => a.finished.catch(() => undefined)));
  });
  await page.waitForTimeout(400);
}

function lisbonToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
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

async function injectSession(page: Page, session: ReturnType<typeof fakeSession>) {
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session },
  );
}

async function stubAuthReads(
  page: Page,
  role: 'owner' | 'staff',
  extras?: { appointments?: unknown[] },
) {
  const session = fakeSession(
    role === 'owner' ? OWNER_ID : STAFF_ID,
    role === 'owner' ? 'owner.lead@example.test' : 'staff.lead@example.test',
    role === 'owner' ? 'Rhian Owner' : 'Mário Cesar',
  );
  await injectSession(page, session);

  const ownerProfile = {
    id: OWNER_ID,
    role: 'owner',
    company_id: OWNER_ID,
    full_name: 'Rhian Owner',
    business_name: 'Barbearia Lead',
    business_slug: SLUG,
    public_booking_enabled: true,
    booking_lead_time_hours: 2,
    max_bookings_per_day: null,
    user_type: 'barber',
    region: 'PT',
    subscription_status: 'active',
    trial_ends_at: null,
    tutorial_completed: true,
    aios_enabled: false,
    photo_url: null,
  };
  const staffProfile = {
    id: STAFF_ID,
    role: 'staff',
    company_id: OWNER_ID,
    full_name: 'Mário Cesar',
    business_name: null,
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
    const search = url.search;

    if (pathname.includes('/auth/v1/user') || pathname.includes('/auth/v1/token')) {
      await fulfillJson(route, pathname.includes('/auth/v1/user') ? session.user : session);
      return;
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      await route.fallback();
      return;
    }

    if (pathname.includes('/rest/v1/profiles')) {
      if (search.includes(`id=eq.${OWNER_ID}`) || role === 'owner') {
        await fulfillJson(route, [ownerProfile]);
        return;
      }
      await fulfillJson(route, [staffProfile]);
      return;
    }
    if (pathname.includes('/rest/v1/team_members')) {
      await fulfillJson(route, [{
        id: SELF_MEMBER_ID,
        name: role === 'owner' ? 'Rhian Owner' : 'Mário Cesar',
        photo_url: null,
        active: true,
        staff_user_id: role === 'owner' ? OWNER_ID : STAFF_ID,
        user_id: OWNER_ID,
        is_owner: role === 'owner',
        display_order: 0,
      }]);
      return;
    }
    if (pathname.includes('/rest/v1/onboarding_progress')) {
      await fulfillJson(route, [{ is_completed: true }]);
      return;
    }
    if (pathname.includes('/rest/v1/appointments')) {
      await fulfillJson(route, extras?.appointments ?? []);
      return;
    }
    if (pathname.includes('/rest/v1/business_settings')) {
      await fulfillJson(route, [{
        user_id: OWNER_ID,
        enable_self_rescheduling: true,
        public_products_enabled: false,
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

function stubPublicCatalog(guard: ProdWriteGuard) {
  guard.stubRpc('get_public_profile_by_slug', {
    body: {
      id: 'biz-lead',
      business_name: 'Barbearia Lead',
      user_type: 'barber',
      region: 'PT',
      business_slug: SLUG,
      public_booking_enabled: true,
    },
  });
  guard.stubRpc('get_public_business_settings_json', {
    body: {
      timezone: 'Europe/Lisbon',
      enable_self_rescheduling: true,
      business_hours: {
        mon: { isOpen: true, blocks: [{ start: '09:00', end: '20:00' }] },
        tue: { isOpen: true, blocks: [{ start: '09:00', end: '20:00' }] },
        wed: { isOpen: true, blocks: [{ start: '09:00', end: '20:00' }] },
        thu: { isOpen: true, blocks: [{ start: '09:00', end: '20:00' }] },
        fri: { isOpen: true, blocks: [{ start: '09:00', end: '20:00' }] },
        sat: { isOpen: true, blocks: [{ start: '09:00', end: '20:00' }] },
        sun: { isOpen: true, blocks: [{ start: '09:00', end: '20:00' }] },
      },
    },
  });
  guard.stubRpc('get_public_services_catalog', {
    body: [{ id: 'svc-1', name: 'Corte Lead', duration_minutes: 30, price: 45, category_id: 'cat-1', active: true }],
  });
  guard.stubRpc('get_public_categories_catalog', { body: [{ id: 'cat-1', name: 'Cabelo' }] });
  guard.stubRpc('get_public_team_catalog', {
    body: [{ id: 'pro-1', name: 'Diego', full_name: 'Diego', photo_url: null, specialties: [], individual_rating: 5, total_reviews: 0 }],
  });
  guard.stubRpc('get_full_dates', { body: [] });
  guard.stubRpc('get_full_dates_v2', { body: [] });
  guard.stubRpc('get_first_available_professional', { body: 'pro-1' });
  guard.stubRpc('get_active_booking_by_phone', { body: [] });
  guard.stubRpc('upsert_public_client', {
    body: [{ id: 'cli-1', name: 'Ana', phone: '351912345678', business_id: 'biz-lead' }],
  });
}

async function reachDatetime(page: Page) {
  await page.goto(`${BASE}/#/book/${SLUG}?agendar=1`, { waitUntil: 'load' });
  await page.getByText('Corte Lead', { exact: true }).first().click();
  await page.getByRole('button', { name: /Continuar/ }).click();
  const anyPro = page.getByText('Qualquer profissional', { exact: false }).first();
  if (await anyPro.isVisible().catch(() => false)) {
    await anyPro.click();
    await page.getByRole('button', { name: /Continuar/ }).click();
  }
  await page.locator('button[data-date]:not([disabled])').first().waitFor({ timeout: 15_000 });
  await page.locator('button[data-date]:not([disabled])').first().click();
}

test.describe('PR-2 antecedência mínima', () => {
  test.use({ locale: 'pt-BR', timezoneId: 'Europe/Lisbon' });
  let guard: ProdWriteGuard;

  test.beforeEach(async ({ page }) => {
    guard = await installProdWriteGuard(page);
  });

  test.afterEach(() => {
    guard.assertNoLeak();
  });

  for (const width of [375, 390, 1440]) {
    test(`owner ${width} vê Antecedência mínima em Ajustes`, async ({ page }) => {
      await page.setViewportSize({ width, height: width >= 1000 ? 900 : 812 });
      if (HAS_OWNER) {
        await login(page, 'owner');
      } else {
        await stubAuthReads(page, 'owner');
      }
      await page.goto(`${BASE}/#/configuracoes/agendamento`);
      if (phase === 'after') {
        await expect(page.getByRole('heading', { name: 'Antecedência mínima' })).toBeVisible({ timeout: 20_000 });
        await reveal(page, 'lead-time-section');
        await expect(page.getByTestId('lead-time-preset-2')).toBeVisible();
        await expect(page.getByTestId('lead-time-preset-8')).toBeVisible();
        await expect(page.getByTestId('lead-time-preset-16')).toBeVisible();
        await expect(page.getByTestId('lead-time-preset-24')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sem mínimo' })).toBeVisible();
        await expect(page.getByRole('button', { name: /^Outro$/ })).toBeVisible();
        await expect(page.getByTestId('lead-time-preset-2')).toHaveAttribute('aria-pressed', 'true');
      }
      await shot(page, `owner-${width}-settings-lead-time.png`);
    });

    test(`owner ${width} Outro vazio mostra erro`, async ({ page }) => {
      await page.setViewportSize({ width, height: width >= 1000 ? 900 : 812 });
      if (HAS_OWNER) {
        await login(page, 'owner');
      } else {
        await stubAuthReads(page, 'owner');
      }
      await page.goto(`${BASE}/#/configuracoes/agendamento`);
      await expect(page.getByRole('heading', { name: 'Antecedência mínima' })).toBeVisible({ timeout: 20_000 });
      await page.getByTestId('lead-time-preset-custom').click();
      await page.getByTestId('booking-lead-time-custom').fill('');
      await page.getByRole('button', { name: /Salvar Alterações/ }).click();
      await expect(page.getByTestId('lead-time-custom-error')).toBeVisible();
      await expect(page.getByTestId('lead-time-custom-hint')).toHaveText('0 a 720');
      await reveal(page, 'lead-time-section');
      await shot(page, `owner-${width}-settings-outro-error.png`);
    });

    test(`staff ${width} Agenda não ganha antecedência`, async ({ page }) => {
      await page.setViewportSize({ width, height: width >= 1000 ? 900 : 812 });
      guard.stubRpc('list_company_pending_public_bookings', { body: [] });
      if (HAS_STAFF) {
        await login(page, 'staff');
      } else {
        await stubAuthReads(page, 'staff');
      }
      await page.goto(`${BASE}/#/agenda`);
      await expect(page.locator('#btn-new-appointment')).toBeVisible({ timeout: 20_000 });
      await shot(page, `staff-${width}-agenda.png`);
    });

    test(`cliente ${width} vê empty de antecedência`, async ({ page }) => {
      test.skip(width === 375);
      await page.setViewportSize({ width, height: width >= 1000 ? 900 : 844 });
      const today = lisbonToday();
      stubPublicCatalog(guard);
      guard.stubRpc('get_full_dates_v2', { body: [today] });
      guard.stubRpc('get_full_dates', { body: [today] });
      guard.stubRpc('get_available_slots_v2', {
        body: { slots: [], lead_time_hours: 8, empty_reason: 'lead_time' },
      });
      guard.stubRpc('get_available_slots', { body: { slots: [] } });
      await reachDatetime(page);
      if (phase === 'after') {
        await expect(page.getByTestId('time-grid-empty')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByTestId('lead-time-next-day')).toBeVisible();
        await expect(page.getByText('Veja amanhã.')).toHaveCount(0);
        await expect(page.locator(`button[data-date="${today}"]`)).toBeDisabled();
        await page.getByRole('heading', { name: 'Escolha a data e hora' }).evaluate((el) => {
          el.scrollIntoView({ block: 'start', inline: 'nearest' });
        });
      }
      await shot(page, `client-${width}-empty-lead.png`);
    });
  }

  test('cliente 390 toast lead_time_violation ao confirmar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    stubPublicCatalog(guard);
    let bookingAttempted = false;
    guard.stubRpc('get_available_slots_v2', () => (
      bookingAttempted
        ? { body: { slots: [], lead_time_hours: 8, empty_reason: 'lead_time' } }
        : { body: { slots: ['18:00'], lead_time_hours: 8, empty_reason: null } }
    ));
    guard.stubRpc('get_available_slots', () => (
      bookingAttempted
        ? { body: { slots: [] } }
        : { body: { slots: ['18:00'] } }
    ));
    guard.stubRpc('create_public_booking', () => {
      bookingAttempted = true;
      return {
        status: 400,
        body: { message: 'lead_time_violation', details: '8', hint: 'lead_time_violation', code: 'P0001' },
      };
    });
    await reachDatetime(page);
    await page.getByRole('button', { name: '18:00' }).click();
    await page.getByRole('button', { name: /Continuar/ }).click();
    await page.locator('input').first().fill('Ana Teste');
    const tel = page.locator('input[type=tel]').first();
    if (await tel.isVisible().catch(() => false)) await tel.fill('351912345678');
    for (const cb of await page.locator('input[type=checkbox]').all()) {
      if (!(await cb.isChecked())) await cb.evaluate((el: HTMLInputElement) => el.click());
    }
    await page.getByRole('button', { name: /Confirmar agendamento/ }).click();
    if (phase === 'after') {
      await expect(page.getByRole('heading', { name: 'Escolha a data e hora' })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(LEAD_TOAST)).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('[data-toast-placement="bottom"]')).toBeVisible();
      await expect(page.getByRole('button', { name: '18:00' })).toHaveCount(0);
    }
    await shot(page, 'client-390-lead-toast.png');
  });

  for (const role of ['owner', 'staff'] as const) {
    test(`${role} 390 encaixe passado e +30min sem antecedência`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const pastIso = new Date(Date.now() - 90 * 60 * 1000).toISOString();
      const soonIso = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      guard.stubRpc('list_company_pending_public_bookings', { body: [] });
      if (role === 'owner' ? HAS_OWNER : HAS_STAFF) {
        await login(page, role);
      } else {
        await stubAuthReads(page, role, {
          appointments: [
            {
              id: 'apt-past',
              user_id: OWNER_ID,
              service: 'Corte',
              appointment_time: pastIso,
              price: 45,
              status: 'Confirmed',
              professional_id: SELF_MEMBER_ID,
              duration_minutes: 30,
              notes: null,
              edited_at: null,
              origin: 'agenda',
              client_id: 'c-past',
              clients: { name: 'Encaixe passado', id: 'c-past', phone: '351600000090' },
            },
            {
              id: 'apt-soon',
              user_id: OWNER_ID,
              service: 'Corte',
              appointment_time: soonIso,
              price: 45,
              status: 'Confirmed',
              professional_id: SELF_MEMBER_ID,
              duration_minutes: 30,
              notes: null,
              edited_at: null,
              origin: 'agenda',
              client_id: 'c-soon',
              clients: { name: 'Encaixe 30min', id: 'c-soon', phone: '351600000030' },
            },
          ],
        });
      }
      await page.goto(`${BASE}/#/agenda`);
      await expect(page.locator('#btn-new-appointment')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Encaixe passado')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Encaixe 30min')).toBeVisible();
      await expect(page.getByText(/antecedência/i)).toHaveCount(0);
      await shot(page, `${role}-390-fit-in.png`);
    });
  }
});
