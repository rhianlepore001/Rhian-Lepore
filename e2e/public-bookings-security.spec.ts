/**
 * Segurança de public_bookings (docs/specs/public-bookings-security-SPEC.md).
 *   npx playwright test e2e/public-bookings-security.spec.ts --project=chromium-legacy
 * O link público (modo manual e automático, barbearia e salão, claro e escuro, 375 px) vai até a tela de
 * sucesso SEM nenhuma requisição REST direta à tabela public_bookings: só RPCs. Isso prova que o fluxo
 * não depende das policies de anon que a migração remove.
 * Prod SÓ LEITURA: RPCs de leitura passam; create_public_booking e qualquer escrita são STUBADOS ou
 * abortados (mesmo guard do e2e do auto-confirm). Nenhum pedido real é criado.
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import { BASE } from './helpers/agendixLogin';

const SHOTS = process.env.SHOTS_DIR || '/workspace/screens/public-bookings-security';
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

/** Registra qualquer acesso REST direto à tabela (GET/POST/PATCH/DELETE em /rest/v1/public_bookings). */
function watchDirectTableAccess(page: Page) {
  const hits: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (/\.supabase\.co$/.test(url.hostname) && /^\/rest\/v1\/public_bookings(\?|$)/.test(url.pathname + (url.search ? '?' : ''))) {
      hits.push(`${req.method()} ${url.pathname}${url.search}`);
    }
  });
  return hits;
}

const MOBILE = { width: 375, height: 812 };

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test.describe('link público sem acesso direto a public_bookings', () => {
  test.setTimeout(150_000);
  for (const theme of ['barber', 'beauty'] as const) {
    for (const mode of ['light', 'dark'] as const) {
      for (const auto of [false, true]) {
        const label = auto ? 'Confirmar agendamento' : 'Enviar pedido';
        const tag = `${auto ? 'auto' : 'manual'}-${theme}-375-${mode}`;
        test(`${tag}: até a tela de sucesso só com RPCs`, async ({ page }) => {
          fs.mkdirSync(SHOTS, { recursive: true });
          await page.setViewportSize(MOBILE);
          await page.addInitScript((m) => localStorage.setItem('agendix_color_mode', m), mode);
          const direct = watchDirectTableAccess(page);
          const rpcs: string[] = [];
          page.on('request', (req) => {
            const m = new URL(req.url()).pathname.match(/^\/rest\/v1\/rpc\/([^/?]+)/);
            if (m) rpcs.push(m[1]);
          });
          let row: Record<string, unknown> | null = null;
          const g = await guard(page, publicStubs(auto ? 'confirmed' : 'pending', () => row, (r) => { row = r; }), publicPatches(auto, theme));
          await walkToContact(page, mode);
          await settle(page);
          await page.screenshot({ path: `${SHOTS}/${tag}-1-dados.png` });
          const submit = page.getByRole('button', { name: label, exact: true });
          await expect(submit).toBeEnabled({ timeout: 10_000 });
          await submit.scrollIntoViewIfNeeded();
          await settle(page);
          await page.screenshot({ path: `${SHOTS}/${tag}-2-botao.png` });
          await submit.click();

          const title = page.getByTestId('public-booking-success-title');
          await expect(title).toBeVisible({ timeout: 20_000 });
          expect(row, 'create_public_booking (RPC) chamado').not.toBeNull();
          expect(rpcs).toContain('create_public_booking');
          await expect(title).toHaveAttribute('data-status', auto ? 'confirmed' : 'pending');
          await expect(title).toHaveText(auto
            ? (theme === 'beauty' ? 'Agendamento confirmado' : 'AGENDAMENTO CONFIRMADO')
            : (theme === 'beauty' ? 'Pedido enviado' : 'PEDIDO ENVIADO'));
          // Deixa o polling da tela de sucesso rodar (5 s) antes de conferir.
          await page.waitForTimeout(6_000);
          await expect(title).toBeVisible();
          await title.evaluate((el) => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -190); });
          await settle(page);
          await page.screenshot({ path: `${SHOTS}/${tag}-3-sucesso.png` });
          expect(direct, 'acesso REST direto à tabela public_bookings').toEqual([]);
          g.assertNoLeak();
        });
      }
    }
  }
});
