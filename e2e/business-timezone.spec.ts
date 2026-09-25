/**
 * E2E — fuso horário fixo por estabelecimento no agendamento online.
 *
 * Todas as chamadas ao Supabase são mockadas (nada chega ao banco). O mock de
 * get_available_slots imita a RPC corrigida: rótulos "HH:MM" na hora local do
 * negócio. O relógio do navegador é fixado com page.clock.
 *
 * Verifica, para vários fusos de navegador (timezoneId):
 *   - calendário: domingo fechado desabilita o domingo (não a segunda);
 *   - "hoje" e horários passados seguem o fuso do negócio;
 *   - resumo mostra a hora escolhida e o instante enviado a create_public_booking
 *     tem o offset do negócio (BR -03:00, PT +01:00 no verão, Manaus -04:00).
 *
 *   E2E_BASE_URL=http://127.0.0.1:4173 \
 *     npx playwright test e2e/business-timezone.spec.ts --project=chromium-legacy
 */
import { test, expect, type Browser, type Route } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const BROWSER_ZONES = ['America/Sao_Paulo', 'Europe/Lisbon', 'Europe/London', 'America/Manaus', 'UTC'];

// Expediente seg–sex 09:00–19:00 (hora local do negócio), domingo fechado.
const DAY_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const minutes = 9 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

interface Scenario {
  region: 'BR' | 'PT';
  timezone?: string | null; // undefined = coluna ainda não existe (antes da migration)
  now: string; // instante fixo do navegador (ISO Z)
}

const ok = (route: Route, payload: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });

async function openBooking(browser: Browser, browserZone: string, sc: Scenario) {
  const context = await browser.newContext({
    timezoneId: browserZone,
    locale: 'pt-BR',
    viewport: { width: 420, height: 1000 },
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(sc.now));
  const created: string[] = [];
  const slotCalls: string[] = [];

  const settings: Record<string, unknown> = { business_hours: null, enable_self_rescheduling: true };
  if (sc.timezone !== undefined) settings.timezone = sc.timezone;

  // Nada vai para a rede real do Supabase.
  await page.route(/supabase\.co|\/rest\/v1\/|\/auth\/v1\/|\/storage\/v1\//, async (route) => {
    const url = route.request().url();
    const body = route.request().postDataJSON?.() ?? null;
    const rpc = url.match(/\/rpc\/([a-z_]+)/)?.[1];
    switch (rpc) {
      case 'get_public_profile_by_slug':
        return ok(route, { id: 'biz-tz', business_name: 'Barbearia Fuso', user_type: 'barber', region: sc.region, business_slug: 'fuso', public_booking_enabled: true });
      case 'get_public_business_settings_json':
        return ok(route, settings);
      case 'get_public_services_catalog':
        return ok(route, [{ id: 'svc-1', name: 'Corte Fuso', duration_minutes: 30, price: 50, category_id: 'cat-1', active: true }]);
      case 'get_public_categories_catalog':
        return ok(route, [{ id: 'cat-1', name: 'Cabelo' }]);
      case 'get_public_team_catalog':
        return ok(route, [{ id: 'pro-1', full_name: 'Ana', name: 'Ana', photo_url: null, specialties: [], individual_rating: 5, total_reviews: 0 }]);
      case 'get_full_dates':
        return ok(route, ['2026-09-27']); // domingo fechado
      case 'get_available_slots':
        slotCalls.push(body?.p_date);
        return ok(route, { slots: body?.p_date === '2026-09-27' ? [] : DAY_SLOTS });
      case 'get_first_available_professional':
        return ok(route, 'pro-1');
      case 'get_active_booking_by_phone':
        return ok(route, []);
      case 'create_public_booking':
        created.push(body?.p_appointment_time);
        return ok(route, [{
          id: 'bk-1', business_id: 'biz-tz', customer_name: body?.p_customer_name, customer_phone: body?.p_customer_phone,
          service_ids: ['svc-1'], professional_id: 'pro-1', appointment_time: body?.p_appointment_time,
          status: 'pending', total_price: 50, duration_minutes: 30, created_at: sc.now,
        }]);
      case 'upsert_public_client':
        return ok(route, [{ id: 'cli-1', name: 'TESTE fuso', phone: body?.p_phone ?? '', business_id: 'biz-tz' }]);
      default:
        if (route.request().method() === 'GET') return ok(route, []);
        return ok(route, null);
    }
  });

  await page.goto(`${BASE}/#/book/fuso?agendar=1`, { waitUntil: 'load' });
  await page.getByText('Corte Fuso', { exact: true }).first().click();
  await page.getByRole('button', { name: /Continuar/ }).click();
  await page.getByText('Qualquer profissional', { exact: false }).first().click();
  await page.getByRole('button', { name: /Continuar/ }).click();
  await page.locator('button[data-date]').first().waitFor();
  return { context, page, created, slotCalls };
}

async function slotTexts(page: import('@playwright/test').Page) {
  await page.locator('button', { hasText: /^\d{2}:\d{2}$/ }).first().waitFor({ timeout: 10_000 }).catch(() => undefined);
  return (await page.locator('button', { hasText: /^\d{2}:\d{2}$/ }).allInnerTexts()).map((t) => t.trim());
}

async function bookSlot(page: import('@playwright/test').Page, time: string) {
  await page.locator('button', { hasText: new RegExp(`^${time}$`) }).click();
  await page.getByRole('button', { name: /Continuar/ }).click();
  await expect(page.getByText(new RegExp(`28 de set\\. · ${time}`))).toBeVisible();
  await page.locator('input').first().fill('TESTE fuso');
  await page.locator('input[type=tel]').first().fill('11912345678');
  for (const cb of await page.locator('input[type=checkbox]').all()) {
    // inputs são sr-only (estilizados via label); clique direto no elemento
    if (!(await cb.isChecked())) await cb.evaluate((el: HTMLInputElement) => el.click());
  }
  await page.getByRole('button', { name: /Confirmar agendamento/ }).click();
}

test.describe('Agendamento online — fuso fixo do negócio', () => {
  for (const zone of BROWSER_ZONES) {
    test(`BR (São Paulo) com navegador em ${zone}: mesmos dias/slots e instante -03:00`, async ({ browser }) => {
      // 28/09/2026 16:00 em São Paulo (19:00Z) — 20:00 em Lisboa/Londres
      const { context, page, created } = await openBooking(browser, zone, { region: 'BR', now: '2026-09-28T19:00:00Z' });
      await expect(page.locator('button[data-date="2026-09-27"]')).toBeDisabled();
      await expect(page.locator('button[data-date="2026-09-26"]')).toBeDisabled(); // passado
      await expect(page.locator('button[data-date="2026-09-28"]')).toBeEnabled(); // hoje no negócio
      await page.locator('button[data-date="2026-09-28"]').click();
      // 16:00 em SP: só 16:30 em diante (independe do fuso do navegador)
      expect(await slotTexts(page)).toEqual(['16:30', '17:00', '17:30', '18:00', '18:30']);
      await bookSlot(page, '17:00');
      await expect.poll(() => created[0]).toBe('2026-09-28T17:00:00-03:00');
      await expect(page.getByText(/às 17:00/).first()).toBeVisible();
      await context.close();
    });
  }

  for (const zone of ['America/Sao_Paulo', 'Europe/London', 'UTC']) {
    test(`PT (Lisboa, verão) com navegador em ${zone}: instante +01:00`, async ({ browser }) => {
      // 28/09/2026 09:30 em Lisboa (08:30Z) — 05:30 em São Paulo
      const { context, page, created } = await openBooking(browser, zone, { region: 'PT', timezone: null, now: '2026-09-28T08:30:00Z' });
      await expect(page.locator('button[data-date="2026-09-27"]')).toBeDisabled();
      await page.locator('button[data-date="2026-09-28"]').click();
      const slots = await slotTexts(page);
      expect(slots[0]).toBe('10:00');
      expect(slots).not.toContain('09:30');
      await bookSlot(page, '10:00');
      await expect.poll(() => created[0]).toBe('2026-09-28T10:00:00+01:00');
      await context.close();
    });
  }

  test('BR configurado para America/Manaus (navegador em Lisboa): instante -04:00', async ({ browser }) => {
    const { context, page, created } = await openBooking(browser, 'Europe/Lisbon', { region: 'BR', timezone: 'America/Manaus', now: '2026-09-25T12:00:00Z' });
    await page.locator('button[data-date="2026-09-28"]').click();
    await bookSlot(page, '09:00');
    await expect.poll(() => created[0]).toBe('2026-09-28T09:00:00-04:00');
    await context.close();
  });

  test('antes da migration (sem chave timezone) PT usa Lisboa pela região', async ({ browser }) => {
    const { context, page, created } = await openBooking(browser, 'America/Sao_Paulo', { region: 'PT', now: '2026-09-25T12:00:00Z' });
    await page.locator('button[data-date="2026-09-28"]').click();
    await bookSlot(page, '09:00');
    await expect.poll(() => created[0]).toBe('2026-09-28T09:00:00+01:00');
    await context.close();
  });
});
