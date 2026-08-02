/**
 * E2E — Meus Insights do colaborador: sem faturamento bruto
 *
 * Valida que a UI mostra quantidade + comissão, nunca preço/receita bruta
 * de serviços ou produtos.
 *
 * Roda com mocks de auth/API (não exige E2E_STAFF_*).
 *
 *   npx playwright test e2e/staff-insights-privacy.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = 'lcqwrngscsziysyfhpfj';
const STAFF_ID = '6fc5cf83-b7b6-4be7-9ba7-414d9d2e92f1';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const TEAM_MEMBER_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
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
    email: 'marioceros@example.test',
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

async function installStaffMocks(page: Page) {
  const accessToken = fakeJwt(STAFF_ID);
  const session = {
    access_token: accessToken,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: STAFF_ID,
      email: 'marioceros@example.test',
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
      if (search.includes(`id=eq.${OWNER_ID}`) || search.includes(`id=eq.${OWNER_ID}`)) {
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
      await fulfillJson(route, [{ id: TEAM_MEMBER_ID, name: 'Mário Cesar', active: true }]);
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
        },
      ]);
      return;
    }

    if (pathname.includes('/rest/v1/appointments')) {
      const decoded = decodeURIComponent(search);
      if (decoded.includes('Completed')) {
        await fulfillJson(route, [
        {
          id: 'apt-1',
          service: 'Corte degradê',
          price: 80,
          appointment_time: '2026-08-01T14:00:00',
          status: 'Completed',
          clients: { name: 'João Cliente' },
          finance_records: [{ id: 'fr-1', commission_value: 32, type: 'revenue' }],
        },
        {
          id: 'apt-2',
          service: 'Barba',
          price: 40,
          appointment_time: '2026-08-01T15:00:00',
          status: 'Completed',
          clients: { name: 'Pedro' },
          finance_records: [{ id: 'fr-2', commission_value: 16, type: 'revenue' }],
        },
        {
          id: 'apt-3',
          service: 'Corte degradê',
          price: 80,
          appointment_time: '2026-08-02T10:00:00',
          status: 'Completed',
          clients: { name: 'Ana' },
          finance_records: [{ id: 'fr-3', commission_value: 32, type: 'revenue' }],
        },
      ]);
        return;
      }

      await fulfillJson(route, [
        {
          id: 'apt-today-1',
          service: 'Corte degradê',
          appointment_time: new Date().toISOString().replace(/T.*/, 'T18:30:00'),
          status: 'Confirmed',
          clients: { name: 'João Cliente' },
        },
      ]);
      return;
    }

    if (pathname.includes('/rest/v1/product_sales')) {
      await fulfillJson(route, [
        {
          id: 'sale-1',
          created_at: '2026-08-01T16:00:00',
          quantity: 2,
          total_revenue: 90,
          commission_value: 9,
          finance_record_id: 'fr-prod-1',
          products: { id: 'p1', name: 'Pomada Black', stock_quantity: 12 },
          clients: { name: 'João Cliente' },
        },
        {
          id: 'sale-2',
          created_at: '2026-08-02T11:00:00',
          quantity: 1,
          total_revenue: 45,
          commission_value: 4.5,
          finance_record_id: 'fr-prod-2',
          products: { id: 'p1', name: 'Pomada Black', stock_quantity: 11 },
          clients: null,
        },
      ]);
      return;
    }

    if (pathname.includes('/rest/v1/finance_records')) {
      await fulfillJson(route, [
        { commission_value: 32 },
        { commission_value: 16 },
        { commission_value: 32 },
        { commission_value: 9 },
        { commission_value: 4.5 },
      ]);
      return;
    }

    // Demais endpoints do tenant: vazio seguro
    if (pathname.includes('/rest/v1/')) {
      await fulfillJson(route, []);
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test.describe('Staff Insights — privacidade de faturamento', () => {
  test.setTimeout(120_000);

  test('mostra quantidade e comissão, sem valor bruto', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await installStaffMocks(page);

    await page.goto(`${BASE}/#/meus-insights`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Meus Resultados/i })).toBeVisible({
      timeout: 30_000,
    });

    // Dados mockados devem aparecer
    await expect(page.getByText('Meus serviços')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Produtos vendidos')).toBeVisible();
    await expect(page.getByText('Corte degradê').first()).toBeVisible();
    await expect(page.getByText('Pomada Black').first()).toBeVisible();

    // Comissões (valores financeiros permitidos) — aparecem
    await expect(page.getByText('Comissões').first()).toBeVisible();
    await expect(page.getByText('só a sua comissão')).toBeVisible();

    const bodyText = await page.locator('main').innerText();

    // Não pode vazar faturamento bruto dos mocks (80, 40, 90, 45)
    expect(bodyText).not.toMatch(/R\$\s*80([.,]00)?/);
    expect(bodyText).not.toMatch(/R\$\s*40([.,]00)?/);
    expect(bodyText).not.toMatch(/R\$\s*90([.,]00)?/);
    expect(bodyText).not.toMatch(/R\$\s*45([.,]00)?/);
    expect(bodyText.toLowerCase()).not.toContain('ticket');
    expect(bodyText.toLowerCase()).not.toContain('faturamento');

    // Quantidades devem aparecer
    expect(bodyText).toMatch(/2×|2x/i);
    expect(bodyText).toMatch(/3\s*un\.|un\./i);

    const topShot = path.join(ARTIFACTS, 'staff-insights-privacy-top.png');
    await page.screenshot({ path: topShot, fullPage: false });

    await page.getByText('Produtos vendidos').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const productsShot = path.join(ARTIFACTS, 'staff-insights-privacy-products.png');
    await page.screenshot({ path: productsShot, fullPage: false });

    const fullShot = path.join(ARTIFACTS, 'staff-insights-privacy-full.png');
    await page.screenshot({ path: fullShot, fullPage: true });

    // Sanity: artefatos gravados
    expect(fs.existsSync(topShot)).toBeTruthy();
    expect(fs.existsSync(productsShot)).toBeTruthy();
  });
});
