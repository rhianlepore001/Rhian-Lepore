/**
 * E2E — Agenda do colaborador: filtro "Todos" igual ao gestor
 *
 * Staff entra com Todos ativo; pode filtrar só o próprio perfil.
 * Usa mocks de auth/API (não exige E2E_STAFF_*).
 *
 *   npx playwright test e2e/staff-agenda-filter.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = 'lcqwrngscsziysyfhpfj';
const STAFF_ID = '6fc5cf83-b7b6-4be7-9ba7-414d9d2e92f1';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const SELF_MEMBER_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const OTHER_MEMBER_ID = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
const ARTIFACTS = '/opt/cursor/artifacts';

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
    email: 'staff.agenda@example.test',
  });
  return `${header}.${payload}.e2e-fake-sig`;
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  const accept = route.request().headers()['accept'] || '';
  const wantsObject = accept.includes('vnd.pgrst.object+json');
  const payload =
    wantsObject && Array.isArray(body)
      ? (body[0] ?? null)
      : body;

  await route.fulfill({
    status: wantsObject && payload === null ? 406 : status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

async function installStaffAgendaMocks(page: Page) {
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
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session },
  );

  await page.route(`**/${PROJECT_REF}.supabase.co/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;
    const search = url.search;

    if (pathname.includes('/auth/v1/user') || pathname.endsWith('/auth/v1/user')) {
      await fulfillJson(route, session.user);
      return;
    }

    if (pathname.includes('/auth/v1/token') || pathname.includes('/auth/v1/session')) {
      await fulfillJson(route, session);
      return;
    }

    if (pathname.includes('/rest/v1/profiles')) {
      if (search.includes(`id=eq.${OWNER_ID}`)) {
        await fulfillJson(route, [
          {
            id: OWNER_ID,
            role: 'owner',
            company_id: OWNER_ID,
            full_name: 'Rhian Owner',
            business_name: 'Barbearia Silva',
            user_type: 'beauty',
            region: 'BR',
            subscription_status: 'active',
            trial_ends_at: null,
            tutorial_completed: true,
            aios_enabled: false,
            photo_url: null,
          },
        ]);
        return;
      }
      await fulfillJson(route, [
        {
          id: STAFF_ID,
          role: 'staff',
          company_id: OWNER_ID,
          full_name: 'Mário Cesar',
          business_name: null,
          user_type: 'beauty',
          region: 'BR',
          subscription_status: 'active',
          trial_ends_at: null,
          tutorial_completed: true,
          aios_enabled: false,
          photo_url: null,
        },
      ]);
      return;
    }

    if (pathname.includes('/rest/v1/team_members')) {
      const self = {
        id: SELF_MEMBER_ID,
        name: 'Mário Cesar',
        photo_url: null,
        active: true,
        staff_user_id: STAFF_ID,
        user_id: OWNER_ID,
        is_owner: false,
      };
      const other = {
        id: OTHER_MEMBER_ID,
        name: 'Antonio Barros',
        photo_url: null,
        active: true,
        staff_user_id: null,
        user_id: OWNER_ID,
        is_owner: false,
      };
      // AuthContext resolve teamMemberId com filtro staff_user_id + maybeSingle
      if (search.includes(`staff_user_id=eq.${STAFF_ID}`)) {
        await fulfillJson(route, [self]);
        return;
      }
      await fulfillJson(route, [self, other]);
      return;
    }

    if (pathname.includes('/rest/v1/onboarding_progress')) {
      await fulfillJson(route, [{ is_completed: true }]);
      return;
    }

    if (pathname.includes('/rest/v1/business_settings')) {
      await fulfillJson(route, [
        {
          user_id: OWNER_ID,
          business_hours: {},
          public_booking_enabled: true,
          machine_fee_enabled: false,
          debit_fee_percent: 0,
          credit_fee_percent: 0,
        },
      ]);
      return;
    }

    if (pathname.includes('/rest/v1/appointments')) {
      await fulfillJson(route, []);
      return;
    }

    if (pathname.includes('/rest/v1/')) {
      await fulfillJson(route, []);
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test.describe('Agenda staff — filtro Todos', () => {
  test.setTimeout(120_000);

  test('entra em Todos e permite filtrar só o próprio', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await installStaffAgendaMocks(page);

    await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Agenda/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    const todos = page.getByTestId('agenda-filter-all');
    await expect(todos).toBeVisible({ timeout: 20_000 });
    await expect(todos).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/Antonio/i).first()).toBeVisible();
    // Badge "Você" quando teamMemberId resolve; senão mostra o primeiro nome
    const selfLabel = page.getByText('Você', { exact: true }).or(page.getByText('Mário', { exact: true }));
    await expect(selfLabel.first()).toBeVisible();

    await expect(page.getByTestId('agenda-resource-grid')).toBeVisible();
    await expect(page.getByTestId('agenda-status-legend')).toHaveCount(0);
    await expect(page.getByTestId(`agenda-col-${SELF_MEMBER_ID}`)).toBeVisible();
    await expect(page.getByTestId(`agenda-col-${OTHER_MEMBER_ID}`)).toBeVisible();
    await expect(page.getByRole('button', { name: /Novo agendamento às/i }).first()).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACTS, 'staff-agenda-todos-default.png'),
      fullPage: false,
    });

    await page.getByTestId(`agenda-filter-${SELF_MEMBER_ID}`).click();
    await expect(todos).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId(`agenda-filter-${SELF_MEMBER_ID}`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByTestId(`agenda-col-${SELF_MEMBER_ID}`)).toBeVisible();
    await expect(page.getByTestId(`agenda-col-${OTHER_MEMBER_ID}`)).toHaveCount(0);
    await expect(page.getByTestId('agenda-filter-add')).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACTS, 'staff-agenda-filtro-proprio.png'),
      fullPage: false,
    });

    await page.getByTestId('agenda-filter-add').click();
    await expect(page.getByTestId('agenda-add-menu')).toBeVisible();
    await page.getByTestId(`agenda-add-${OTHER_MEMBER_ID}`).click();
    await expect(page.getByTestId(`agenda-col-${OTHER_MEMBER_ID}`)).toBeVisible();
    await expect(page.getByTestId(`agenda-col-${SELF_MEMBER_ID}`)).toBeVisible();

    await todos.click();
    await expect(todos).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId(`agenda-col-${OTHER_MEMBER_ID}`)).toBeVisible();
    await expect(page.getByTestId(`agenda-col-${SELF_MEMBER_ID}`)).toBeVisible();

    await page.getByRole('button', { name: /Novo agendamento às 09:00 com Antonio/i }).click();
    await expect(page.getByText(/Quem será atendido|Novo Atendimento/i).first()).toBeVisible({
      timeout: 8_000,
    });
    await page.screenshot({
      path: path.join(ARTIFACTS, 'staff-agenda-slot-wizard.png'),
      fullPage: false,
    });
    await page.keyboard.press('Escape');

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByTestId('agenda-resource-grid')).toBeVisible();
    await expect(page.getByTestId(`agenda-col-${SELF_MEMBER_ID}`)).toBeVisible();
    await expect(page.getByTestId(`agenda-col-${OTHER_MEMBER_ID}`)).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACTS, 'staff-agenda-desktop-grid.png'),
      fullPage: false,
    });
  });
});
