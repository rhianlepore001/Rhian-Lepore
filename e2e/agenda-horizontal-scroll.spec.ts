/**
 * Diagnóstico — scroll horizontal lento da grade da Agenda.
 * Viewport mobile. O scroll lateral não pode “voltar” no meio do gesto.
 *
 *   npx playwright test e2e/agenda-horizontal-scroll.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = 'lcqwrngscsziysyfhpfj';
const STAFF_ID = '6fc5cf83-b7b6-4be7-9ba7-414d9d2e92f1';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const ARTIFACTS = '/opt/cursor/artifacts';

const MEMBER_IDS = [
  'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
  'cccccccc-dddd-4eee-8fff-000000000000',
  'dddddddd-eeee-4fff-9000-111111111111',
  'eeeeeeee-ffff-4000-a111-222222222222',
  'ffffffff-0000-4111-b222-333333333333',
];

const MEMBER_NAMES = ['Mário Cesar', 'Antonio Barros', 'Boiola', 'Carla Dias', 'Diego Lima', 'Eva Souza'];

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

async function installMocks(page: Page) {
  const accessToken = fakeJwt(STAFF_ID);
  const session = {
    access_token: accessToken,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: STAFF_ID,
      email: 'staff.agenda@example.test',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: 'Mário Cesar' },
      created_at: '2026-01-01T00:00:00.000Z',
    },
  };

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      navigator.serviceWorker?.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session },
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
          id: STAFF_ID,
          role: 'staff',
          company_id: OWNER_ID,
          full_name: 'Mário Cesar',
          user_type: 'beauty',
          region: 'BR',
          subscription_status: 'active',
          tutorial_completed: true,
        },
      ]);
      return;
    }
    if (pathname.includes('/rest/v1/team_members')) {
      const members = MEMBER_IDS.map((id, i) => ({
        id,
        name: MEMBER_NAMES[i],
        photo_url: null,
        active: true,
        staff_user_id: i === 0 ? STAFF_ID : null,
        user_id: OWNER_ID,
        is_owner: false,
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

test.describe('Agenda scroll horizontal lento (mobile)', () => {
  test.setTimeout(120_000);

  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  });

  test('gesto lento para o lado não puxa de volta à origem', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true });
    await installMocks(page);
    await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('agenda-resource-grid')).toBeVisible({ timeout: 30_000 });

    const grid = page.getByTestId('agenda-resource-grid');
    const metrics = await grid.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowX: getComputedStyle(el).overflowX,
      snapType: getComputedStyle(el).scrollSnapType,
    }));
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth + 80);

    await page.screenshot({
      path: path.join(ARTIFACTS, 'agenda-hscroll-before.png'),
      fullPage: false,
    });

    // Simula scroll lento (pausas > 90ms entre incrementos) — o debounce JS
    // de snap dispara no meio do gesto e puxa de volta à coluna atual.
    const slowTrace = await grid.evaluate(async (el) => {
      const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
      const samples: Array<{ i: number; afterInc: number; afterWait: number; delta: number }> = [];
      let snapBacks = 0;
      const start = el.scrollLeft;
      for (let i = 0; i < 18; i++) {
        el.scrollLeft += 14;
        const afterInc = el.scrollLeft;
        await sleep(130);
        const afterWait = el.scrollLeft;
        const delta = afterWait - afterInc;
        if (delta < -2) snapBacks += 1;
        samples.push({ i, afterInc, afterWait, delta });
      }
      return {
        start,
        end: el.scrollLeft,
        maxOverflow: el.scrollWidth - el.clientWidth,
        snapBacks,
        samples,
      };
    });

    await page.screenshot({
      path: path.join(ARTIFACTS, 'agenda-hscroll-after-slow.png'),
      fullPage: false,
    });

    fs.writeFileSync(
      path.join(ARTIFACTS, 'agenda-hscroll-trace.json'),
      JSON.stringify({ metrics, slowTrace }, null, 2),
    );

    expect(
      slowTrace.snapBacks,
      `scroll horizontal puxou de volta ${slowTrace.snapBacks} vezes no meio do gesto lento`,
    ).toBe(0);
    expect(slowTrace.end).toBeGreaterThan(slowTrace.start + 80);
  });
});
