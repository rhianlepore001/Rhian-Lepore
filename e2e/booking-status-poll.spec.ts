/**
 * Tela de sucesso do link público: o polling de 5 s (get_public_booking_by_id) atualiza o status
 * quando o dono aceita. docs/specs/booking-status-poll-SPEC.md
 *   npx playwright test e2e/booking-status-poll.spec.ts --project=chromium-legacy
 * "antes": a RPC responde o erro que prod dá hoje (42804) → o título fica em "Pedido enviado".
 * "depois": a RPC responde o pedido; quando o "dono aceita" (a resposta passa a confirmed) o título
 * muda sozinho para confirmado, sem recarregar.
 * Prod SÓ LEITURA: escritas e as RPCs do pedido são STUBADAS (mesmo guard do e2e do auto-confirm).
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import { BASE } from './helpers/agendixLogin';

const SHOTS = process.env.SHOTS_DIR || '/workspace/screens/booking-status-poll';
const SLUG = process.env.E2E_BOOK_SLUG || 'barbeariasilva';
const BIZ = process.env.E2E_BOOK_BIZ || '03254cc1-3f37-44f8-a31c-e4fdffd1304b';

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

const PROD_ERROR = {
  code: '42804',
  details: 'Returned type text does not match expected type uuid in column 7.',
  hint: null,
  message: 'structure of query does not match function result type',
};

function countCalls(stubs: Record<string, Stub>, rpc: string) {
  const c = { n: 0 };
  const orig = stubs[rpc];
  stubs[rpc] = (p) => { c.n += 1; return orig(p); };
  return c;
}

async function shootTitle(page: Page, path: string) {
  const title = page.getByTestId('public-booking-success-title');
  await title.evaluate((el) => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -190); });
  await settle(page);
  await page.screenshot({ path });
}

test.describe('tela de sucesso: status ao vivo pelo polling', () => {
  test.setTimeout(150_000);
  for (const theme of ['barber', 'beauty'] as const) {
    for (const mode of ['light', 'dark'] as const) {
      const tag = `${theme}-375-${mode}`;
      const pendingText = theme === 'beauty' ? 'Pedido enviado' : 'PEDIDO ENVIADO';
      const confirmedText = theme === 'beauty' ? 'Agendamento confirmado' : 'AGENDAMENTO CONFIRMADO';

      test(`antes (RPC com o erro de prod) ${tag}: fica em "Pedido enviado"`, async ({ page }) => {
        fs.mkdirSync(SHOTS, { recursive: true });
        await page.setViewportSize(MOBILE);
        await page.addInitScript((m) => localStorage.setItem('agendix_color_mode', m), mode);
        let row: Record<string, unknown> | null = null;
        const stubs = publicStubs('pending', () => row, (r) => { row = r; });
        let pollCalls = 0;
        const activeCalls = countCalls(stubs, 'get_active_booking_by_phone');
        stubs.get_public_booking_by_id = () => { pollCalls += 1; return { status: 400, body: PROD_ERROR }; };
        const g = await guard(page, stubs, publicPatches(false, theme));
        await walkToContact(page, mode);
        await page.getByRole('button', { name: 'Enviar pedido', exact: true }).click();
        const title = page.getByTestId('public-booking-success-title');
        await expect(title).toHaveText(pendingText, { timeout: 20_000 });
        // espera o polling começar (e a busca do pedido ativo por telefone, que roda logo depois do envio)
        await expect.poll(() => pollCalls, { timeout: 12_000 }).toBeGreaterThan(0);
        const otherCalls = activeCalls.n;
        // dono aceitou no banco, mas a RPC do polling falha: a tela não muda
        (row as unknown as Record<string, unknown>).status = 'confirmed';
        await page.waitForTimeout(11_000);
        expect(pollCalls, 'polling continuou chamando a RPC').toBeGreaterThan(1);
        expect(activeCalls.n, 'nenhuma outra busca pegou o status').toBe(otherCalls);
        await expect(title).toHaveText(pendingText);
        await expect(title).toHaveAttribute('data-status', 'pending');
        await shootTitle(page, `${SHOTS}/antes-${tag}-apos-aceite-continua-pedido-enviado.png`);
        g.assertNoLeak();
      });

      test(`depois ${tag}: muda para confirmado quando o dono aceita`, async ({ page }) => {
        fs.mkdirSync(SHOTS, { recursive: true });
        await page.setViewportSize(MOBILE);
        await page.addInitScript((m) => localStorage.setItem('agendix_color_mode', m), mode);
        let row: Record<string, unknown> | null = null;
        const stubs = publicStubs('pending', () => row, (r) => { row = r; });
        let pollCalls = 0;
        const activeCalls = countCalls(stubs, 'get_active_booking_by_phone');
        // Igual à função corrigida: só os campos do RETURNS TABLE (sem is_edit/created_at/...)
        stubs.get_public_booking_by_id = () => {
          pollCalls += 1;
          const r = row as Record<string, unknown> | null;
          return { body: r ? [{ id: r.id, customer_name: r.customer_name, customer_phone: r.customer_phone,
            appointment_time: r.appointment_time, service_ids: r.service_ids, status: r.status, business_id: BIZ,
            professional_id: r.professional_id, total_price: r.total_price, duration_minutes: r.duration_minutes }] : [] };
        };
        const g = await guard(page, stubs, publicPatches(false, theme));
        await walkToContact(page, mode);
        await page.getByRole('button', { name: 'Enviar pedido', exact: true }).click();
        const title = page.getByTestId('public-booking-success-title');
        await expect(title).toHaveText(pendingText, { timeout: 20_000 });
        await page.waitForTimeout(6_000); // um ciclo de polling ainda pending: continua igual
        await expect(title).toHaveText(pendingText);
        await shootTitle(page, `${SHOTS}/depois-${tag}-1-pedido-enviado.png`);
        const callsBefore = pollCalls;
        expect(callsBefore).toBeGreaterThan(0);
        // dono aceita
        const otherCalls = activeCalls.n;
        (row as unknown as Record<string, unknown>).status = 'confirmed';
        await expect(title).toHaveText(confirmedText, { timeout: 12_000 });
        await expect(title).toHaveAttribute('data-status', 'confirmed');
        expect(activeCalls.n, 'quem atualizou foi o polling, não outra busca').toBe(otherCalls);
        await shootTitle(page, `${SHOTS}/depois-${tag}-2-confirmado-sem-recarregar.png`);
        // confirmado: o polling para
        const callsAtConfirm = pollCalls;
        await page.waitForTimeout(11_000);
        expect(pollCalls - callsAtConfirm).toBeLessThanOrEqual(1);
        expect(page.url()).toContain(`/book/${SLUG}`);
        g.assertNoLeak();
      });
    }
  }
});
