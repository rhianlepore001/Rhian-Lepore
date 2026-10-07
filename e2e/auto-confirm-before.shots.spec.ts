/**
 * Screens "antes" (Fase 1, só leitura): aprovação manual de agendamentos online
 * (/workspace/screens/auto-confirm/before) e permissão de bloqueio de agenda
 * (/workspace/screens/block-perms/before).
 *   E2E_OWNER_EMAIL=... E2E_OWNER_PASS=... npx playwright test e2e/auto-confirm-before.shots.spec.ts --project=chromium-legacy
 * Prod SÓ LEITURA: GET passa; POST só para RPCs de leitura (allowlist). create_public_booking
 * e qualquer outra escrita são STUBADOS/abortados — nenhum pedido real é criado.
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import { BASE, login } from './helpers/agendixLogin';

const SHOTS = process.env.SHOTS_DIR || '/workspace/screens/auto-confirm/before';
const SLUG = 'barbeariasilva';
const BIZ = '03254cc1-3f37-44f8-a31c-e4fdffd1304b';
const SVC = 'dd4aeaa5-e71a-479b-b964-a57beaf5a6e3'; // Corte Masculino
const PRO = '92b0e55b-bf8e-400d-be5b-77314f76b1c8'; // Marcos Silva

const READ_RPCS = new Set([
  'get_public_profile_by_slug', 'get_public_business_settings_json', 'get_public_products_catalog',
  'get_public_services_catalog', 'get_public_categories_catalog', 'get_public_team_catalog',
  'get_public_gallery_catalog', 'get_available_slots_v2', 'get_available_slots', 'get_full_dates_v2',
  'get_full_dates', 'get_first_available_professional', 'get_public_client_by_phone',
  'get_client_booking_cancellations', 'get_public_membership_plans', 'get_public_client_membership',
  'get_auth_company_id', 'get_auth_role', 'list_agenda_blocks',
]);

type Stub = (payload: unknown) => { status?: number; body: unknown };

async function guard(page: Page, stubs: Record<string, Stub>) {
  const leaked: string[] = [];
  const handled = new Set<string>();
  await page.route(/\.supabase\.co\//, async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const m = req.method();
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS' || url.pathname === '/auth/v1/token') return route.continue();
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([^/?]+)/)?.[1];
    let payload: unknown = null;
    try { payload = req.postDataJSON(); } catch { payload = req.postData(); }
    if (rpc && stubs[rpc]) {
      handled.add(req.url() + m);
      const r = stubs[rpc](payload);
      return route.fulfill({ status: r.status ?? 200, contentType: 'application/json', body: JSON.stringify(r.body) });
    }
    if (rpc && READ_RPCS.has(rpc)) { handled.add(req.url() + m); return route.continue(); }
    handled.add(req.url() + m);
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

function publicStubs(get: () => Record<string, unknown> | null, set: (r: Record<string, unknown>) => void): Record<string, Stub> {
  const one = () => ({ body: get() ? [get()] : [] });
  return {
    get_active_booking_by_phone: one,
    get_public_booking_by_id: one,
    get_booking_by_id_v2: one,
    get_client_bookings_history_v2: () => {
      const r = get();
      return { body: r ? [{ id: r.id, appointment_time: r.appointment_time, status: r.status, service_ids: r.service_ids,
        service_names: ['Barba'], professional_id: r.professional_id, professional_name: 'Marcos Silva',
        total_price: r.total_price, duration_minutes: r.duration_minutes, created_at: r.created_at,
        is_edit: false, original_appointment_time: null }] : [] };
    },
    upsert_public_client: () => ({ body: [{ id: '00000000-0000-4000-8000-0000000000c1', name: 'Cliente Teste', phone: '+5511999990000' }] }),
    create_public_booking: (payload) => {
      const p = payload as Record<string, unknown>;
      const row = {
        id: '00000000-0000-4000-8000-0000000000a1', business_id: BIZ,
        customer_name: p.p_customer_name, customer_phone: p.p_customer_phone,
        service_ids: p.p_service_ids, professional_id: p.p_professional_id ?? PRO,
        appointment_time: p.p_appointment_time, total_price: p.p_total_price,
        duration_minutes: p.p_duration_minutes, status: 'pending', is_edit: false,
        product_lines: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      set(row);
      return { body: [row] };
    },
  };
}

function futureSlotIso(): string {
  const d = new Date(Date.now() + 2 * 86400_000);
  d.setUTCHours(14, 0, 0, 0);
  return d.toISOString();
}

test.describe('auto-confirm: screens antes', () => {
  test.setTimeout(120_000);

  async function walkPublicBooking(page: Page, query = '') {
    await page.goto(`${BASE}/#/book/${SLUG}${query}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Barba', exact: true }).click({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'M Marcos' }).first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: '9', exact: true }).click({ timeout: 30_000 });
    await page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first().click({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('textbox', { name: 'Como devemos te chamar?' }).fill('Cliente Teste');
    await page.getByRole('textbox', { name: '999 999 999' }).fill('900000001');
    await page.getByRole('checkbox', { name: /Confirmo meu compromisso/ }).dispatchEvent('click');
    await expect(page.getByRole('button', { name: 'Confirmar agendamento' })).toBeEnabled({ timeout: 10_000 });
    await page.screenshot({ path: `${SHOTS}/.tmp-contact.png` });
  }

  for (const v of [
    { name: 'mobile-375-dark', mode: 'dark', vp: { width: 375, height: 812 } },
    { name: 'mobile-375-light', mode: 'light', vp: { width: 375, height: 812 } },
    { name: 'desktop-light', mode: 'light', vp: { width: 1440, height: 900 } },
  ] as const) {
    test(`link público: após enviar cai na Minha Área ${v.name}`, async ({ page }) => {
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.setViewportSize(v.vp);
      await page.addInitScript((mode) => localStorage.setItem('agendix_color_mode', mode), v.mode);
      let row: Record<string, unknown> | null = null;
      const g = await guard(page, publicStubs(() => row, (r) => { row = r; }));
      await walkPublicBooking(page);
      await page.screenshot({ path: `${SHOTS}/public-booking-contact-cta-${v.name}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Confirmar agendamento' }).click();
      const sent = page.getByText(/SOLICITAÇÃO ENVIADA|Solicitação enviada/).first();
      await sent.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined); // pisca e redireciona
      expect(row, 'create_public_booking stubado foi chamado').not.toBeNull();
      await expect(page.getByText('Aguardando').first()).toBeVisible({ timeout: 30_000 });
      await page.mouse.move(2, 2);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${SHOTS}/minha-area-pending-${v.name}.png`, fullPage: true });
      g.assertNoLeak();
    });
  }

  for (const v of [
    { name: 'mobile-375-dark', mode: 'dark', vp: { width: 375, height: 812 } },
    { name: 'mobile-375-light', mode: 'light', vp: { width: 375, height: 812 } },
    { name: 'desktop-light', mode: 'light', vp: { width: 1440, height: 900 } },
  ] as const) {
    test(`link público ?agendar=1: tela "Solicitação enviada" ${v.name}`, async ({ page }) => {
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.setViewportSize(v.vp);
      await page.addInitScript((mode) => localStorage.setItem('agendix_color_mode', mode), v.mode);
      let row: Record<string, unknown> | null = null;
      const g = await guard(page, publicStubs(() => row, (r) => { row = r; }));
      await walkPublicBooking(page, '?agendar=1');
      await page.getByRole('button', { name: 'Confirmar agendamento' }).click();
      await expect(page.getByText(/SOLICITAÇÃO ENVIADA|Solicitação enviada/).first()).toBeVisible({ timeout: 20_000 });
      expect(row).not.toBeNull();
      await page.mouse.move(2, 2);
      await page.waitForTimeout(2500);
      await expect(page.getByText(/SOLICITAÇÃO ENVIADA|Solicitação enviada/).first()).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/public-booking-sent-${v.name}.png`, fullPage: true });
      g.assertNoLeak();
    });
  }

  for (const v of [
    { name: 'desktop-light', mode: 'light', vp: { width: 1440, height: 900 } },
    { name: 'desktop-dark', mode: 'dark', vp: { width: 1440, height: 900 } },
    { name: 'mobile-375-dark', mode: 'dark', vp: { width: 375, height: 812 } },
  ] as const) {
    test(`dono: configurações > agendamento ${v.name}`, async ({ page }) => {
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.setViewportSize(v.vp);
      await page.addInitScript((mode) => localStorage.setItem('agendix_color_mode', mode), v.mode);
      const g = await guard(page, { list_company_pending_public_bookings: () => ({ body: [] }) });
      await login(page, 'owner');
      await page.goto(`${BASE}/#/configuracoes/agendamento`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Ativar Reservas Online')).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SHOTS}/settings-agendamento-${v.name}.png`, fullPage: true });
      g.assertNoLeak();
    });
  }

  for (const v of [
    { name: 'desktop-light', mode: 'light', vp: { width: 1440, height: 900 } },
    { name: 'desktop-dark', mode: 'dark', vp: { width: 1440, height: 900 } },
    { name: 'mobile-375-dark', mode: 'dark', vp: { width: 375, height: 812 } },
  ] as const) {
    test(`agenda: card de pedido pendente ${v.name}`, async ({ page }) => {
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.setViewportSize(v.vp);
      await page.addInitScript((mode) => localStorage.setItem('agendix_color_mode', mode), v.mode);
      const pending = [{
        id: '00000000-0000-4000-8000-0000000000b1', business_id: BIZ, customer_name: 'Cliente Teste (mock)',
        customer_phone: '+351900000001', service_ids: [SVC], professional_id: PRO,
        appointment_time: futureSlotIso(), total_price: 45, duration_minutes: 30, status: 'pending',
        is_edit: false, product_lines: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }];
      const g = await guard(page, { list_company_pending_public_bookings: () => ({ body: pending }) });
      await login(page, 'owner');
      await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
      const card = page.getByTestId(`agenda-public-booking-${pending[0].id}`);
      await expect(card).toBeVisible({ timeout: 30_000 });
      await page.mouse.move(2, 2);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${SHOTS}/agenda-pending-request-${v.name}.png` });
      await card.screenshot({ path: `${SHOTS}/agenda-pending-request-card-${v.name}.png` });
      g.assertNoLeak();
    });
  }
});

const SHOTS_BLOCK = process.env.SHOTS_BLOCK_DIR || '/workspace/screens/block-perms/before';

test.describe('block-perms: screens antes', () => {
  test.setTimeout(120_000);
  for (const v of [
    { name: 'desktop-light', mode: 'light', vp: { width: 1440, height: 900 } },
    { name: 'desktop-dark', mode: 'dark', vp: { width: 1440, height: 900 } },
    { name: 'mobile-375-dark', mode: 'dark', vp: { width: 375, height: 812 } },
  ] as const) {
    test(`dono: Permissões da equipe ${v.name}`, async ({ page }) => {
      fs.mkdirSync(SHOTS_BLOCK, { recursive: true });
      await page.setViewportSize(v.vp);
      await page.addInitScript((mode) => localStorage.setItem('agendix_color_mode', mode), v.mode);
      const g = await guard(page, { list_company_pending_public_bookings: () => ({ body: [] }) });
      await login(page, 'owner');
      await page.goto(`${BASE}/#/configuracoes/equipe`, { waitUntil: 'domcontentloaded' });
      const section = page.getByTestId('staff-edit-scope-section');
      await expect(section).toBeVisible({ timeout: 30_000 });
      await section.scrollIntoViewIfNeeded();
      await page.mouse.move(2, 2);
      await page.waitForTimeout(800);
      await section.screenshot({ path: `${SHOTS_BLOCK}/settings-permissoes-equipe-${v.name}.png` });
      g.assertNoLeak();
    });

    test(`dono: formulário de bloqueio ${v.name}`, async ({ page }) => {
      fs.mkdirSync(SHOTS_BLOCK, { recursive: true });
      await page.setViewportSize(v.vp);
      await page.addInitScript((mode) => localStorage.setItem('agendix_color_mode', mode), v.mode);
      const g = await guard(page, { list_company_pending_public_bookings: () => ({ body: [] }) });
      await login(page, 'owner');
      await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
      await page.locator('#btn-new-appointment').click({ timeout: 30_000 });
      await page.getByRole('dialog', { name: 'O que você quer fazer?' }).waitFor({ timeout: 10_000 });
      await page.mouse.move(2, 2);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SHOTS_BLOCK}/agenda-escolha-novo-ou-bloquear-${v.name}.png` });
      await page.getByText('Bloquear agenda', { exact: true }).click();
      await page.waitForTimeout(900);
      await page.mouse.move(2, 2);
      await page.screenshot({ path: `${SHOTS_BLOCK}/agenda-form-bloqueio-dono-${v.name}.png` });
      g.assertNoLeak();
    });
  }
});
