/**
 * E2E — painel mês/ano da Agenda + seta voltar do Financeiro (Performance).
 * Mocks de rede. Sem escrita em prod.
 *
 *   E2E_SHOTS_DIR=/workspace/agenda-month-shots npx playwright test e2e/agenda-month-picker.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installProdWriteGuard, type ProdWriteGuard } from './helpers/prodWriteGuard';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = process.env.E2E_SUPABASE_REF || 'lcqwrngscsziysyfhpfj';
const STAFF_ID = '6fc5cf83-b7b6-4be7-9ba7-414d9d2e92f1';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const ARTIFACTS = process.env.E2E_SHOTS_DIR || '/workspace/agenda-month-shots';

const MEMBER_IDS = [
  'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
];
const MEMBER_NAMES = ['Mário Cesar', 'Antonio Barros'];

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function fakeSession(userId: string, email: string, fullName: string) {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub: userId, role: 'authenticated', aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 86400, email,
  });
  return {
    access_token: `${header}.${payload}.e2e-fake-sig`,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: userId, email, aud: 'authenticated', role: 'authenticated',
      app_metadata: { provider: 'email' }, user_metadata: { full_name: fullName },
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
    headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function stubSession(
  page: Page,
  guard: ProdWriteGuard,
  opts: { role: 'staff' | 'owner'; mode: 'light' | 'dark' },
) {
  const userId = opts.role === 'owner' ? OWNER_ID : STAFF_ID;
  const session = fakeSession(
    userId,
    opts.role === 'owner' ? 'owner@example.test' : 'staff.agenda@example.test',
    opts.role === 'owner' ? 'Rhian Owner' : 'Mário Cesar',
  );
  await page.addInitScript(
    ({ key, value, colorMode }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem('agendix_color_mode', colorMode);
      document.documentElement.setAttribute('data-mode', colorMode);
      document.documentElement.setAttribute('data-theme', 'beauty');
      void navigator.serviceWorker?.getRegistrations?.().then((rs) => rs.forEach((r) => r.unregister()));
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session, colorMode: opts.mode },
  );

  const profile = {
    id: userId,
    role: opts.role,
    company_id: opts.role === 'staff' ? OWNER_ID : OWNER_ID,
    full_name: session.user.user_metadata.full_name,
    business_name: 'Studio AgendiX',
    business_slug: 'studio-agendix',
    public_booking_enabled: true,
    user_type: 'beauty',
    region: 'BR',
    subscription_status: 'active',
    tutorial_completed: true,
  };

  await page.route(/\.supabase\.co\/(auth|rest)\//, async (route) => {
    const req = route.request();
    const pathname = new URL(req.url()).pathname;
    const search = new URL(req.url()).search;
    if (pathname.includes('/auth/v1/user') || pathname.includes('/auth/v1/token')) {
      await fulfillJson(route, pathname.includes('/auth/v1/user') ? session.user : session);
      return;
    }
    // POSTs (RPC) caem no prodWriteGuard via fallback.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method())) {
      await route.fallback();
      return;
    }
    if (pathname.includes('/rest/v1/profiles')) {
      await fulfillJson(route, [profile]);
      return;
    }
    if (pathname.includes('/rest/v1/team_members')) {
      const members = MEMBER_IDS.map((id, i) => ({
        id,
        name: MEMBER_NAMES[i],
        photo_url: null,
        active: true,
        staff_user_id: i === 0 && opts.role === 'staff' ? STAFF_ID : null,
        user_id: OWNER_ID,
        is_owner: false,
        commission_rate: 40,
      }));
      if (search.includes(`staff_user_id=eq.${STAFF_ID}`)) {
        await fulfillJson(route, [members[0]]);
        return;
      }
      await fulfillJson(route, members);
      return;
    }
    if (pathname.includes('/rest/v1/onboarding_progress')) {
      await fulfillJson(route, [{ is_completed: true }]);
      return;
    }
    if (pathname.includes('/rest/v1/business_settings')) {
      await fulfillJson(route, [{
        user_id: OWNER_ID,
        timezone: 'Europe/Lisbon',
        business_hours: {},
        commission_settlement_day_of_month: 5,
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

  guard.stubRpc('list_company_pending_public_bookings', { body: [] });
  guard.stubRpc('list_agenda_blocks', { body: [] });
  guard.stubRpc('get_staff_performance', {
    body: {
      period: {
        start: '2026-09-01',
        end: '2026-09-30',
        tz: 'Europe/Lisbon',
        partial: false,
        previous: { start: '2026-08-01', end: '2026-08-31' },
      },
      members: [],
      team_totals: { atendimentos: 0, vendas_produtos: 0, avulsos: 0, retorno: null },
      ranking_available: false,
      unassigned: null,
    },
  });
  guard.stubRpc('generate_commission_reminders_v1', { body: { inserted: 0 } });
}

async function expectNoPageOverflow(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const app = document.querySelector('[data-app-scroll]') as HTMLElement | null;
    return {
      doc: document.scrollingElement!.scrollWidth,
      iw: window.innerWidth,
      app: app ? app.scrollWidth - app.clientWidth : 0,
    };
  });
  expect(r.doc, `${label}: document scrollWidth`).toBeLessThanOrEqual(r.iw);
  expect(r.app, `${label}: app container`).toBeLessThanOrEqual(0);
}

function shot(page: Page, name: string) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  return page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`), fullPage: false });
}

test.describe('Agenda mês/ano + voltar Financeiro', () => {
  test.setTimeout(180_000);

  test('painel: abrir, escolher mês → ?date=, Hoje, sem overflow 360/390/412', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    await stubSession(page, guard, { role: 'staff', mode: 'light' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/#/agenda?date=2026-10-05`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('agenda-day-scroller')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('agenda-month-trigger')).toContainText(/Outubro/i);

    await shot(page, 'agenda-390-light-closed');

    await page.getByTestId('agenda-month-trigger').click();
    await expect(page.getByTestId('agenda-month-picker')).toBeVisible();
    await shot(page, 'agenda-390-light-open');

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-mode', 'dark');
      localStorage.setItem('agendix_color_mode', 'dark');
    });
    await shot(page, 'agenda-390-dark-open');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('agenda-month-picker')).toHaveCount(0);
    await shot(page, 'agenda-390-dark-closed');

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-mode', 'light');
      localStorage.setItem('agendix_color_mode', 'light');
    });
    await page.getByTestId('agenda-month-trigger').click();
    await page.getByTestId('agenda-month-year-prev').click(); // 2025
    await page.getByTestId('agenda-month-0').click(); // Janeiro
    await expect(page).toHaveURL(/date=2025-01-01/);
    await expect(page.getByTestId('agenda-day-selected')).toHaveAttribute('data-day', '2025-01-01');
    await expect(page.getByTestId('agenda-hoje-chip')).toBeVisible();

    await page.getByTestId('agenda-hoje-chip').click();
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    await expect(page).toHaveURL(new RegExp(`date=${y}-${m}-${d}`));

    for (const w of [360, 390, 412]) {
      await page.setViewportSize({ width: w, height: 800 });
      await expectNoPageOverflow(page, `agenda ${w}`);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/#/agenda?date=2026-10-05`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('agenda-month-trigger')).toBeVisible({ timeout: 30_000 });
    await shot(page, 'agenda-1440-light-closed');
    await page.getByTestId('agenda-month-trigger').click();
    await expect(page.getByTestId('agenda-month-picker')).toBeVisible();
    await shot(page, 'agenda-1440-light-open');

    guard.assertNoLeak();
  });

  test('Performance 390 dark: seta do Header volta ao Financeiro', async ({ page }) => {
    const guard = await installProdWriteGuard(page);
    await stubSession(page, guard, { role: 'owner', mode: 'dark' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/#/financeiro/performance?de=2026-09-01&ate=2026-09-30`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByText('Performance da equipe')).toBeVisible({ timeout: 30_000 });
    const back = page.getByTestId('header-back');
    await expect(back).toBeVisible();
    // HashRouter prefixa com #/
    await expect(back).toHaveAttribute('href', /#?\/financeiro\?tab=commissions/);
    await expect(back).toHaveAttribute('aria-label', 'Voltar ao Financeiro');
    await shot(page, 'fin-back-after-390-dark');

    // "Antes": destino antigo era a Home — captura com href="/" para contraste no artefato.
    await page.evaluate(() => {
      const a = document.querySelector('[data-testid="header-back"]') as HTMLAnchorElement | null;
      if (a) {
        a.setAttribute('href', '#/');
        a.setAttribute('aria-label', 'Voltar ao início');
        a.setAttribute('title', 'Voltar ao início');
      }
    });
    await shot(page, 'fin-back-before-390-dark');

    await page.evaluate(() => {
      const a = document.querySelector('[data-testid="header-back"]') as HTMLAnchorElement | null;
      if (a) {
        a.setAttribute('href', '#/financeiro?tab=commissions');
        a.setAttribute('aria-label', 'Voltar ao Financeiro');
        a.setAttribute('title', 'Voltar ao Financeiro');
      }
    });
    await back.click();
    await expect(page).toHaveURL(/#\/financeiro\?tab=commissions/);
    guard.assertNoLeak();
  });
});
