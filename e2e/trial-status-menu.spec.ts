/**
 * E2E — status do período de teste no menu (sem banner no topo), Supabase 100% mockado.
 *
 *   VITE_SUPABASE_URL=http://127.0.0.1:59999 VITE_SUPABASE_ANON_KEY=fake npx vite --port 3419
 *   E2E_BASE_URL=http://127.0.0.1:3419 npx playwright test e2e/trial-status-menu.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const SHOTS = process.env.SHOTS_DIR || '/workspace/screens/trial30';
const UID = '0b000000-0000-4000-8000-0000000000e3';
const EMAIL = 'dono.promo@exemplo.com';
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = () => {
  const now = Math.floor(Date.now() / 1000);
  return [b64url({ alg: 'HS256', typ: 'JWT' }), b64url({ sub: UID, email: EMAIL, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + 3600 }), 'x'].join('.');
};

async function mockBackend(page: Page, userType: 'barber' | 'beauty', trialDays: number) {
  const user = { id: UID, aud: 'authenticated', role: 'authenticated', email: EMAIL, email_confirmed_at: '2026-10-12T10:00:00Z', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-10-12T10:00:00Z' };
  const session = () => ({ access_token: token(), refresh_token: 'rt', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user });
  const profile = {
    id: UID, role: 'owner', company_id: UID, user_type: userType, region: 'BR',
    business_name: userType === 'beauty' ? 'Studio Aurora' : 'Oliveira cortes', full_name: 'Rafael Teste',
    subscription_status: 'trial', trial_ends_at: new Date(Date.now() + trialDays * 86400000 - 3600000).toISOString(),
    tutorial_completed: true, aios_enabled: true,
  };
  const hosts = new Set<string>();
  page.on('request', (r) => { try { hosts.add(new URL(r.url()).host); } catch { /* */ } });
  await page.route(/\/auth\/v1\//, async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/.*\/auth\/v1/, '');
    const json = (s: number, b: unknown) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
    if (path === '/token') return json(200, session());
    if (path === '/user') return json(200, user);
    return json(200, {});
  });
  await page.route(/\/rest\/v1\//, async (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname.replace(/.*\/rest\/v1/, '');
    const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const json = (s: number, b: unknown) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
    if (p === '/profiles') return single ? json(200, profile) : json(200, [profile]);
    if (p === '/onboarding_progress') { const r = { is_completed: true, current_step: 5, company_id: UID }; return single ? json(200, r) : json(200, [r]); }
    if (p.startsWith('/rpc/')) return json(200, null);
    return json(200, single ? {} : []);
  });
  return hosts;
}

async function login(page: Page, userType: 'barber' | 'beauty') {
  await page.goto(`${BASE}/#/login`);
  await page.getByRole('button', { name: userType === 'beauty' ? 'Acessar painel para salões de beleza' : 'Acessar painel para barbearias' }).click();
  await page.getByLabel('E-mail').fill(EMAIL);
  await page.getByLabel('Senha', { exact: true }).fill('Senha@Forte1');
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((u) => !/login|onboarding/.test(u.hash), { timeout: 15000 });
}

for (const userType of ['barber', 'beauty'] as const) {
  test.describe(`${userType}`, () => {
    test(`celular 375px: sem banner no topo, status no menu lateral (${userType})`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      const hosts = await mockBackend(page, userType, 30);
      await login(page, userType);
      await page.waitForTimeout(800);
      await expect(page.getByText(/teste grátis/i)).toHaveCount(0);
      await expect(page.locator('[data-testid="trial-status"]:visible')).toHaveCount(0); // fora do menu, nada visível
      await page.screenshot({ path: `${SHOTS}/mobile-${userType}-1-sem-banner.png` });

      await page.getByRole('button', { name: 'Mais opções' }).click();
      const card = page.getByRole('dialog', { name: 'Menu de navegação' }).getByTestId('trial-status');
      await expect(card).toBeVisible();
      await expect(card).toContainText('Período de teste');
      await expect(card).toContainText('30 dias restantes');
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/mobile-${userType}-2-menu-lateral.png` });

      await card.getByRole('button', { name: /Assinar/ }).click();
      await page.waitForURL(/configuracoes\/assinatura/);
      await expect(page.getByRole('dialog', { name: 'Menu de navegação' })).toHaveCount(0);
      expect([...hosts].filter((h) => h.endsWith('.supabase.co'))).toEqual([]);
    });

    test(`desktop: status compacto na sidebar (${userType})`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const hosts = await mockBackend(page, userType, 30);
      await login(page, userType);
      const card = page.locator('aside').getByTestId('trial-status');
      await expect(card).toBeVisible();
      await expect(card).toContainText('30 dias restantes');
      await expect(page.getByText(/teste grátis/i)).toHaveCount(0);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${SHOTS}/desktop-${userType}-sidebar.png` });
      await card.screenshot({ path: `${SHOTS}/desktop-${userType}-cartao.png` });
      expect([...hosts].filter((h) => h.endsWith('.supabase.co'))).toEqual([]);
    });
  });
}

test('celular: últimos 2 dias destacam o cartão (warning)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockBackend(page, 'barber', 2);
  await login(page, 'barber');
  await page.getByRole('button', { name: 'Mais opções' }).click();
  const card = page.getByRole('dialog', { name: 'Menu de navegação' }).getByTestId('trial-status');
  await expect(card).toHaveAttribute('data-tone', 'warning');
  await page.waitForTimeout(400);
  await card.screenshot({ path: `${SHOTS}/mobile-barber-3-cartao-2-dias.png` });
});
