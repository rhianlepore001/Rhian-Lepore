/**
 * Prints: Settings > Negócio > Agendamento (antecedência com minutos + política editável)
 * e a página pública mostrando a política e "Observações:".
 * Tudo mockado com page.route: nenhuma requisição sai para o Supabase.
 *
 *   SHOT_DIR=/workspace/screens/booking-settings npx playwright test e2e/booking-policy-settings.shots.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = process.env.E2E_SUPABASE_REF || 'lcqwrngscsziysyfhpfj';
const OUT = process.env.SHOT_DIR || '/tmp/booking-settings-shots';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const NOW = '2026-10-13T12:00:00.000Z';

const BUSINESSES = {
  barbearia: { userType: 'barber', name: 'Barbearia São João', slug: 'barbearia-sao-joao' },
  salao: { userType: 'beauty', name: 'Studio Aurora', slug: 'studio-aurora' },
} as const;
const POLICY = 'Cancele ou remarque com até 3h de antecedência pela Minha Área. Depois disso, fale com a gente pelo WhatsApp.';
const NOTE = 'Chegue 5 minutos antes. Atrasos acima de 15 minutos podem precisar ser remarcados.';
const VIEWPORTS = [
  { name: 'mobile375', width: 375, height: 812 },
  { name: 'desktop1440', width: 1440, height: 900 },
] as const;

function b64url(obj: unknown) { return Buffer.from(JSON.stringify(obj)).toString('base64url'); }
function session() {
  const token = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: OWNER_ID, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400, email: 'dono@example.test' })}.sig`;
  return {
    access_token: token, refresh_token: 'r', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, token_type: 'bearer',
    user: { id: OWNER_ID, email: 'dono@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Dono' }, created_at: '2026-01-01T00:00:00.000Z' },
  };
}

async function json(route: Route, body: unknown, status = 200) {
  const accept = route.request().headers()['accept'] || '';
  const wantsObject = accept.includes('vnd.pgrst.object+json');
  const payload = wantsObject && Array.isArray(body) ? (body[0] ?? null) : body;
  await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(payload) });
}

const HOURS = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] }]));

async function mockAll(page: Page, biz: (typeof BUSINESSES)[keyof typeof BUSINESSES], opts: { owner: boolean; mode: 'light' | 'dark' }) {
  const s = session();
  await page.addInitScript(({ key, value, owner, mode }) => {
    if (owner) localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem('agendix_color_mode', mode);
  }, { key: `sb-${PROJECT_REF}-auth-token`, value: s, owner: opts.owner, mode: opts.mode });

  const publicSettings = {
    timezone: 'America/Sao_Paulo', enable_self_rescheduling: true, cancellation_policy: null,
    client_cancel_cutoff_hours: 2, client_cancel_note: NOTE, client_cancel_policy_text: POLICY,
    business_hours: HOURS, online_booking_auto_confirm: false,
  };
  const rpc: Record<string, unknown> = {
    get_public_profile_by_slug: { id: OWNER_ID, business_name: biz.name, user_type: biz.userType, region: 'BR', business_slug: biz.slug, public_booking_enabled: true, phone: '11999998888', logo_url: null, cover_photo_url: null },
    get_public_business_settings_json: publicSettings,
    get_public_services_catalog: [{ id: 'svc-1', name: 'Corte', duration_minutes: 40, price: 60, category_id: 'cat-1', active: true }],
    get_public_categories_catalog: [{ id: 'cat-1', name: 'Serviços' }],
    get_public_team_catalog: [{ id: 'pro-1', full_name: 'Ana', name: 'Ana', photo_url: null, specialties: [], individual_rating: 5, total_reviews: 0 }],
    get_public_gallery_catalog: [], get_public_products_catalog: [], get_public_membership_plans: [], get_public_client_membership: null,
    get_public_pix_config: null, find_active_queue_entry_by_phone: [], get_active_booking_by_phone: [],
    get_first_available_professional: 'pro-1', get_full_dates: [], get_full_dates_v2: [],
    get_available_slots: { slots: ['15:00', '15:30', '16:00'] },
    get_available_slots_v2: { slots: ['15:00', '15:30', '16:00'], lead_time_hours: 2, lead_time_minutes: 90, empty_reason: null },
  };

  await page.route(`**/${PROJECT_REF}.supabase.co/**`, async (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    if (req.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } }); return; }
    if (p.includes('/auth/v1/user')) { await json(route, s.user); return; }
    if (p.includes('/auth/v1/')) { await json(route, opts.owner ? s : {}); return; }
    const m = p.match(/\/rest\/v1\/rpc\/([^/?]+)/);
    if (m) { await json(route, m[1] in rpc ? rpc[m[1]] : null); return; }
    if (p.includes('/rest/v1/profiles')) {
      await json(route, [{ id: OWNER_ID, role: 'owner', company_id: OWNER_ID, full_name: 'Dono', business_name: biz.name, business_slug: biz.slug, public_booking_enabled: true, booking_lead_time_hours: 2, booking_lead_time_minutes: 90, max_bookings_per_day: null, user_type: biz.userType, region: 'BR', subscription_status: 'active', tutorial_completed: true }]);
      return;
    }
    if (p.includes('/rest/v1/business_settings')) {
      await json(route, [{ user_id: OWNER_ID, enable_self_rescheduling: true, public_products_enabled: false, timezone: 'America/Sao_Paulo', business_hours: HOURS, onboarding_completed: true, cancellation_policy: null, client_cancel_cutoff_hours: 2, client_cancel_note: NOTE, client_cancel_policy_text: POLICY }]);
      return;
    }
    if (p.includes('/rest/v1/onboarding_progress')) { await json(route, [{ is_completed: true }]); return; }
    if (p.includes('/rest/v1/')) { await json(route, []); return; }
    await route.fulfill({ status: 200, body: '{}' });
  });
}

async function settle(page: Page) {
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await page.evaluate(async () => { await document.fonts.ready; (document.activeElement as HTMLElement | null)?.blur?.(); });
  await page.waitForTimeout(300);
}

async function elementShot(page: Page, testId: string, file: string) {
  fs.mkdirSync(OUT, { recursive: true });
  const el = page.getByTestId(testId);
  // O layout mobile rola dentro de um container com altura fixa: solta os ancestrais
  // com overflow para o print pegar o card inteiro.
  await el.evaluate((node) => {
    let cur: HTMLElement | null = node.parentElement;
    while (cur && cur !== document.body) {
      const cs = getComputedStyle(cur);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowY) || cs.maxHeight !== 'none') {
        cur.style.overflow = 'visible';
        cur.style.maxHeight = 'none';
        cur.style.height = 'auto';
      }
      cur = cur.parentElement;
    }
  });
  await el.scrollIntoViewIfNeeded();
  await settle(page);
  await el.screenshot({ path: path.join(OUT, file) });
}

test.describe('booking settings + política pública (prints)', () => {
  test.setTimeout(120_000);
  for (const [bizKey, biz] of Object.entries(BUSINESSES)) {
    for (const vp of VIEWPORTS) {
      for (const mode of ['light', 'dark'] as const) {
        test(`settings ${bizKey} ${vp.name} ${mode}`, async ({ page }) => {
          // Altura extra para o card inteiro caber sem a barra fixa de salvar por cima.
          await page.setViewportSize({ width: vp.width, height: 2200 });
          await mockAll(page, biz, { owner: true, mode });
          await page.goto(`${BASE}/#/configuracoes/agendamento`, { waitUntil: 'domcontentloaded' });
          await expect(page.getByRole('heading', { name: 'Antecedência mínima para marcar pelo link' })).toBeVisible({ timeout: 30_000 });
          await expect(page.getByTestId('booking-lead-time-custom')).toHaveValue('1');
          await expect(page.getByTestId('booking-lead-time-custom-minutes')).toHaveValue('30');
          await expect(page.getByTestId('lead-time-example-text')).toHaveText('Com 1h30: se agora são 14h, o cliente só vê horários a partir das 15h30.');
          await elementShot(page, 'lead-time-section', `settings-antecedencia-${bizKey}-${vp.name}-${mode}.png`);
          await expect(page.getByRole('heading', { name: 'Política de cancelamento' })).toBeVisible();
          await expect(page.getByTestId('client-cancel-policy-text')).toHaveValue(POLICY);
          await expect(page.getByTestId('cancel-policy-preview')).toContainText(`Observações: ${NOTE}`);
          await elementShot(page, 'cancel-cutoff-section', `settings-politica-${bizKey}-${vp.name}-${mode}.png`);
        });
      }

      test(`público ${bizKey} ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.clock.setFixedTime(new Date(NOW));
        await mockAll(page, biz, { owner: false, mode: 'light' });
        await page.goto(`${BASE}/#/book/${biz.slug}?agendar=1`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Corte').first()).toBeVisible({ timeout: 30_000 });
        await page.getByText('Corte').first().click();
        await page.getByRole('button', { name: /^Continuar$/ }).click();
        const any = page.getByRole('button', { name: 'Qualquer profissional' });
        if (await any.isVisible({ timeout: 8_000 }).catch(() => false)) {
          await any.click();
          await page.getByRole('button', { name: /^Continuar$/ }).click();
        }
        const day = page.locator('button[data-date]:not([disabled])').first();
        await day.waitFor({ timeout: 15_000 });
        await day.click();
        const slot = page.locator('button', { hasText: /^\d{2}:\d{2}$/ }).first();
        await slot.waitFor({ timeout: 15_000 });
        await slot.click();
        await page.getByRole('button', { name: /^Continuar$/ }).click();
        const inline = page.getByTestId('public-cancellation-policy-inline').first();
        await expect(inline).toBeVisible({ timeout: 15_000 });
        await expect(inline).toContainText(POLICY);
        await expect(inline).toContainText(`Observações: ${NOTE}`);
        fs.mkdirSync(OUT, { recursive: true });
        await inline.scrollIntoViewIfNeeded();
        await settle(page);
        await page.screenshot({ path: path.join(OUT, `publico-checkout-${bizKey}-${vp.name}.png`) });
        await page.getByRole('button', { name: /política de cancelamento/i }).first().click();
        await expect(page.getByTestId('public-cancellation-policy-notes')).toHaveText(`Observações: ${NOTE}`);
        await settle(page);
        await page.screenshot({ path: path.join(OUT, `publico-modal-${bizKey}-${vp.name}.png`) });
      });
    }
  }
});
