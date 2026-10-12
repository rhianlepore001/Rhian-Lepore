/**
 * E2E — cadastro de dono / dono órfão / tela de nova versão, com Supabase 100% mockado
 * (nenhuma requisição a produção).
 *
 *   VITE_SUPABASE_URL=http://127.0.0.1:59999 VITE_SUPABASE_ANON_KEY=fake npx vite --port 3418
 *   E2E_BASE_URL=http://127.0.0.1:3418 npx playwright test e2e/owner-signup-profile.spec.ts --project=chromium-legacy
 *
 * O mock imita o banco depois da correção: o cliente NÃO tem INSERT em profiles (42501) e o
 * perfil só aparece via ensure_owner_profile.
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const SHOTS = process.env.SHOTS_DIR || '/workspace/screens/signup-fix';
const UID = '0a000000-0000-4000-8000-0000000000e2';
const EMAIL = 'novo.dono@exemplo.com';

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = () => {
  const now = Math.floor(Date.now() / 1000);
  return [b64url({ alg: 'HS256', typ: 'JWT' }), b64url({ sub: UID, email: EMAIL, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + 3600, session_id: 's' }), 'x'].join('.');
};

interface DbState {
  profile: Record<string, unknown> | null;
  onboardingCompleted: boolean;
  ensureCalls: number;
  directProfileInserts: number;
  hosts: Set<string>;
}

async function mockBackend(page: Page, state: DbState) {
  const meta = { full_name: 'Rafael Teste', business_name: 'Oliveira cortes', user_type: 'barber', region: 'BR', phone: '11999999999', role: 'owner' };
  const user = { id: UID, aud: 'authenticated', role: 'authenticated', email: EMAIL, email_confirmed_at: '2026-10-12T10:00:00Z', app_metadata: { provider: 'email' }, user_metadata: meta, created_at: '2026-10-12T10:00:00Z' };
  const session = () => ({ access_token: token(), refresh_token: 'rt', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user });
  page.on('request', (r) => { try { state.hosts.add(new URL(r.url()).host); } catch { /* */ } });

  await page.route(/\/auth\/v1\//, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/.*\/auth\/v1/, '');
    const json = (s: number, b: unknown) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
    if (path === '/signup') return json(200, session()); // autoconfirm ligado (como em prod)
    if (path === '/token') return json(200, session());
    if (path === '/user') return json(200, user);
    if (path === '/logout') return route.fulfill({ status: 204, body: '' });
    return json(200, {});
  });

  await page.route(/\/rest\/v1\//, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname.replace(/.*\/rest\/v1/, '');
    const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const json = (s: number, b: unknown) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });

    if (p === '/rpc/ensure_owner_profile') {
      state.ensureCalls++;
      if (state.profile) return json(200, { status: 'exists', role: 'owner', business_settings_created: false });
      state.profile = { id: UID, role: 'owner', company_id: UID, user_type: 'barber', region: 'BR', business_name: meta.business_name, full_name: meta.full_name, subscription_status: 'trial', trial_ends_at: '2026-11-01T10:00:00Z', tutorial_completed: false, aios_enabled: true };
      return json(200, { status: 'created', role: 'owner' });
    }
    if (p === '/profiles' && req.method() === 'POST') {
      state.directProfileInserts++;
      return json(403, { code: '42501', message: 'permission denied for table profiles' });
    }
    if (p === '/profiles' && req.method() === 'GET') {
      if (single) return state.profile ? json(200, state.profile) : json(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: 'The result contains 0 rows' });
      return json(200, state.profile ? [state.profile] : []);
    }
    if (p === '/onboarding_progress' && req.method() === 'GET') {
      const row = { is_completed: state.onboardingCompleted, current_step: state.onboardingCompleted ? 5 : 1, completed_steps: [], step_data: {}, company_id: UID };
      return single ? json(200, row) : json(200, [row]);
    }
    if (p.startsWith('/rpc/')) return json(200, null);
    if (req.method() !== 'GET') return json(201, single ? {} : []);
    return json(200, single ? {} : []);
  });
}

const freshState = (): DbState => ({ profile: null, onboardingCompleted: false, ensureCalls: 0, directProfileInserts: 0, hosts: new Set() });
const noProdTraffic = (s: DbState) => expect([...s.hosts].filter((h) => h.endsWith('.supabase.co'))).toEqual([]);

test.use({ viewport: { width: 375, height: 812 } });

test('cadastro de dono novo: perfil via ensure_owner_profile e cai no onboarding', async ({ page }) => {
  const state = freshState();
  await mockBackend(page, state);
  await page.goto(`${BASE}/#/register`);
  await page.getByTestId('category-barber').click();
  await page.locator('#reg-name').fill('Rafael Teste');
  await page.getByLabel('Nome do negócio').fill('Oliveira cortes');
  await page.locator('#reg-email').fill(EMAIL);
  const phone = page.getByLabel(/telefone|whatsapp/i).first();
  if (await phone.count()) await phone.fill('11999999999');
  await page.getByLabel('Senha', { exact: true }).fill('Senha@Forte1');
  await page.getByLabel('Confirmar senha').fill('Senha@Forte1');
  const terms = page.getByRole('checkbox');
  if (await terms.count()) await terms.first().check();
  await page.locator('form button[type="submit"]').click();

  await page.waitForURL(/#\/onboarding-wizard/, { timeout: 20000 });
  await expect(page.getByText(/Sistema Interrompido/i)).toHaveCount(0);
  expect(state.ensureCalls).toBeGreaterThanOrEqual(1);
  expect(state.directProfileInserts).toBe(0);
  expect(state.profile).not.toBeNull();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/01-cadastro-concluido-onboarding.png` });
  noProdTraffic(state);
});

test('login de dono órfão (onboarding já concluído, sem perfil): cai no app sem loop', async ({ page }) => {
  const state = freshState();
  state.onboardingCompleted = true; // caso do lead: wizard concluído, perfil nunca criado
  await mockBackend(page, state);
  const navs: string[] = [];
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) navs.push(f.url()); });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(`${BASE}/#/login`);
  await page.getByRole('button', { name: 'Acessar painel para barbearias' }).click();
  await page.getByLabel('E-mail').fill(EMAIL);
  await page.getByLabel('Senha', { exact: true }).fill('Senha@Forte1');
  await page.locator('form button[type="submit"]').click();

  await expect.poll(() => state.ensureCalls, { timeout: 15000 }).toBeGreaterThanOrEqual(1);
  await page.waitForTimeout(2500);
  expect(page.url()).not.toMatch(/onboarding-wizard|login/);
  await expect(page.getByText(/Sistema Interrompido/i)).toHaveCount(0);
  expect(errors.filter((e) => /SecurityError|replaceState/.test(e))).toEqual([]);
  expect(navs.length).toBeLessThan(10);
  expect(state.ensureCalls).toBe(1);
  await page.screenshot({ path: `${SHOTS}/02-login-orfao-no-app.png` });
  noProdTraffic(state);
});

test('chunk de deploy antigo: 1 reload automático e depois tela "Nova versão disponível"', async ({ page }) => {
  const state = freshState();
  state.onboardingCompleted = true;
  state.profile = { id: UID, role: 'owner', company_id: UID, user_type: 'barber', region: 'BR', business_name: 'Oliveira cortes', full_name: 'Rafael Teste', subscription_status: 'trial', trial_ends_at: '2026-11-01T10:00:00Z', tutorial_completed: true, aios_enabled: true };
  await mockBackend(page, state);
  let aborted = 0;
  await page.route(/\/pages\/Clients\.tsx|\/assets\/Clients-[^/]+\.js/, (r) => { aborted++; return r.abort('failed'); });
  let loads = 0;
  page.on('load', () => loads++);

  await page.goto(`${BASE}/#/login`);
  await page.getByRole('button', { name: 'Acessar painel para barbearias' }).click();
  await page.getByLabel('E-mail').fill(EMAIL);
  await page.getByLabel('Senha', { exact: true }).fill('Senha@Forte1');
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((u) => !/login|onboarding/.test(u.hash), { timeout: 15000 });
  const loadsBefore = loads;
  await page.evaluate(() => { window.location.hash = '#/clientes'; });

  await expect(page.getByTestId('new-version-screen')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1500);
  expect(loads - loadsBefore).toBe(1); // exatamente um reload automático, sem loop
  expect(aborted).toBeGreaterThanOrEqual(2);
  await expect(page.getByText(/Sistema Interrompido/i)).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/03-nova-versao-disponivel.png` });
  noProdTraffic(state);
});
