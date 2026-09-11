import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
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
  const accessToken = fakeJwt(OWNER_ID);
  const session = {
    access_token: accessToken,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: OWNER_ID,
      email: 'owner.planos@example.test',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: 'Barbearia Silva' },
      created_at: '2026-01-01T00:00:00.000Z',
    },
  };

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem('agendix_color_mode', 'dark');
      navigator.serviceWorker?.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session },
  );

  await page.route(`**/${PROJECT_REF}.supabase.co/**`, async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

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
          full_name: 'Rhian',
          business_name: 'Barbearia Silva',
          user_type: 'barber',
          region: 'BR',
          subscription_status: 'trial',
          subscription_plan: null,
          trial_ends_at: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
          tutorial_completed: true,
        },
      ]);
      return;
    }
    if (pathname.includes('/rest/v1/onboarding_progress')) {
      await fulfillJson(route, [{ is_completed: true, company_id: OWNER_ID }]);
      return;
    }
    if (pathname.includes('/rest/v1/')) {
      await fulfillJson(route, []);
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test.describe('Planos AgendiX — Solo e Equipe', () => {
  test.setTimeout(90_000);

  test('mostra copy de decisão nos cards Solo e Equipe', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true });
    await page.setViewportSize({ width: 1280, height: 1600 });
    await installMocks(page);
    await page.goto(`${BASE}/#/configuracoes/assinatura`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Escolha o plano da sua casa' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Para quem atende sozinho.')).toBeVisible();
    await expect(page.getByText('Para quem tem 2 a 5 profissionais.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assinar Solo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assinar Equipe' })).toBeVisible();
    await expect(page.getByText('Quem chega sem hora entra pelo QR, vê a vez e pode pagar no Pix')).toBeVisible();
    await expect(page.getByText(/Stripe/i)).toHaveCount(0);

    await page.screenshot({
      path: path.join(ARTIFACTS, 'planos-assinatura-desktop.png'),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: 'Escolha o plano da sua casa' })).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACTS, 'planos-assinatura-mobile.png'),
      fullPage: true,
    });
  });
});
