/**
 * E2E Finance PR-B — Performance da equipe e Meus resultados.
 * Mocks de rede (fixtures locais). Sem escrita em prod.
 *
 *   npx playwright test e2e/fin-b-performance.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installProdWriteGuard } from './helpers/prodWriteGuard';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = process.env.E2E_SUPABASE_REF || 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const STAFF_USER_ID = '6fc5cf83-b7b6-4be7-9ba7-414d9d2e92f1';
const ANA = '20000000-0000-0000-0000-0000000000a1';
const ARTIFACTS = '/opt/cursor/artifacts/screenshots/fin-b';
const NOW = '2026-10-04T15:00:00.000Z';
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
] as const;
const THEMES = [
  { name: 'dark', userType: 'barber', mode: 'dark' },
  { name: 'light', userType: 'beauty', mode: 'light' },
] as const;
const PERF_FILE = path.join(ARTIFACTS, 'perf.json');

const team = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/staffPerformance/team.json'), 'utf8')) as Record<string, unknown>;
const detail = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/staffPerformance/detail.json'), 'utf8')) as Record<string, unknown>;
const staff = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/staffPerformance/staff.json'), 'utf8')) as Record<string, unknown>;

function withPeriod(payload: Record<string, unknown>, start: string, end: string): Record<string, unknown> {
  const prevStart = start.slice(0, 8) === '2026-10-' ? '2026-09-01' : '2026-08-01';
  const prevEnd = start.slice(0, 8) === '2026-10-' ? '2026-09-30' : '2026-08-31';
  const period = {
    ...((payload.period as Record<string, unknown>) ?? {}),
    start,
    end,
    previous: { start: prevStart, end: prevEnd },
  };
  return { ...payload, period };
}

function emptyTeam(start: string, end: string): Record<string, unknown> {
  const t = structuredClone(team) as {
    members: Array<{ rank: number | null; eligible: boolean; metrics: Record<string, unknown> }>;
    team_totals: Record<string, unknown>;
    unassigned: unknown;
    ranking_available: boolean;
  };
  t.members = t.members.map((m) => ({
    ...m,
    rank: null,
    eligible: false,
    metrics: {
      ...m.metrics,
      atendimentos: 0,
      vendas_produtos: 0,
      avulsos: 0,
      retorno: null,
      retorno_por_hora: null,
      ticket_medio: null,
    },
  }));
  t.team_totals = { ...t.team_totals, atendimentos: 0, vendas_produtos: 0, avulsos: 0, retorno: null };
  t.unassigned = null;
  t.ranking_available = false;
  return withPeriod(t as unknown as Record<string, unknown>, start, end);
}

function emptyStaff(start: string, end: string): Record<string, unknown> {
  const s = structuredClone(staff) as { me: { metrics: Record<string, unknown> } };
  s.me.metrics = {
    ...s.me.metrics,
    atendimentos: 0,
    vendas_produtos: 0,
    atendimentos_pagos: 0,
    ticket_medio: null,
    faturamento_por_hora: null,
    comissao_periodo: 0,
  };
  return withPeriod(s as unknown as Record<string, unknown>, start, end);
}

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function fakeJwt(sub: string, email: string): string {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    email,
  });
  return `${header}.${payload}.e2e-fake-sig`;
}

function fakeSession(userId: string, email: string, fullName: string) {
  const accessToken = fakeJwt(userId, email);
  return {
    access_token: accessToken,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: userId,
      email,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: fullName },
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

async function settle(page: Page) {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation: none !important;
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition: none !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      caret-color: transparent !important;
    }`,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) active.blur();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
  await page.waitForTimeout(250);
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await settle(page);
  await page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`), fullPage: false });
}

function pageScroller(page: Page) {
  return page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((node) => {
      const c = typeof node.className === 'string' ? node.className : '';
      return c.includes('overflow-y-auto') && c.includes('h-[100dvh]');
    }) as HTMLElement | undefined;
    const target = el ?? document.scrollingElement;
    if (!target) return { scrollWidth: 0, clientWidth: 0 };
    return { scrollWidth: target.scrollWidth, clientWidth: target.clientWidth };
  });
}

async function assertNoHorizontalScroll(page: Page) {
  const box = await pageScroller(page);
  expect(box.scrollWidth, `scroll horizontal ${box.scrollWidth} > ${box.clientWidth}`).toBeLessThanOrEqual(box.clientWidth + 1);
}

async function assertFabClearance(page: Page) {
  const mobile = page.viewportSize()?.width && page.viewportSize()!.width < 768;
  if (!mobile) return;
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((node) => {
      const c = typeof node.className === 'string' ? node.className : '';
      return c.includes('overflow-y-auto') && c.includes('h-[100dvh]');
    }) as HTMLElement | undefined;
    (el ?? document.scrollingElement)?.scrollTo(0, 9_999);
  });
  await page.waitForTimeout(200);
  const overlap = await page.evaluate(() => {
    const fab = document.querySelector('[aria-label="Ações rápidas"]') as HTMLElement | null;
    const footers = [...document.querySelectorAll('p')].filter((p) =>
      (p.textContent || '').includes('Aluguel, luz'),
    );
    const footer = footers[footers.length - 1] as HTMLElement | undefined;
    if (!fab || !footer) return { ok: false, reason: 'missing' };
    const a = fab.getBoundingClientRect();
    const b = footer.getBoundingClientRect();
    const hit = !(b.bottom <= a.top || b.top >= a.bottom || b.right <= a.left || b.left >= a.right);
    return { ok: !hit, fab: { top: a.top, bottom: a.bottom }, footer: { top: b.top, bottom: b.bottom } };
  });
  expect(overlap.ok, JSON.stringify(overlap)).toBeTruthy();
}

type Role = 'owner' | 'staff';
type Theme = (typeof THEMES)[number];

async function stubApp(
  page: Page,
  opts: {
    role: Role;
    theme: Theme;
    empty?: boolean;
    rpcCalls?: { count: number };
  },
) {
  const userId = opts.role === 'owner' ? OWNER_ID : STAFF_USER_ID;
  const email = opts.role === 'owner' ? 'owner.finb@example.test' : 'ana.finb@example.test';
  const fullName = opts.role === 'owner' ? 'Rhian Owner' : 'Ana Souza';
  const session = fakeSession(userId, email, fullName);

  await page.addInitScript(
    ({ key, value, mode, theme }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem('agendix_color_mode', mode);
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.setAttribute('data-mode', mode);
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session, mode: opts.theme.mode, theme: opts.theme.userType },
  );

  const ownerProfile = {
    id: OWNER_ID,
    role: 'owner',
    company_id: OWNER_ID,
    full_name: 'Rhian Owner',
    business_name: opts.theme.userType === 'beauty' ? 'Salão Aurora' : 'Barbearia São João',
    user_type: opts.theme.userType,
    region: 'BR',
    subscription_status: 'active',
    trial_ends_at: null,
    tutorial_completed: true,
    aios_enabled: false,
    photo_url: null,
  };
  const staffProfile = {
    id: STAFF_USER_ID,
    role: 'staff',
    company_id: OWNER_ID,
    full_name: 'Ana Souza',
    business_name: null,
    user_type: opts.theme.userType,
    region: 'BR',
    subscription_status: 'active',
    trial_ends_at: null,
    tutorial_completed: true,
    aios_enabled: false,
    photo_url: null,
  };

  await page.route(/\.supabase\.co\/(auth|rest)\//, async (route) => {
    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());
    const pathname = url.pathname;

    if (pathname.includes('/auth/v1/user') || pathname.includes('/auth/v1/token')) {
      await fulfillJson(route, pathname.includes('/auth/v1/user') ? session.user : session);
      return;
    }

    if (pathname.includes('/rest/v1/rpc/get_staff_performance_v1')) {
      if (opts.rpcCalls) opts.rpcCalls.count += 1;
      let payload: { p_start?: string; p_end?: string; p_professional_id?: string | null } = {};
      try { payload = req.postDataJSON() as typeof payload; } catch { payload = {}; }
      const start = payload.p_start || '2026-09-01';
      const end = payload.p_end || '2026-09-30';
      if (opts.role === 'staff') {
        await fulfillJson(route, withPeriod(opts.empty ? emptyStaff(start, end) : staff, start, end));
        return;
      }
      if (opts.empty) {
        await fulfillJson(route, emptyTeam(start, end));
        return;
      }
      if (payload.p_professional_id) {
        await fulfillJson(route, withPeriod(detail, start, end));
        return;
      }
      await fulfillJson(route, withPeriod(team, start, end));
      return;
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      await route.fallback();
      return;
    }

    if (pathname.includes('/rest/v1/profiles')) {
      if (opts.role !== 'owner' && url.search.includes(OWNER_ID)) {
        await fulfillJson(route, [ownerProfile]);
        return;
      }
      await fulfillJson(route, [opts.role === 'owner' ? ownerProfile : staffProfile]);
      return;
    }
    if (pathname.includes('/rest/v1/team_members')) {
      await fulfillJson(route, [{
        id: ANA,
        name: 'Ana Souza',
        photo_url: null,
        active: true,
        staff_user_id: STAFF_USER_ID,
        user_id: OWNER_ID,
        is_owner: false,
        commission_rate: 0.4,
        cpf: null,
      }]);
      return;
    }
    if (pathname.includes('/rest/v1/onboarding_progress')) {
      await fulfillJson(route, [{ is_completed: true }]);
      return;
    }
    if (pathname.includes('/rest/v1/business_settings')) {
      await fulfillJson(route, [{
        user_id: OWNER_ID,
        commission_settlement_day_of_month: 5,
        timezone: 'America/Sao_Paulo',
        onboarding_completed: true,
      }]);
      return;
    }
    if (pathname.includes('/rest/v1/appointments')) {
      await fulfillJson(route, [
        {
          id: 'apt-1',
          appointment_time: '2026-09-04T14:00:00-03:00',
          service: 'Corte degradê',
          price: 80,
          payment_method: 'cash',
          status: 'Completed',
          clients: { name: 'João Cliente' },
        },
        {
          id: 'apt-2',
          appointment_time: '2026-09-12T10:00:00-03:00',
          service: 'Barba',
          price: 40,
          payment_method: 'membership',
          status: 'Completed',
          clients: { name: 'Pedro Clube' },
        },
      ]);
      return;
    }
    if (pathname.includes('/rest/v1/product_sales')) {
      await fulfillJson(route, [
        {
          id: 'sale-1',
          created_at: '2026-09-04T15:10:00-03:00',
          quantity: 1,
          total_revenue: 45,
          products: { name: 'Pomada Black' },
          clients: { name: 'João Cliente' },
        },
      ]);
      return;
    }
    if (pathname.includes('/rest/v1/')) {
      await fulfillJson(route, []);
      return;
    }
    await route.fallback();
  });
}

async function openTeam(page: Page, theme: Theme, extra?: { empty?: boolean; rpcCalls?: { count: number } }) {
  const guard = await installProdWriteGuard(page);
  guard.stubRpc('relink_staff_if_unbound', { body: ANA });
  guard.stubRpc('get_commission_cycle_v1', { body: { cycle: { start: '2026-09-06', end: '2026-10-05', open: true }, members: [], totals: {} } });
  await page.clock.setFixedTime(new Date(NOW));
  await stubApp(page, { role: 'owner', theme, empty: extra?.empty, rpcCalls: extra?.rpcCalls });
  await page.goto('about:blank');
  await page.goto(`${BASE}/#/financeiro/performance?de=2026-09-01&ate=2026-09-30`, { waitUntil: 'domcontentloaded' });
  return guard;
}

async function openStaff(page: Page, theme: Theme, extra?: { empty?: boolean }) {
  const guard = await installProdWriteGuard(page);
  guard.stubRpc('relink_staff_if_unbound', { body: ANA });
  await page.clock.setFixedTime(new Date(NOW));
  await stubApp(page, { role: 'staff', theme, empty: extra?.empty });
  await page.goto('about:blank');
  await page.goto(`${BASE}/#/meus-insights`, { waitUntil: 'domcontentloaded' });
  return guard;
}

async function openEveryCard(page: Page) {
  const cards = page.locator('[data-testid^="metric-"]');
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i += 1) {
    await cards.nth(i).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('O que isso quer dizer')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Fechar' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Fechar' }).click();
    await expect(dialog).toHaveCount(0);
  }
}

test.describe('Finance PR-B — performance clara', () => {
  test.setTimeout(120_000);

  test('equipe: um número por card, conta em todos, sem scroll nem FAB por cima', async ({ page }) => {
    const rpcCalls = { count: 0 };
    await page.setViewportSize({ width: 390, height: 844 });
    const guard = await openTeam(page, THEMES[0], { rpcCalls });
    await expect(page.getByRole('heading', { name: 'Performance da equipe' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('team-overview')).toBeVisible();
    await expect(page.getByText('Comparando setembro com agosto')).toBeVisible();
    await expect(page.getByText('Ficou para a barbearia')).toBeVisible();
    await expect(page.getByText('Ver a conta').first()).toBeVisible();
    await expect(page.locator('[data-testid="team-overview"]')).not.toContainText('p.p.');
    await expect(page.locator('[data-testid="team-overview"]')).not.toContainText('▲');
    await expect(page.locator('[data-testid="team-overview"]')).not.toContainText('▼');
    await expect(page.getByText('vs ')).toHaveCount(0);
    const beforeModal = rpcCalls.count;
    await openEveryCard(page);
    expect(rpcCalls.count).toBe(beforeModal);
    await page.setViewportSize({ width: 360, height: 800 });
    await assertNoHorizontalScroll(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await assertFabClearance(page);
    guard.assertNoLeak();
  });

  test('colaborador: conta percentual, lançamentos em lista, ranking sem cinza', async ({ page }) => {
    const rpcCalls = { count: 0 };
    await page.setViewportSize({ width: 390, height: 844 });
    const guard = await openTeam(page, THEMES[0], { rpcCalls });
    await expect(page.getByTestId('team-overview')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Ainda sem posição no ranking').first()).toBeVisible();
    await expect(page.getByText('Fora do ranking')).toHaveCount(0);
    await expect(page.getByText(/Fez 5 atendimentos; o ranking começa em 8/)).toBeVisible();
    const teamCalls = rpcCalls.count;
    await page.locator(`[data-testid="member-${ANA}"]`).first().getByRole('link', { name: /Ana/ }).click();
    await expect(page.getByTestId('detail-headline')).toBeVisible({ timeout: 20_000 });
    expect(rpcCalls.count).toBeGreaterThan(teamCalls);
    await page.getByTestId('metric-voltou').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Saíram com horário marcado/)).toBeVisible();
    await expect(dialog.getByText(/6 clientes marcaram de novo/)).toBeVisible();
    await expect(dialog.getByText('O que isso quer dizer')).toBeVisible();
    await dialog.getByRole('button', { name: 'Fechar' }).click();
    await openEveryCard(page);
    await expect(page.getByRole('heading', { name: 'Lançamentos' })).toBeVisible();
    await expect(page.getByText('Corte degradê')).toBeVisible();
    await expect(page.getByText('João Cliente').first()).toBeVisible();
    await expect(page.locator('table')).toHaveCount(0);
    await page.setViewportSize({ width: 360, height: 800 });
    await assertNoHorizontalScroll(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await assertFabClearance(page);
    const afterCards = rpcCalls.count;
    await page.getByRole('button', { name: /Toda a equipe/ }).click();
    await expect(page.getByTestId('team-overview')).toBeVisible();
    expect(rpcCalls.count).toBe(afterCards);
    guard.assertNoLeak();
  });

  test('meus resultados: fala com o colaborador e abre a conta', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const guard = await openStaff(page, THEMES[0]);
    await expect(page.getByRole('heading', { name: /Meus resultados/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Só os seus números')).toBeVisible();
    await expect(page.getByText(/Ficou para/)).toHaveCount(0);
    await expect(page.getByText('Bruno')).toHaveCount(0);
    await openEveryCard(page);
    await page.getByTestId('metric-ticket_medio').click();
    await expect(page.getByRole('dialog').getByText(/seus clientes/i)).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click();
    await page.setViewportSize({ width: 360, height: 800 });
    await assertNoHorizontalScroll(page);
    await assertFabClearance(page);
    guard.assertNoLeak();
  });

  test('vazio: não sugere o período atual', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(new Date(NOW));
    const guard = await installProdWriteGuard(page);
    await stubApp(page, { role: 'owner', theme: THEMES[0], empty: true });
    await page.goto(`${BASE}/#/financeiro/performance`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Nenhum atendimento concluído neste período.')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /Ver “Mês passado”/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ver “Este mês”/ })).toHaveCount(0);
    guard.assertNoLeak();
  });

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      test(`prints ${theme.name} ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const suffix = `${vp.name}-${theme.name}`;

        await openTeam(page, theme);
        await expect(page.getByTestId('team-overview')).toBeVisible({ timeout: 30_000 });
        await shot(page, `equipe-${suffix}`);

        await page.getByTestId('metric-retorno').click();
        await expect(page.getByTestId('metric-account')).toBeVisible();
        await shot(page, `equipe-conta-${suffix}`);
        await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click();

        const unranked = page.getByText('Ainda sem posição no ranking').first();
        await unranked.scrollIntoViewIfNeeded();
        await shot(page, `sem-ranking-${suffix}`);

        await page.locator(`[data-testid="member-${ANA}"]`).first().getByRole('link', { name: /Ana/ }).click();
        await expect(page.getByTestId('detail-headline')).toBeVisible({ timeout: 20_000 });
        await shot(page, `colaborador-${suffix}`);

        await page.getByTestId('metric-voltou').click();
        await expect(page.getByTestId('metric-account')).toBeVisible();
        await shot(page, `colaborador-conta-percentual-${suffix}`);
        await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click();

        await page.getByRole('heading', { name: 'Lançamentos' }).scrollIntoViewIfNeeded();
        await shot(page, `lancamentos-${suffix}`);

        await openStaff(page, theme);
        await expect(page.getByRole('heading', { name: /Meus resultados/ })).toBeVisible({ timeout: 30_000 });
        await shot(page, `meus-resultados-${suffix}`);
        await page.getByTestId('metric-ticket_medio').click();
        await expect(page.getByTestId('metric-account')).toBeVisible();
        await shot(page, `meus-resultados-conta-${suffix}`);
        await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click();

        const guard = await installProdWriteGuard(page);
        await stubApp(page, { role: 'owner', theme, empty: true });
        await page.clock.setFixedTime(new Date(NOW));
        await page.goto('about:blank');
        await page.goto(`${BASE}/#/financeiro/performance`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Nenhum atendimento concluído neste período.')).toBeVisible({ timeout: 30_000 });
        await shot(page, `vazio-${suffix}`);
        guard.assertNoLeak();
      });
    }
  }

  test('orçamento: 4G + CPU 4x', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: Math.round((1.6 * 1024 * 1024) / 8),
      uploadThroughput: Math.round((750 * 1024) / 8),
    });
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await page.addInitScript(() => {
      (window as unknown as { __cls?: number }).__cls = 0;
      try {
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
            if (!entry.hadRecentInput) {
              (window as unknown as { __cls: number }).__cls += entry.value || 0;
            }
          }
        });
        po.observe({ type: 'layout-shift', buffered: true });
      } catch {
        /* ignore */
      }
    });

    const t0 = Date.now();
    await openTeam(page, THEMES[0]);
    await expect(page.getByTestId('metric-retorno')).toBeVisible({ timeout: 15_000 });
    const firstNumbersMs = Date.now() - t0;
    await expect(page.getByTestId('team-overview')).toBeVisible();
    await expect(page.getByText('Por colaborador')).toBeVisible();
    const fullPageMs = Date.now() - t0;
    await page.waitForTimeout(400);
    const cls = await page.evaluate(() => (window as unknown as { __cls?: number }).__cls ?? null);

    fs.mkdirSync(ARTIFACTS, { recursive: true });
    const report = { firstNumbersMs, fullPageMs, cls, budgets: { firstNumbersMs: 2500, fullPageMs: 3500, cls: 0.05 } };
    fs.writeFileSync(PERF_FILE, `${JSON.stringify(report, null, 2)}\n`);

    expect(firstNumbersMs, `primeiros números ${firstNumbersMs}ms`).toBeLessThanOrEqual(2_500);
    expect(fullPageMs, `página ${fullPageMs}ms`).toBeLessThanOrEqual(3_500);
    if (cls != null) expect(cls, `CLS ${cls}`).toBeLessThanOrEqual(0.05);
  });
});
