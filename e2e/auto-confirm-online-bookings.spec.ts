/**
 * Confirmação automática de agendamentos online (toggle "Aprovar agendamentos online").
 *   npx playwright test e2e/auto-confirm-online-bookings.spec.ts --project=chromium-legacy
 *   (testes do dono: E2E_OWNER_EMAIL / E2E_OWNER_PASS; sem eles são pulados)
 * Prod SÓ LEITURA: GET e RPCs de leitura passam; create_public_booking e qualquer outra
 * escrita são STUBADOS ou abortados — nenhum pedido/agendamento real é criado.
 * O modo (manual x automático) e o tema (barbearia x salão) vêm de respostas mockadas.
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import { BASE, login } from './helpers/agendixLogin';

const SHOTS = process.env.SHOTS_DIR || '/workspace/screens/auto-confirm/after';
const SLUG = process.env.E2E_BOOK_SLUG || 'barbeariasilva';
const BIZ = process.env.E2E_BOOK_BIZ || '03254cc1-3f37-44f8-a31c-e4fdffd1304b';
const STAFF_PRO = process.env.E2E_BOOK_STAFF_PRO || '0c9fd56b-1aac-422e-9057-3f8554da6076';
const HAS_OWNER = Boolean(process.env.E2E_OWNER_EMAIL && process.env.E2E_OWNER_PASS);

const READ_RPCS = new Set([
  'get_public_profile_by_slug', 'get_public_business_settings_json', 'get_public_products_catalog',
  'get_public_services_catalog', 'get_public_categories_catalog', 'get_public_team_catalog',
  'get_public_gallery_catalog', 'get_available_slots_v2', 'get_available_slots', 'get_full_dates_v2',
  'get_full_dates', 'get_first_available_professional', 'get_public_client_by_phone',
  'get_client_booking_cancellations', 'get_public_membership_plans', 'get_public_client_membership',
  'get_auth_company_id', 'get_auth_role', 'list_agenda_blocks',
]);

type Stub = (payload: unknown) => { status?: number; body: unknown };
type Patch = (body: unknown, url: URL) => unknown;

/** Bloqueia toda escrita em prod; RPCs de leitura passam (opcionalmente com a resposta alterada). */
async function guard(page: Page, stubs: Record<string, Stub>, patches: Record<string, Patch> = {}, getPatches: Array<[RegExp, Patch]> = []) {
  const leaked: string[] = [];
  const handled = new Set<string>();
  await page.route(/\.supabase\.co\//, async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const m = req.method();
    if (m === 'GET') {
      const gp = getPatches.find(([re]) => re.test(url.pathname + url.search));
      if (gp) {
        const res = await route.fetch();
        const body = await res.json().catch(() => null);
        return route.fulfill({ response: res, body: JSON.stringify(gp[1](body, url)) });
      }
    }
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS' || url.pathname === '/auth/v1/token') return route.continue();
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([^/?]+)/)?.[1];
    let payload: unknown = null;
    try { payload = req.postDataJSON(); } catch { payload = req.postData(); }
    handled.add(req.url() + m);
    if (rpc && stubs[rpc]) {
      const r = stubs[rpc](payload);
      return route.fulfill({ status: r.status ?? 200, contentType: 'application/json', body: JSON.stringify(r.body) });
    }
    if (rpc && READ_RPCS.has(rpc)) {
      if (patches[rpc]) {
        const res = await route.fetch();
        const body = await res.json().catch(() => null);
        return route.fulfill({ response: res, body: JSON.stringify(patches[rpc](body, url)) });
      }
      return route.continue();
    }
    return route.abort('blockedbyclient');
  });
  page.on('requestfinished', (req) => {
    const url = new URL(req.url());
    if (!/\.supabase\.co$/.test(url.hostname)) return;
    const m = req.method();
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS' || url.pathname === '/auth/v1/token') return;
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([^/?]+)/)?.[1];
    if (rpc && READ_RPCS.has(rpc)) return;
    if (!handled.has(req.url() + m)) leaked.push(`${m} ${req.url()}`);
  });
  return { assertNoLeak: () => expect(leaked, 'escrita vazou').toEqual([]) };
}

function publicStubs(status: 'pending' | 'confirmed', get: () => Record<string, unknown> | null, set: (r: Record<string, unknown>) => void): Record<string, Stub> {
  const one = () => ({ body: get() ? [get()] : [] });
  return {
    get_active_booking_by_phone: one,
    get_public_booking_by_id: one,
    get_booking_by_id_v2: one,
    get_client_bookings_history_v2: () => {
      const r = get();
      return { body: r ? [{ id: r.id, appointment_time: r.appointment_time, status: r.status, service_ids: r.service_ids,
        service_names: ['Serviço'], professional_id: r.professional_id, professional_name: null,
        total_price: r.total_price, duration_minutes: r.duration_minutes, created_at: r.created_at,
        is_edit: false, original_appointment_time: null }] : [] };
    },
    upsert_public_client: () => ({ body: [{ id: '00000000-0000-4000-8000-0000000000c1', name: 'Cliente Teste', phone: '+351900000001' }] }),
    create_public_booking: (payload) => {
      const p = payload as Record<string, unknown>;
      const row = {
        id: '00000000-0000-4000-8000-0000000000a1', business_id: BIZ,
        customer_name: p.p_customer_name, customer_phone: p.p_customer_phone,
        service_ids: p.p_service_ids, professional_id: p.p_professional_id ?? null,
        appointment_time: p.p_appointment_time, total_price: p.p_total_price,
        duration_minutes: p.p_duration_minutes, status, is_edit: false,
        product_lines: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      set(row);
      return { body: [row] };
    },
  };
}

function publicPatches(autoConfirm: boolean, theme: 'barber' | 'beauty'): Record<string, Patch> {
  return {
    get_public_business_settings_json: (body) => ({ ...((body as Record<string, unknown>) ?? {}), online_booking_auto_confirm: autoConfirm }),
    get_public_profile_by_slug: (body) => {
      const patch = (o: unknown) => (o && typeof o === 'object' ? { ...(o as object), user_type: theme } : o);
      return Array.isArray(body) ? body.map(patch) : patch(body);
    },
  };
}

async function ensureMode(page: Page, mode: 'light' | 'dark') {
  const want = mode === 'light' ? 'Ativar modo claro' : 'Ativar modo escuro';
  const btn = page.getByRole('button', { name: want });
  if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) await btn.click();
  await expect(page.locator('html')).toHaveAttribute('data-mode', mode);
}

async function walkToContact(page: Page, mode: 'light' | 'dark') {
  await page.goto(`${BASE}/#/book/${SLUG}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Escolha seus serviços' }).waitFor({ timeout: 30_000 });
  await ensureMode(page, mode);
  await page.getByRole('heading', { name: 'Barba', exact: true }).click({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Continuar' }).click();
  // profissional: o primeiro da lista (ou "qualquer")
  const pro = page.getByRole('button', { name: /^[A-Z] / }).first();
  if (await pro.isVisible({ timeout: 5_000 }).catch(() => false)) await pro.click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  // primeiro dia com horário
  const slot = page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first();
  const days = page.locator('button:not([disabled])').filter({ hasText: /^\s*\d{1,2}\s*$/ });
  const n = await days.count();
  for (let i = 0; i < n; i++) {
    await days.nth(i).click();
    if (await slot.isVisible({ timeout: 4_000 }).catch(() => false)) break;
  }
  await slot.click({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('textbox', { name: 'Como devemos te chamar?' }).fill('Cliente Teste');
  await page.locator('input[type=tel]').first().fill('900000001');
  for (const cb of await page.locator('input[type=checkbox]').all()) {
    if (!(await cb.isChecked())) await cb.dispatchEvent('click');
  }
}

async function settle(page: Page, ms = 700) {
  await page.mouse.move(1, 1);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await page.waitForTimeout(ms);
}

const MOBILE = { width: 375, height: 812 };

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test.describe('link público: botão final e tela de confirmação', () => {
  test.setTimeout(150_000);
  for (const theme of ['barber', 'beauty'] as const) {
    for (const mode of ['light', 'dark'] as const) {
      for (const auto of [false, true]) {
        const label = auto ? 'Confirmar agendamento' : 'Enviar pedido';
        const tag = `${auto ? 'auto' : 'manual'}-${theme}-mobile-375-${mode}`;
        test(`${tag}: "${label}" e confirmação visível (sem pular para a Minha Área)`, async ({ page }) => {
          fs.mkdirSync(SHOTS, { recursive: true });
          await page.setViewportSize(MOBILE);
          await page.addInitScript((m) => localStorage.setItem('agendix_color_mode', m), mode);
          let row: Record<string, unknown> | null = null;
          const g = await guard(page, publicStubs(auto ? 'confirmed' : 'pending', () => row, (r) => { row = r; }), publicPatches(auto, theme));
          await walkToContact(page, mode);
          const submit = page.getByRole('button', { name: label, exact: true });
          await expect(submit).toBeEnabled({ timeout: 10_000 });
          await expect(page.getByRole('button', { name: auto ? 'Enviar pedido' : 'Confirmar agendamento', exact: true })).toHaveCount(0);
          await submit.scrollIntoViewIfNeeded();
          await settle(page);
          await page.screenshot({ path: `${SHOTS}/public-booking-button-${tag}.png` });
          await submit.click();

          const title = page.getByTestId('public-booking-success-title');
          await expect(title).toBeVisible({ timeout: 20_000 });
          expect(row, 'create_public_booking (stub) chamado').not.toBeNull();
          await expect(title).toHaveAttribute('data-status', auto ? 'confirmed' : 'pending');
          if (auto) {
            await expect(title).toHaveText(theme === 'beauty' ? 'Agendamento confirmado' : 'AGENDAMENTO CONFIRMADO');
            await expect(page.getByText(/horário está garantido/i)).toBeVisible();
          } else {
            await expect(title).toHaveText(theme === 'beauty' ? 'Pedido enviado' : 'PEDIDO ENVIADO');
            await expect(page.getByText(theme === 'beauty'
              ? 'Aguardando a confirmação do salão. Acompanhe na Minha Área.'
              : 'AGUARDANDO A CONFIRMAÇÃO DA BARBEARIA. ACOMPANHE NA MINHA ÁREA.')).toBeVisible();
          }
          await expect(page.getByText(/AGUARDANDO CONFIRMAÇÃO DO SALÃO/)).toHaveCount(0);
          // Problema 5: a confirmação fica na tela (antes piscava e ia para a Minha Área).
          await page.waitForTimeout(3000);
          expect(page.url()).toContain(`/book/${SLUG}`);
          await expect(title).toBeVisible();
          await expect(page.getByText('Minha Área de Cliente')).toBeVisible();
          await title.evaluate((el) => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -190); });
          await settle(page);
          await page.screenshot({ path: `${SHOTS}/public-booking-success-${tag}.png` });
          await page.screenshot({ path: `${SHOTS}/public-booking-success-${tag}-full.png`, fullPage: true });
          // O atalho continua levando para a Minha Área.
          await page.getByText('Minha Área de Cliente').click();
          await expect(page).toHaveURL(new RegExp(`/minha-area/${SLUG}`), { timeout: 15_000 });
          g.assertNoLeak();
        });
      }
    }
  }
});

test.describe('dono: toggle "Aprovar agendamentos online"', () => {
  test.skip(!HAS_OWNER, 'defina E2E_OWNER_EMAIL / E2E_OWNER_PASS');
  test.setTimeout(150_000);
  for (const v of [
    { name: 'barber-desktop-light', mode: 'light', theme: 'barber', vp: { width: 1440, height: 900 } },
    { name: 'barber-desktop-dark', mode: 'dark', theme: 'barber', vp: { width: 1440, height: 900 } },
    { name: 'barber-mobile-375-light', mode: 'light', theme: 'barber', vp: MOBILE },
    { name: 'barber-mobile-375-dark', mode: 'dark', theme: 'barber', vp: MOBILE },
    { name: 'beauty-desktop-light', mode: 'light', theme: 'beauty', vp: { width: 1440, height: 900 } },
    { name: 'beauty-mobile-375-dark', mode: 'dark', theme: 'beauty', vp: MOBILE },
  ] as const) {
    test(`configurações ${v.name}`, async ({ page }) => {
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.setViewportSize(v.vp);
      await page.addInitScript((m) => localStorage.setItem('agendix_color_mode', m), v.mode);
      const themePatch: Patch = (body) => {
        const patch = (o: unknown) => (o && typeof o === 'object' && 'user_type' in (o as object) ? { ...(o as object), user_type: v.theme } : o);
        return Array.isArray(body) ? body.map(patch) : patch(body);
      };
      const g = await guard(page, { list_company_pending_public_bookings: () => ({ body: [] }) }, {},
        v.theme === 'beauty' ? [[/\/rest\/v1\/profiles\?/, themePatch]] : []);
      await login(page, 'owner');
      await page.goto(`${BASE}/#/configuracoes/agendamento`, { waitUntil: 'domcontentloaded' });
      const row = page.getByTestId('online-booking-approval-row');
      await expect(row).toBeVisible({ timeout: 30_000 });
      await expect(row).toContainText('Aprovar agendamentos online');
      const sw = page.locator('#online-booking-requires-approval');
      await expect(sw).toBeChecked(); // padrão: manual
      await row.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -140));
      await settle(page);
      await page.screenshot({ path: `${SHOTS}/settings-toggle-on-${v.name}.png` });
      await sw.dispatchEvent('click');
      await expect(sw).not.toBeChecked();
      await expect(page.getByTestId('online-booking-approval-pending-note'))
        .toHaveText('Pedidos que já chegaram continuam esperando sua resposta.');
      await settle(page);
      await page.screenshot({ path: `${SHOTS}/settings-toggle-off-${v.name}.png` });
      // Não salva (prod só leitura).
      g.assertNoLeak();
    });
  }
});

test.describe('dono: agenda com o agendamento confirmado automaticamente', () => {
  test.skip(!HAS_OWNER, 'defina E2E_OWNER_EMAIL / E2E_OWNER_PASS');
  test.setTimeout(150_000);
  for (const v of [
    { name: 'barber-desktop-light', mode: 'light', theme: 'barber', vp: { width: 1440, height: 900 } },
    { name: 'barber-mobile-375-dark', mode: 'dark', theme: 'barber', vp: MOBILE },
    { name: 'beauty-desktop-light', mode: 'light', theme: 'beauty', vp: { width: 1440, height: 900 } },
  ] as const) {
    test(`agenda ${v.name}`, async ({ page }) => {
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.setViewportSize(v.vp);
      await page.addInitScript((m) => localStorage.setItem('agendix_color_mode', m), v.mode);
      // Amanhã às 10:00 (Lisboa) — hoje pode ser dia fechado.
      const tomorrow = new Date(Date.now() + 86400_000);
      const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow);
      const when = new Date(`${ymd}T10:00:00+01:00`);
      const appt = {
        id: '00000000-0000-4000-8000-0000000000d1', user_id: BIZ, client_id: '00000000-0000-4000-8000-0000000000c1',
        service: 'Corte Masculino', appointment_time: when.toISOString(), price: 30, status: 'Confirmed',
        professional_id: STAFF_PRO, duration_minutes: 30, notes: null, edited_at: null, origin: 'public_booking',
        public_booking_id: '00000000-0000-4000-8000-0000000000a1', payment_method: null, created_at: new Date().toISOString(),
        clients: { name: 'Cliente Online (mock)', id: '00000000-0000-4000-8000-0000000000c1', phone: '+351900000001' },
      };
      const addAppt: Patch = (body, url) => {
        if (!Array.isArray(body)) return body;
        const range = url.searchParams.getAll('appointment_time');
        const gte = range.find((r) => r.startsWith('gte.'))?.slice(4);
        const lte = range.find((r) => r.startsWith('lte.'))?.slice(4);
        const t = when.getTime();
        if (gte && t < new Date(gte).getTime()) return body;
        if (lte && t > new Date(lte).getTime()) return body;
        return [...body, appt];
      };
      const themePatch: Patch = (body) => {
        const patch = (o: unknown) => (o && typeof o === 'object' && 'user_type' in (o as object) ? { ...(o as object), user_type: v.theme } : o);
        return Array.isArray(body) ? body.map(patch) : patch(body);
      };
      const g = await guard(page, { list_company_pending_public_bookings: () => ({ body: [] }) }, {}, [
        [/\/rest\/v1\/appointments\?/, addAppt],
        ...(v.theme === 'beauty' ? [[/\/rest\/v1\/profiles\?/, themePatch] as [RegExp, Patch]] : []),
      ]);
      await login(page, 'owner');
      await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
      const day = page.locator(`[role=option][data-day="${ymd}"]`);
      await day.waitFor({ timeout: 30_000 });
      await page.waitForTimeout(1500);
      await expect(async () => {
        await day.dispatchEvent('click');
        await expect(day).toHaveAttribute('aria-selected', 'true', { timeout: 2_000 });
      }).toPass({ timeout: 20_000 });
      const card = page.getByText('Cliente Online (mock)').first();
      await expect(card).toBeVisible({ timeout: 30_000 });
      await card.scrollIntoViewIfNeeded();
      await settle(page, 1200);
      await page.screenshot({ path: `${SHOTS}/agenda-auto-confirmed-${v.name}.png` });
      g.assertNoLeak();
    });
  }
});
