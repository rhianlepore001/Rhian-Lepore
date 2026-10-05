/**
 * Theme check — AgendaMonthPicker em barber/beauty × light/dark (390).
 * Mocks; força user_type + data-theme. Sem escrita em prod.
 *
 *   E2E_SHOTS_DIR=/workspace/agenda-month-shots npx playwright test e2e/agenda-month-theme-check.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installProdWriteGuard, type ProdWriteGuard } from './helpers/prodWriteGuard';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = process.env.E2E_SUPABASE_REF || 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const ARTIFACTS = process.env.E2E_SHOTS_DIR || '/workspace/agenda-month-shots';

type ThemeId = 'barber' | 'beauty';
type Mode = 'light' | 'dark';

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function fakeSession(fullName: string) {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub: OWNER_ID, role: 'authenticated', aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 86400, email: 'owner@example.test',
  });
  return {
    access_token: `${header}.${payload}.e2e-fake-sig`,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: OWNER_ID, email: 'owner@example.test', aud: 'authenticated', role: 'authenticated',
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

async function stubTheme(page: Page, guard: ProdWriteGuard, theme: ThemeId, mode: Mode) {
  const name = theme === 'barber' ? 'Barbearia Silva' : 'Studio AgendiX';
  const session = fakeSession(theme === 'barber' ? 'Bob Barber' : 'Rhian Beauty');
  await page.addInitScript(
    ({ key, value, colorMode, themeId }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem('agendix_color_mode', colorMode);
      document.documentElement.setAttribute('data-mode', colorMode);
      document.documentElement.setAttribute('data-theme', themeId);
      void navigator.serviceWorker?.getRegistrations?.().then((rs) => rs.forEach((r) => r.unregister()));
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session, colorMode: mode, themeId: theme },
  );

  await page.route(/\.supabase\.co\/(auth|rest)\//, async (route) => {
    const req = route.request();
    const pathname = new URL(req.url()).pathname;
    if (pathname.includes('/auth/v1/user') || pathname.includes('/auth/v1/token')) {
      await fulfillJson(route, pathname.includes('/auth/v1/user') ? session.user : session);
      return;
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method())) {
      await route.fallback();
      return;
    }
    if (pathname.includes('/rest/v1/profiles')) {
      await fulfillJson(route, [{
        id: OWNER_ID, role: 'owner', company_id: OWNER_ID, full_name: session.user.user_metadata.full_name,
        business_name: name, business_slug: theme === 'barber' ? 'barbeariasilva' : 'studio-agendix',
        public_booking_enabled: true, user_type: theme, region: 'BR',
        subscription_status: 'active', tutorial_completed: true,
      }]);
      return;
    }
    if (pathname.includes('/rest/v1/team_members')) {
      await fulfillJson(route, [{
        id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', name: 'Mário Cesar',
        photo_url: null, active: true, staff_user_id: null, user_id: OWNER_ID, is_owner: true,
      }]);
      return;
    }
    if (pathname.includes('/rest/v1/onboarding_progress')) {
      await fulfillJson(route, [{ is_completed: true }]);
      return;
    }
    if (pathname.includes('/rest/v1/business_settings')) {
      await fulfillJson(route, [{ user_id: OWNER_ID, timezone: 'Europe/Lisbon', business_hours: {} }]);
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
  guard.stubRpc('generate_commission_reminders_v1', { body: { inserted: 0 } });
}

async function assertPanelTokens(page: Page, theme: ThemeId, mode: Mode) {
  const panel = page.getByTestId('agenda-month-picker');
  await expect(panel).toBeVisible();
  const tokens = await panel.evaluate((el) => {
    const root = document.documentElement;
    const cs = getComputedStyle(el);
    const cell = el.querySelector('[data-testid="agenda-month-0"]') as HTMLElement;
    const cellCs = getComputedStyle(cell);
    return {
      theme: root.getAttribute('data-theme'),
      mode: root.getAttribute('data-mode'),
      accent: getComputedStyle(root).getPropertyValue('--color-accent').trim(),
      surface: getComputedStyle(root).getPropertyValue('--color-surface').trim(),
      card: getComputedStyle(root).getPropertyValue('--color-card').trim(),
      panelBg: cs.backgroundColor,
      cellBg: cellCs.backgroundColor,
    };
  });
  expect(tokens.theme).toBe(theme);
  expect(tokens.mode).toBe(mode);
  // Célula não selecionada não deve pintar com a surface (bug "estourado").
  // Compara RGB aproximado: cellBg não deve ser igual à surface fill.
  const surfaceRgb = await page.evaluate((surfaceHex) => {
    const d = document.createElement('div');
    d.style.backgroundColor = surfaceHex;
    document.body.appendChild(d);
    const rgb = getComputedStyle(d).backgroundColor;
    d.remove();
    return rgb;
  }, tokens.surface);
  expect(
    tokens.cellBg,
    `${theme}/${mode}: célula sem fill de surface (${surfaceRgb})`,
  ).not.toBe(surfaceRgb);
  // Accent do salão é roxo; barbearia é oliva/dourado — só sanity.
  if (theme === 'beauty') expect(tokens.accent.toLowerCase()).toMatch(/#?(a78bfa|6d28d9)/i);
  if (theme === 'barber') expect(tokens.accent.toLowerCase()).toMatch(/#?(c9a24a|6b5010)/i);
  return tokens;
}

test.describe('Agenda month picker theme check', () => {
  test.setTimeout(180_000);
  test.use({ viewport: { width: 390, height: 844 } });

  for (const theme of ['barber', 'beauty'] as const) {
    for (const mode of ['light', 'dark'] as const) {
      test(`${theme} ${mode}: painel aberto sem surface fill nas células`, async ({ page }) => {
        const guard = await installProdWriteGuard(page);
        await stubTheme(page, guard, theme, mode);
        await page.goto(`${BASE}/#/agenda?date=2026-10-05`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('agenda-month-trigger')).toBeVisible({ timeout: 30_000 });
        await page.getByTestId('agenda-month-trigger').click();
        await assertPanelTokens(page, theme, mode);
        fs.mkdirSync(ARTIFACTS, { recursive: true });
        await page.screenshot({
          path: path.join(ARTIFACTS, `theme-check-${theme}-${mode}-390-open.png`),
          fullPage: false,
        });
        await page.keyboard.press('Escape');
        await page.screenshot({
          path: path.join(ARTIFACTS, `theme-check-${theme}-${mode}-390-closed.png`),
          fullPage: false,
        });
        guard.assertNoLeak();
      });
    }
  }
});
