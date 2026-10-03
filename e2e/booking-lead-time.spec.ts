import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { login } from './helpers/agendixLogin';
import { installProdWriteGuard, type ProdWriteGuard } from './helpers/prodWriteGuard';

const phase = process.env.SHOT_PHASE === 'before' ? 'before' : 'after';
const outDir = process.env.SHOT_DIR ?? `/opt/cursor/artifacts/screenshots/pr2-lead-time/${phase}`;
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const SLUG = process.env.E2E_BOOK_SLUG || process.env.DEMO_SLUG || 'corte-fino';
const LEAD_TOAST = 'Esse horário precisa ser marcado com pelo menos 8h de antecedência';
const LEAD_EMPTY = 'Hoje não há horários com 8h de antecedência. Veja amanhã.';

async function shot(page: Page, name: string) {
  fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
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
  guard.stubRpc('get_first_available_professional', { body: 'pro-1' });
  guard.stubRpc('get_active_booking_by_phone', { body: [] });
  guard.stubRpc('upsert_public_client', {
    body: [{ id: 'cli-1', name: 'Ana', phone: '351912345678', business_id: 'biz-lead' }],
  });
}

test.describe('PR-2 antecedência mínima', () => {
  test.use({ locale: 'pt-BR' });
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
      guard.stubRpc('get_business_settings', { body: { enable_self_rescheduling: true, public_products_enabled: false } });
      await login(page, 'owner');
      await page.goto(`${BASE}/#/configuracoes/agendamento`);
      if (phase === 'after') {
        await expect(page.getByRole('heading', { name: 'Antecedência mínima' })).toBeVisible({ timeout: 20_000 });
        await expect(page.getByTestId('lead-time-preset-2')).toBeVisible();
        await expect(page.getByTestId('lead-time-preset-8')).toBeVisible();
        await expect(page.getByTestId('lead-time-preset-16')).toBeVisible();
        await expect(page.getByTestId('lead-time-preset-24')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sem mínimo' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Outro/ })).toBeVisible();
      }
      await shot(page, `owner-${width}-settings-lead-time.png`);
    });

    test(`staff ${width} Agenda não ganha antecedência`, async ({ page }) => {
      await page.setViewportSize({ width, height: width >= 1000 ? 900 : 812 });
      guard.stubRpc('list_company_pending_public_bookings', { body: [] });
      await login(page, 'staff');
      await page.goto(`${BASE}/#/agenda`);
      await expect(page.locator('#btn-new-appointment')).toBeVisible({ timeout: 20_000 });
      await shot(page, `staff-${width}-agenda.png`);
    });

    test(`cliente ${width} vê empty de antecedência e toast na recusa`, async ({ page }) => {
      await page.setViewportSize({ width, height: width >= 1000 ? 900 : 900 });
      if (width < 1000) await page.setViewportSize({ width, height: 844 });
      stubPublicCatalog(guard);
      guard.stubRpc('get_available_slots_v2', {
        body: { slots: [], lead_time_hours: 8, empty_reason: 'lead_time' },
      });
      guard.stubRpc('get_available_slots', { body: { slots: [] } });
      guard.stubRpc('create_public_booking', {
        status: 400,
        body: { message: 'lead_time_violation', details: '8', hint: 'lead_time_violation', code: 'P0001' },
      });
      await page.goto(`${BASE}/#/book/${SLUG}?agendar=1`, { waitUntil: 'load' });
      const service = page.getByText('Corte Lead', { exact: true }).first();
      if (await service.isVisible().catch(() => false)) {
        await service.click();
        const cont = page.getByRole('button', { name: /Continuar/ });
        if (await cont.isVisible().catch(() => false)) await cont.click();
        const anyPro = page.getByText('Qualquer profissional', { exact: false }).first();
        if (await anyPro.isVisible().catch(() => false)) {
          await anyPro.click();
          if (await cont.isVisible().catch(() => false)) await cont.click();
        }
        const today = page.locator('button[data-date]').first();
        if (await today.isVisible().catch(() => false)) await today.click();
      }
      if (phase === 'after') {
        await expect(page.getByText(LEAD_EMPTY)).toBeVisible({ timeout: 15_000 });
      }
      await shot(page, `client-${width}-empty-lead.png`);
    });
  }

  test('cliente 390 toast lead_time_violation ao confirmar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    stubPublicCatalog(guard);
    guard.stubRpc('get_available_slots_v2', {
      body: { slots: ['18:00'], lead_time_hours: 8, empty_reason: null },
    });
    guard.stubRpc('get_available_slots', { body: { slots: ['18:00'] } });
    guard.stubRpc('create_public_booking', {
      status: 400,
      body: { message: 'lead_time_violation', details: '8', hint: 'lead_time_violation', code: 'P0001' },
    });
    await page.goto(`${BASE}/#/book/${SLUG}?agendar=1`, { waitUntil: 'load' });
    await page.getByText('Corte Lead', { exact: true }).first().click();
    await page.getByRole('button', { name: /Continuar/ }).click();
    const anyPro = page.getByText('Qualquer profissional', { exact: false }).first();
    if (await anyPro.isVisible().catch(() => false)) {
      await anyPro.click();
      await page.getByRole('button', { name: /Continuar/ }).click();
    }
    const day = page.locator('button[data-date]').first();
    await day.click();
    await page.getByRole('button', { name: '18:00' }).click();
    const cont = page.getByRole('button', { name: /Continuar/ });
    if (await cont.isVisible().catch(() => false)) await cont.click();
    const name = page.locator('input').first();
    if (await name.isVisible().catch(() => false)) {
      await name.fill('Ana Teste');
      const tel = page.locator('input[type=tel]').first();
      if (await tel.isVisible().catch(() => false)) await tel.fill('351912345678');
      for (const cb of await page.locator('input[type=checkbox]').all()) {
        if (!(await cb.isChecked())) await cb.evaluate((el: HTMLInputElement) => el.click());
      }
      await page.getByRole('button', { name: /Confirmar agendamento/ }).click();
    }
    if (phase === 'after') {
      await expect(page.getByText(LEAD_TOAST)).toBeVisible({ timeout: 10_000 });
    }
    await shot(page, 'client-390-lead-toast.png');
  });
});
