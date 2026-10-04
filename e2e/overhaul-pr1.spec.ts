/**
 * E2E PR-1 — copy, WhatsApp dinâmico e cards honestos (só tela).
 * Mocks de auth/API; escritas no Supabase de produção são bloqueadas
 * (exceto POST /auth/v1/token, que também é stubado).
 *
 *   npx playwright test e2e/overhaul-pr1.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installProdWriteGuard } from './helpers/prodWriteGuard';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const STAFF_ID = '6fc5cf83-b7b6-4be7-9ba7-414d9d2e92f1';
const BIZ_ID = 'biz-pr1';
const ARTIFACTS = '/opt/cursor/artifacts/pr1';
const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
] as const;

const GENERATED_POLICY =
  'Você pode cancelar até 2h antes pela Minha Área';

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
  business_name: 'Barbearia São João ✂️',
  user_type: 'barber',
  region: 'PT',
  business_slug: 'pr1-copy',
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

const BOOKINGS = [
  {
    id: 'bk-past-confirmed',
    appointment_time: '2026-10-02T14:00:00.000Z',
    status: 'confirmed',
    service_ids: ['svc-1'],
    service_names: ['Corte tesoura'],
    professional_id: 'pro-1',
    professional_name: 'Mário',
    total_price: 25,
    duration_minutes: 30,
    created_at: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'bk-past-cancelled',
    appointment_time: '2026-09-20T10:00:00.000Z',
    status: 'cancelled',
    service_ids: ['svc-1'],
    service_names: ['Barba'],
    professional_id: null,
    professional_name: null,
    total_price: 15,
    duration_minutes: 20,
    created_at: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'bk-past-noshow',
    appointment_time: '2026-09-15T10:00:00.000Z',
    status: 'no_show',
    service_ids: ['svc-1'],
    service_names: ['Corte tesoura'],
    professional_id: 'pro-1',
    professional_name: 'Mário',
    total_price: 25,
    duration_minutes: 30,
    created_at: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'bk-future-pending',
    appointment_time: '2026-10-10T14:00:00.000Z',
    status: 'pending',
    service_ids: ['svc-1'],
    service_names: ['Corte tesoura'],
    professional_id: 'pro-1',
    professional_name: 'Mário',
    total_price: 25,
    duration_minutes: 30,
    created_at: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'bk-future-confirmed',
    appointment_time: '2026-10-11T14:00:00.000Z',
    status: 'confirmed',
    service_ids: ['svc-1'],
    service_names: ['Barba'],
    professional_id: 'pro-1',
    professional_name: 'Mário',
    total_price: 15,
    duration_minutes: 20,
    created_at: '2026-10-01T00:00:00.000Z',
  },
];

async function mockSupabase(page: Page, role: 'anon' | 'owner' | 'staff', opts: { seedPublicClient?: boolean } = {}) {
  const userId = role === 'staff' ? STAFF_ID : OWNER_ID;
  const email = role === 'staff' ? 'staff.pr1@example.test' : 'owner.pr1@example.test';
  const accessToken = fakeJwt(userId, email);
  const session = {
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
      user_metadata: { full_name: role === 'staff' ? 'Mário Cesar' : 'Rhian Owner' },
      created_at: '2026-01-01T00:00:00.000Z',
    },
  };

  if (role !== 'anon') {
    await page.addInitScript(
      ({ key, value }) => {
        localStorage.setItem(key, JSON.stringify(value));
      },
      { key: `sb-${PROJECT_REF}-auth-token`, value: session },
    );
  } else if (opts.seedPublicClient !== false) {
    await page.addInitScript(
      ({ bizId, client }) => {
        localStorage.setItem(`rhian_public_client_${bizId}`, JSON.stringify(client));
      },
      {
        bizId: BIZ_ID,
        client: { id: 'cli-1', name: 'Zé Cliente', phone: '11999998888', business_id: BIZ_ID },
      },
    );
  }

  await page.addInitScript(() => {
    (window as Window & { __openedUrls?: string[] }).__openedUrls = [];
    window.open = (url?: string | URL, _target?: string, _features?: string) => {
      (window as Window & { __openedUrls?: string[] }).__openedUrls?.push(String(url ?? ''));
      return null;
    };
  });

  await page.route(`**/${PROJECT_REF}.supabase.co/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;
    const rpc = pathname.match(/\/rpc\/([^/?]+)/)?.[1];

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
      await fulfillJson(route, session);
      return;
    }
    if (pathname.includes('/auth/v1/user')) {
      await fulfillJson(route, session.user);
      return;
    }

    if (rpc === 'get_public_profile_by_slug') return fulfillJson(route, PROFILE_PUBLIC);
    if (rpc === 'get_public_business_settings_json') return fulfillJson(route, SETTINGS_PUBLIC);
    if (rpc === 'get_public_services_catalog') {
      return fulfillJson(route, [{ id: 'svc-1', name: 'Corte tesoura', duration_minutes: 30, price: 25, category_id: 'cat-1', active: true }]);
    }
    if (rpc === 'get_public_categories_catalog') return fulfillJson(route, [{ id: 'cat-1', name: 'Cabelo' }]);
    if (rpc === 'get_public_team_catalog') {
      return fulfillJson(route, [{ id: 'pro-1', full_name: 'Mário', name: 'Mário', photo_url: null, specialties: [], individual_rating: 5, total_reviews: 0 }]);
    }
    if (rpc === 'get_public_gallery_catalog') return fulfillJson(route, []);
    if (rpc === 'get_first_available_professional') return fulfillJson(route, 'pro-1');
    if (rpc === 'get_full_dates') return fulfillJson(route, []);
    if (rpc === 'get_available_slots') {
      return fulfillJson(route, { slots: ['10:00', '10:30', '15:00'] });
    }
    if (rpc === 'get_client_bookings_history') return fulfillJson(route, BOOKINGS);
    if (rpc === 'get_client_bookings_history_v2') return fulfillJson(route, BOOKINGS);
    if (rpc === 'get_client_booking_cancellations') return fulfillJson(route, {});
    if (rpc === 'get_public_membership_plans') return fulfillJson(route, []);
    if (rpc === 'get_public_client_membership') return fulfillJson(route, null);
    if (rpc === 'get_public_products_catalog') return fulfillJson(route, []);
    if (rpc === 'get_active_booking_by_phone') return fulfillJson(route, []);
    if (rpc === 'find_active_queue_entry_by_phone') return fulfillJson(route, []);
    if (rpc === 'list_company_pending_public_bookings') return fulfillJson(route, []);

    if (pathname.includes('/rest/v1/profiles')) {
      const profile = role === 'staff'
        ? {
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
          }
        : {
            id: OWNER_ID,
            role: 'owner',
            company_id: OWNER_ID,
            full_name: 'Rhian Owner',
            business_name: 'Barbearia São João ✂️',
            business_slug: 'pr1-copy',
            public_booking_enabled: true,
            user_type: 'barber',
            region: 'PT',
            subscription_status: 'active',
            trial_ends_at: null,
            tutorial_completed: true,
            aios_enabled: false,
            photo_url: null,
            phone: '912345678',
          };
      return fulfillJson(route, [profile]);
    }

    if (pathname.includes('/rest/v1/business_settings')) {
      return fulfillJson(route, [{
        user_id: OWNER_ID,
        timezone: 'Europe/Lisbon',
        cancellation_policy: 'flexible',
        enable_self_rescheduling: true,
        public_products_enabled: false,
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
        staff_user_id: STAFF_ID,
        user_id: OWNER_ID,
        is_owner: false,
      }]);
    }

    if (pathname.includes('/rest/v1/')) return fulfillJson(route, []);
    await fulfillJson(route, {});
  });
}

async function settleAnimations(page: Page) {
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
  await settleAnimations(page);
  if (selector === '[data-testid="client-history-list"]' || selector === '[data-testid="client-upcoming-list"]') {
    const sticky = page.locator('header.sticky');
    if (await sticky.count()) {
      await sticky.evaluate((el) => {
        (el as HTMLElement).style.position = 'static';
      });
    }
  }
  const dest = path.join(ARTIFACTS, `${name}.png`);
  if (selector) {
    const loc = page.locator(selector).first();
    await loc.scrollIntoViewIfNeeded();
    await loc.screenshot({ path: dest });
    return;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: dest, fullPage: true });
}

async function walkPublicQuickToPolicy(page: Page) {
  await page.goto(`${BASE}/#/book/pr1-copy?agendar=1`, { waitUntil: 'domcontentloaded' });
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
}

test.describe('PR-1 overhaul copy/cards', () => {
  test.setTimeout(180_000);

  for (const vp of VIEWPORTS) {
    test(`cliente Minha Área ${vp.name}`, async ({ page }) => {
      await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date('2026-10-03T12:00:00.000Z'));
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await mockSupabase(page, 'anon');

      await page.goto(`${BASE}/#/minha-area/pr1-copy`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Barbearia São João ✂️').first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Aguardando').first()).toBeVisible();
      await expect(page.getByText('Confirmado').first()).toBeVisible();
      await expect(page.getByText(/de out\./).first()).toBeVisible();
      await expect(page.getByText(/De Out/)).toHaveCount(0);

      const pedir = page.getByRole('button', { name: /Pedir confirmação/ });
      await expect(pedir).toBeVisible();
      await expect(pedir).toHaveClass(/col-span-2/);
      await expect(page.getByTestId('client-upcoming-list').getByRole('button', { name: /^Editar$/ })).toHaveCount(2);
      await expect(page.getByTestId('client-upcoming-list').getByRole('button', { name: /^WhatsApp$/ })).toHaveCount(1);

      await pedir.click();
      const openedPending = await page.evaluate(() => (window as Window & { __openedUrls?: string[] }).__openedUrls ?? []);
      const waPending = decodeURIComponent(openedPending.join(' '));
      expect(openedPending.join(' ')).toContain('https://wa.me/351912345678');
      expect(waPending).toContain('Olá, Barbearia São João ✂️!');
      expect(waPending).toContain('Corte tesoura');
      expect(waPending).toContain('Mário');
      expect(waPending).toMatch(/em sáb\., 10 de out\./);
      expect(waPending).not.toMatch(/em Sáb/);
      expect(page.getByText(/Sáb\., 10 de out\./).first()).toBeVisible();
      expect(waPending.toLowerCase()).not.toContain('o salão');
      expect(waPending.toLowerCase()).not.toContain('barbearia silva');
      await expect(page.getByTestId('client-pending-banner')).toHaveText(
        'A barbearia ainda não confirmou este horário.',
      );
      await shot(page, `after-proximos-pending-${vp.name}`, '[data-booking-id="bk-future-pending"]');
      await shot(page, `after-pending-banner-${vp.name}`, '[data-testid="client-pending-banner"]');

      await page.getByRole('button', { name: /^WhatsApp$/ }).click();
      const openedConfirmed = await page.evaluate(() => (window as Window & { __openedUrls?: string[] }).__openedUrls ?? []);
      expect(openedConfirmed.join(' ')).toContain('https://wa.me/351912345678');
      await expect(page.getByRole('button', { name: /^WhatsApp$/ })).toHaveClass(/col-span-2/);
      await shot(page, `after-proximos-confirmed-${vp.name}`, '[data-booking-id="bk-future-confirmed"]');
      await shot(page, `after-client-proximos-${vp.name}`, '[data-testid="client-upcoming-list"]');

      await page.getByRole('button', { name: 'Histórico' }).click();
      await expect(page.getByText('Horário passou')).toBeVisible();
      await expect(page.getByText('Cancelado', { exact: true })).toBeVisible();
      await expect(page.getByText('Não compareceu')).toBeVisible();
      await expect(page.getByText('Sentimos sua falta. Quer marcar outro horário?')).toBeVisible();
      await expect(page.getByText('Cancelado.')).toHaveCount(0);
      await expect(page.getByTestId('client-history-list').getByRole('button', { name: /Editar/ })).toHaveCount(0);
      await expect(page.getByTestId('client-history-list').getByRole('button', { name: /^Cancelar$/ })).toHaveCount(0);
      await expect(page.getByTestId('client-history-list').getByRole('button', { name: /^Agendar de novo$/ })).toHaveCount(2);
      await expect(page.getByTestId('client-history-list').getByRole('button', { name: /^Agendar horário$/ })).toHaveCount(1);
      await expect(page.getByTestId('client-history-list').getByRole('button', { name: /Reagendar horário/ })).toHaveCount(0);
      await shot(page, `after-historico-past-${vp.name}`, '[data-booking-id="bk-past-confirmed"]');
      await shot(page, `after-historico-cancelled-${vp.name}`, '[data-booking-id="bk-past-cancelled"]');
      await shot(page, `after-historico-noshow-${vp.name}`, '[data-booking-id="bk-past-noshow"]');
      await shot(page, `after-client-historico-${vp.name}`, '[data-testid="client-history-list"]');
    });

    test(`público diretrizes ${vp.name}`, async ({ page }) => {
      await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date('2026-10-05T08:00:00.000Z'));
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await mockSupabase(page, 'anon', { seedPublicClient: false });
      await walkPublicQuickToPolicy(page);
      await page.getByRole('button', { name: /diretrizes de cancelamento/i }).click();
      await expect(page.getByTestId('public-cancellation-policy')).toHaveText(GENERATED_POLICY);
      await expect(page.getByText('flexible', { exact: true })).toHaveCount(0);
      await expect(page.getByText(/cobrança de 50%/i)).toHaveCount(0);
      await shot(page, `after-public-policy-${vp.name}`, '[data-policy-dialog]');
    });

    test(`dono Ajustes ${vp.name}`, async ({ page }) => {
      await installProdWriteGuard(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await mockSupabase(page, 'owner');
      await page.goto(`${BASE}/#/configuracoes/geral`, { waitUntil: 'domcontentloaded' });
      const policyBox = page.getByTestId('cancellation-policy-generated');
      await expect(policyBox).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(GENERATED_POLICY)).toBeVisible();
      await expect(page.getByText('Flexível')).toHaveCount(0);
      await expect(page.getByText('24h')).toHaveCount(0);
      await expect(page.getByTestId('cancellation-policy-notes-hint')).toHaveText(
        'Aparece abaixo da regra. Não prometa multa: o sistema não cobra.',
      );
      await shot(page, `after-owner-geral-${vp.name}`, '[data-testid="cancellation-policy-section"]');

      await page.goto(`${BASE}/#/configuracoes/agendamento`, { waitUntil: 'domcontentloaded' });
      const toggle = page.getByText('Cliente pode editar na Minha Área', { exact: true });
      await expect(toggle).toBeVisible({ timeout: 20_000 });
      await expect(page.getByLabel('Cliente pode editar na Minha Área')).toBeVisible();
      await expect(page.getByText('Mostra o botão Editar nos agendamentos futuros da Minha Área.')).toBeVisible();
      await expect(page.getByText('Reagendamento Autônomo')).toHaveCount(0);
      await expect(page.getByText(/Não envia e-mail/)).toHaveCount(0);
      await shot(page, `after-owner-agendamento-${vp.name}`, '[data-testid="self-reschedule-section"]');
    });

    test(`dono Agenda ${vp.name}`, async ({ page }) => {
      await installProdWriteGuard(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await mockSupabase(page, 'owner');
      await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: /Agenda/i }).first()).toBeVisible({ timeout: 30_000 });
      await shot(page, `after-owner-agenda-${vp.name}`);
    });

    test(`staff Agenda ${vp.name}`, async ({ page }) => {
      await installProdWriteGuard(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await mockSupabase(page, 'staff');
      await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: /Agenda/i }).first()).toBeVisible({ timeout: 30_000 });
      await shot(page, `after-staff-agenda-${vp.name}`);
    });
  }
});
