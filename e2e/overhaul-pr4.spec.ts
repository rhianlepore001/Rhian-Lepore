/**
 * E2E PR-4 — Finalizado / Não compareceu + Clube (Minha Área).
 * Mocks de rede; escritas no Supabase de produção são bloqueadas.
 *
 *   npx playwright test e2e/overhaul-pr4.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installProdWriteGuard, type ProdWriteGuard } from './helpers/prodWriteGuard';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = 'lcqwrngscsziysyfhpfj';
const BIZ_ID = 'biz-pr4';
const ARTIFACTS = '/opt/cursor/artifacts/screenshots/pr4';
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
] as const;

const CLUB_PLAN = {
  id: 'plan-1',
  user_id: BIZ_ID,
  name: 'Clube Corte',
  description: 'Cortes do mês',
  price_cents: 9900,
  service_ids: ['svc-1'],
  usage_limit_per_month: null,
  badge_color: 'gold',
  active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const BOOKING_DONE = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  appointment_time: '2026-10-03T14:00:00.000Z',
  status: 'completed',
  service_ids: ['svc-1'],
  service_names: ['Corte tesoura'],
  professional_id: 'pro-1',
  professional_name: 'Mário',
  total_price: 45,
  duration_minutes: 40,
  created_at: '2026-10-01T00:00:00.000Z',
};

const BOOKING_NOSHOW = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  appointment_time: '2026-10-02T15:00:00.000Z',
  status: 'no_show',
  service_ids: ['svc-1'],
  service_names: ['Barba'],
  professional_id: 'pro-1',
  professional_name: 'Mário',
  total_price: 25,
  duration_minutes: 20,
  created_at: '2026-10-01T00:00:00.000Z',
};

const BOOKING_LIVE = {
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  appointment_time: '2026-10-03T16:00:00.000Z',
  status: 'confirmed',
  service_ids: ['svc-1'],
  service_names: ['Corte tesoura'],
  professional_id: 'pro-1',
  professional_name: 'Mário',
  total_price: 45,
  duration_minutes: 40,
  created_at: '2026-10-01T00:00:00.000Z',
};

const PROFILE_PUBLIC = {
  id: BIZ_ID,
  business_name: 'Barbearia São João',
  user_type: 'barber',
  region: 'BR',
  business_slug: 'pr4-done',
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

function stubClient(
  guard: ProdWriteGuard,
  bookingsRef: { rows: unknown[] },
  clubOn: boolean,
) {
  guard.stubRpc('get_public_profile_by_slug', { body: PROFILE_PUBLIC });
  guard.stubRpc('get_public_business_settings_json', { body: SETTINGS_PUBLIC });
  guard.stubRpc('get_client_bookings_history_v2', () => ({ body: bookingsRef.rows }));
  guard.stubRpc('get_client_bookings_history', () => ({ body: bookingsRef.rows }));
  guard.stubRpc('get_client_booking_cancellations', { body: {} });
  guard.stubRpc('get_public_membership_plans', { body: clubOn ? [CLUB_PLAN] : [] });
  guard.stubRpc('get_public_client_membership', { body: null });
  guard.stubRpc('find_active_queue_entry_by_phone', { body: [] });
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

async function shot(page: Page, name: string) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await settle(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`), fullPage: false });
}

async function openHistory(page: Page, bookingsRef: { rows: unknown[] }, clubOn: boolean) {
  const guard = await installProdWriteGuard(page);
  await page.clock.setFixedTime(new Date('2026-10-03T12:00:00.000Z'));
  stubClient(guard, bookingsRef, clubOn);
  await mockPublicClient(page);
  await page.goto(`${BASE}/#/minha-area/pr4-done`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Barbearia São João').first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Histórico' }).click();
  return guard;
}

test.describe('PR-4 Finalizado / Não compareceu', () => {
  test.setTimeout(90_000);

  for (const vp of VIEWPORTS) {
    test(`card Finalizado ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const bookingsRef = { rows: [{ ...BOOKING_DONE }] as unknown[] };
      const guard = await openHistory(page, bookingsRef, false);
      const card = page.locator(`[data-booking-id="${BOOKING_DONE.id}"]`);
      await expect(card.getByText('Finalizado')).toBeVisible();
      await expect(card.getByText('Obrigado pela visita, Zé!')).toBeVisible();
      await expect(card.getByRole('button', { name: /^Agendar próximo horário$/ })).toBeVisible();
      await expect(card.getByRole('button', { name: /Editar/ })).toHaveCount(0);
      await expect(card.getByRole('button', { name: /^Cancelar$/ })).toHaveCount(0);
      await expect(page.getByTestId('client-booking-club')).toHaveCount(0);
      await shot(page, `finalizado-${vp.name}`);
      guard.assertNoLeak();
    });

    test(`card Não compareceu ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const bookingsRef = { rows: [{ ...BOOKING_NOSHOW }] as unknown[] };
      const guard = await openHistory(page, bookingsRef, false);
      const card = page.locator(`[data-booking-id="${BOOKING_NOSHOW.id}"]`);
      await expect(card.getByText('Não compareceu')).toBeVisible();
      await expect(card.getByText('Sentimos sua falta. Quer marcar outro horário?')).toBeVisible();
      await expect(card.getByRole('button', { name: /^Agendar horário$/ })).toBeVisible();
      await expect(card.getByRole('button', { name: /Editar/ })).toHaveCount(0);
      await expect(page.getByTestId('client-booking-club')).toHaveCount(0);
      await shot(page, `nao-compareceu-${vp.name}`);
      guard.assertNoLeak();
    });

    test(`Clube ligado vs desligado ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const bookingsRef = { rows: [{ ...BOOKING_DONE }, { ...BOOKING_NOSHOW }] as unknown[] };
      const guard = await openHistory(page, bookingsRef, true);
      await expect(page.getByTestId('client-booking-club').first()).toBeVisible();
      await expect(page.getByText('Esta visita entrou no seu Clube.')).toBeVisible();
      await expect(page.getByText('Seu Clube continua ativo.')).toBeVisible();
      await shot(page, `clube-on-${vp.name}`);
      guard.assertNoLeak();
    });

    test(`live confirmado → finalizado ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const bookingsRef = { rows: [{ ...BOOKING_LIVE }] as unknown[] };
      const guard = await installProdWriteGuard(page);
      await page.clock.setFixedTime(new Date('2026-10-03T12:00:00.000Z'));
      stubClient(guard, bookingsRef, false);
      await mockPublicClient(page);
      await page.goto(`${BASE}/#/minha-area/pr4-done`, { waitUntil: 'domcontentloaded' });
      const card = page.locator(`[data-booking-id="${BOOKING_LIVE.id}"]`);
      await expect(card.getByText('Confirmado')).toBeVisible({ timeout: 20_000 });

      bookingsRef.rows = [{ ...BOOKING_LIVE, status: 'completed' }];
      await page.evaluate((payload) => {
        window.dispatchEvent(new CustomEvent('agendix:booking-status', { detail: payload }));
      }, {
        id: BOOKING_LIVE.id,
        status: 'completed',
        appointment_time: BOOKING_LIVE.appointment_time,
        op: 'UPDATE',
        at: '2026-10-03T12:05:00.000Z',
      });

      await page.getByRole('button', { name: 'Histórico' }).click();
      await expect(page.locator(`[data-booking-id="${BOOKING_LIVE.id}"]`).getByText('Finalizado')).toBeVisible({ timeout: 3_000 });
      await expect(page.getByText('Obrigado pela visita, Zé!')).toBeVisible();
      guard.assertNoLeak();
    });
  }
});
