/**
 * Agenda: cabeçalho dos profissionais (Todos + cards) fixo ao rolar a grade.
 * Supabase 100% mockado (nenhuma requisição chega a prod).
 *
 *   npx vite --port 3421
 *   E2E_BASE_URL=http://127.0.0.1:3421 SHOT_PREFIX=depois ASSERT_STICKY=1 \
 *     npx playwright test e2e/agenda-sticky-pro-header.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const SHOTS = process.env.SHOTS_DIR || '/workspace/screens/agenda-sticky';
const PREFIX = process.env.SHOT_PREFIX || 'depois';
const ASSERT = process.env.ASSERT_STICKY === '1';
const PROJECT_REF = 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const MEMBER_IDS = [
  'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
  'cccccccc-dddd-4eee-8fff-000000000000',
  'dddddddd-eeee-4fff-9000-111111111111',
  'eeeeeeee-ffff-4000-a111-222222222222',
  'ffffffff-0000-4111-b222-333333333333',
];
const MEMBER_NAMES = ['Antonio Barros', 'Boiola', 'Carla Dias', 'Diego Lima', 'Eva Souza', 'Mário Cesar'];

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function fakeJwt(sub: string): string {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
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
    body: JSON.stringify(payload),
  });
}

async function installMocks(page: Page, opts: { userType: 'barber' | 'beauty'; mode: 'light' | 'dark'; members: number }) {
  const accessToken = fakeJwt(OWNER_ID);
  const session = {
    access_token: accessToken,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: OWNER_ID,
      email: 'dono.agenda@example.test',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: 'Mário Cesar' },
      created_at: '2026-01-01T00:00:00.000Z',
    },
  };

  await page.addInitScript(
    ({ key, value, mode }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem('agendix_color_mode', mode);
      navigator.serviceWorker?.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session, mode: opts.mode },
  );

  await page.route(`**/${PROJECT_REF}.supabase.co/**`, async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const search = url.search;

    if (pathname.includes('/auth/v1/user')) {
      await fulfillJson(route, session.user);
      return;
    }
    if (pathname.includes('/auth/v1/token') || pathname.includes('/auth/v1/session')) {
      await fulfillJson(route, session);
      return;
    }
    if (pathname.includes('/rest/v1/profiles')) {
      await fulfillJson(route, [
        {
          id: OWNER_ID,
          role: 'owner',
          company_id: OWNER_ID,
          full_name: 'Mário Cesar',
          business_name: 'Barbearia Silva',
          business_slug: 'barbearia-silva',
          public_booking_enabled: true,
          user_type: opts.userType,
          region: 'BR',
          subscription_status: 'active',
          tutorial_completed: true,
        },
      ]);
      return;
    }
    if (pathname.includes('/rest/v1/team_members')) {
      const members = MEMBER_IDS.slice(0, opts.members).map((id, i) => ({
        id,
        name: MEMBER_NAMES[i],
        photo_url: null,
        active: true,
        staff_user_id: null,
        user_id: OWNER_ID,
        is_owner: false,
      }));
      if (search.includes(`staff_user_id=eq.${OWNER_ID}`)) {
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
      await fulfillJson(route, [{ user_id: OWNER_ID, business_hours: {} }]);
      return;
    }
    if (pathname.includes('/rest/v1/')) {
      await fulfillJson(route, []);
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}


async function openAgenda(page: Page) {
  await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('agenda-resource-grid')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId(`agenda-filter-${MEMBER_IDS[0]}`)).toBeVisible();
  await page.waitForTimeout(600);
}

async function scrollPage(page: Page, y: number) {
  await page.evaluate((top) => {
    const el = document.querySelector('[data-app-scroll]') as HTMLElement;
    el.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
  }, y);
  await page.waitForTimeout(300);
}

/** Header visível logo abaixo da barra do app, alinhado às colunas, com fundo sólido. */
async function assertStickyAligned(page: Page) {
  const r = await page.evaluate((ids) => {
    const appHeader = document.querySelector('header') as HTMLElement;
    const all = document.querySelector('[data-testid="agenda-filter-all"]') as HTMLElement;
    const strip = document.querySelector('[data-testid="agenda-grid-header"]') as HTMLElement;
    const cols = ids
      .map((id) => {
        const h = document.querySelector(`[data-testid="agenda-filter-${id}"]`) as HTMLElement | null;
        const c = document.querySelector(`[data-testid="agenda-col-${id}"]`) as HTMLElement | null;
        if (!h || !c) return null;
        const hb = h.getBoundingClientRect();
        const cb = c.getBoundingClientRect();
        return { dx: Math.abs(hb.left - cb.left), dw: Math.abs(hb.width - cb.width) };
      })
      .filter(Boolean) as { dx: number; dw: number }[];
    const sb = strip.getBoundingClientRect();
    const bg = getComputedStyle(strip).backgroundColor;
    // o que está desenhado no meio do header é o próprio header (não um slot vazando)
    const mid = document.elementFromPoint(sb.left + sb.width * 0.6, sb.top + sb.height / 2);
    return {
      appBottom: appHeader.getBoundingClientRect().bottom,
      stripTop: sb.top,
      allTop: all.getBoundingClientRect().top,
      bg,
      midInStrip: !!mid && strip.contains(mid),
      maxDx: Math.max(0, ...cols.map((c) => c.dx)),
      maxDw: Math.max(0, ...cols.map((c) => c.dw)),
    };
  }, MEMBER_IDS);
  expect(r.stripTop).toBeGreaterThanOrEqual(r.appBottom - 1);
  expect(r.stripTop).toBeLessThanOrEqual(r.appBottom + 1);
  expect(r.allTop).toBeGreaterThanOrEqual(r.appBottom - 1);
  expect(r.bg).not.toMatch(/rgba\(.*, 0\)|transparent/);
  expect(r.midInStrip).toBe(true);
  expect(r.maxDx).toBeLessThanOrEqual(1);
  expect(r.maxDw).toBeLessThanOrEqual(1);
}

const CASES = [
  { name: 'mobile-claro-salao', vp: { width: 375, height: 812 }, mode: 'light', userType: 'beauty', members: 2 },
  { name: 'mobile-escuro-barbearia', vp: { width: 375, height: 812 }, mode: 'dark', userType: 'barber', members: 2 },
  { name: 'desktop-claro-barbearia', vp: { width: 1440, height: 900 }, mode: 'light', userType: 'barber', members: 3 },
  { name: 'desktop-escuro-salao', vp: { width: 1440, height: 900 }, mode: 'dark', userType: 'beauty', members: 3 },
] as const;

for (const c of CASES) {
  test(`agenda ${c.name}: topo e rolado`, async ({ page }) => {
    await page.setViewportSize(c.vp);
    await installMocks(page, { userType: c.userType, mode: c.mode, members: c.members });
    await openAgenda(page);
    await page.screenshot({ path: `${SHOTS}/${PREFIX}-${c.name}-1-topo.png` });
    await scrollPage(page, 700);
    await page.screenshot({ path: `${SHOTS}/${PREFIX}-${c.name}-2-rolado.png` });
    if (ASSERT) await assertStickyAligned(page);
  });
}

test('mobile com 6 profissionais: header acompanha o scroll horizontal e toques funcionam', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await installMocks(page, { userType: 'barber', mode: 'light', members: 6 });
  await openAgenda(page);
  await scrollPage(page, 600);
  await page.getByTestId('agenda-resource-grid').evaluate((el) => { el.scrollLeft = 260; el.dispatchEvent(new Event('scroll')); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/${PREFIX}-mobile-6-profissionais-rolado-lateral.png` });
  if (!ASSERT) return;
  await assertStickyAligned(page);

  // Toque num profissional do header fixo filtra a coluna; Todos volta.
  await page.getByTestId(`agenda-filter-${MEMBER_IDS[2]}`).click();
  await expect(page.getByTestId(`agenda-col-${MEMBER_IDS[0]}`)).toHaveCount(0);
  await expect(page.getByTestId(`agenda-col-${MEMBER_IDS[2]}`)).toBeVisible();
  await page.getByTestId('agenda-filter-all').click();
  await expect(page.getByTestId(`agenda-col-${MEMBER_IDS[0]}`)).toHaveCount(1);

  // O primeiro slot logo abaixo do header fixo continua tocável (não fica coberto).
  await scrollPage(page, 600);
  const target = await page.evaluate(() => {
    const strip = document.querySelector('[data-testid="agenda-grid-header"]')!.getBoundingClientRect();
    const btns = [...document.querySelectorAll('[data-agenda-slot] button')] as HTMLElement[];
    const b = btns.find((x) => { const r = x.getBoundingClientRect(); return r.top > strip.bottom + 2 && r.left > 60 && r.right < window.innerWidth; });
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { label: b.getAttribute('aria-label'), hitIsSlot: !!hit && b.contains(hit) };
  });
  expect(target).not.toBeNull();
  expect(target!.hitIsSlot).toBe(true);
});
