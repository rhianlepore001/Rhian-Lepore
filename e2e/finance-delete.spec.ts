/**
 * E2E PR-A Finance — exclusão de transação (tenant mockado, nunca prod).
 *
 *   npx playwright test e2e/finance-delete.spec.ts --project=chromium-legacy
 */
import { expect, test, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installProdWriteGuard } from './helpers/prodWriteGuard';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const STAFF_ID = '6fc5cf83-b7b6-4be7-9ba7-414d9d2e92f1';
const ARTIFACTS = '/opt/cursor/artifacts/screenshots/fin-a';
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
] as const;

const APT_ID = '40000000-0000-0000-0000-0000000000d1';
const PROD_ID = '50000000-0000-0000-0000-0000000000e2';
const MAN_ID = '50000000-0000-0000-0000-0000000000e3';
const PAID_ID = '40000000-0000-0000-0000-0000000000d2';

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
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
    },
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
    }`,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
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

function ownerProfile(role: 'owner' | 'staff', userId: string) {
  return {
    id: userId,
    role,
    company_id: OWNER_ID,
    full_name: role === 'owner' ? 'Rhian Owner' : 'Ana Staff',
    business_name: 'Studio AgendiX',
    business_slug: 'fin-a',
    public_booking_enabled: true,
    user_type: 'barber',
    region: 'BR',
    subscription_status: 'active',
    trial_ends_at: null,
    tutorial_completed: true,
    aios_enabled: false,
    photo_url: null,
  };
}

interface FinanceTx {
  id: string;
  created_at: string;
  barber_name: string;
  professional_id: string;
  client_name: string;
  amount: number;
  expense: number;
  commission_paid: boolean;
  payment_method: string;
  status: string;
  type: string;
  service_name: string;
  description: string | null;
}

function tx(overrides: Partial<FinanceTx>): FinanceTx {
  return {
    id: '',
    created_at: '2026-10-04T14:00:00.000Z',
    barber_name: 'Ana Souza',
    professional_id: '10000000-0000-0000-0000-0000000000a1',
    client_name: 'Maria Silva',
    amount: 0,
    expense: 0,
    commission_paid: false,
    payment_method: 'pix',
    status: 'paid',
    type: 'revenue',
    service_name: '',
    description: null,
    ...overrides,
  };
}

const BASE_TX = [
  tx({ id: APT_ID, service_name: 'Corte', description: null, amount: 80 }),
  tx({ id: PROD_ID, service_name: 'Pomada', description: 'Venda de produto: Pomada', amount: 40 }),
  tx({ id: MAN_ID, service_name: 'Caixa extra', description: 'Caixa extra', amount: 25, client_name: '' }),
  tx({ id: PAID_ID, service_name: 'Barba', description: null, amount: 50, commission_paid: true }),
];

function statsBody(transactions = BASE_TX) {
  return {
    revenue: transactions.filter((t) => t.type === 'revenue').reduce((s, t) => s + Number(t.amount || 0), 0),
    expenses: 0,
    commissions_pending: 20,
    profit: 80,
    revenue_by_method: { pix: 80, mbway: 0, dinheiro: 0, cartao: 0 },
    pendingExpenses: 0,
    transactions,
  };
}

async function stubSession(page: Page, role: 'owner' | 'staff') {
  const userId = role === 'owner' ? OWNER_ID : STAFF_ID;
  const session = fakeSession(
    userId,
    role === 'owner' ? 'owner.fina@example.test' : 'staff.fina@example.test',
    role === 'owner' ? 'Rhian Owner' : 'Ana Staff',
  );
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session },
  );

  const profile = ownerProfile(role, userId);
  await page.route(/\.supabase\.co\/(auth|rest)\//, async (route) => {
    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());
    const pathname = url.pathname;

    if (pathname.includes('/auth/v1/user') || pathname.includes('/auth/v1/token')) {
      await fulfillJson(route, pathname.includes('/auth/v1/user') ? session.user : session);
      return;
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      await route.fallback();
      return;
    }
    if (pathname.includes('/rest/v1/profiles')) {
      await fulfillJson(route, [profile]);
      return;
    }
    if (pathname.includes('/rest/v1/team_members')) {
      await fulfillJson(route, [{
        id: '10000000-0000-0000-0000-0000000000a1',
        name: role === 'owner' ? 'Rhian Owner' : 'Ana Staff',
        photo_url: null,
        active: true,
        staff_user_id: userId,
        user_id: OWNER_ID,
        is_owner: role === 'owner',
        display_order: 0,
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
        timezone: 'America/Sao_Paulo',
        business_hours: {},
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
}

async function openDelete(page: Page, label: string, width: number) {
  await page.getByText('Transações recentes').scrollIntoViewIfNeeded();
  if (width < 768) {
    await page.getByTestId('finance-tx-card').filter({ hasText: label }).first().click();
    await page.getByRole('dialog').getByTestId('finance-delete').click();
    return;
  }
  await page.locator(`tr:has-text("${label}")`).first().locator('[data-testid="finance-delete"]').click();
}

test.describe('PR-A exclusão financeira', () => {
  test.setTimeout(90_000);

  for (const vp of VIEWPORTS) {
    test(`confirmações, bloqueio e toast ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      let remaining = [...BASE_TX];
      guard.stubRpc('get_finance_stats', { body: statsBody(remaining) });
      guard.stubRpc('get_monthly_finance_history', { body: [] });
      guard.stubRpc('delete_finance_transaction', (_route, payload) => {
        const id = String((payload as { p_record_id?: string })?.p_record_id ?? '');
        if (id === PAID_ID) {
          return {
            body: {
              ok: false,
              error: 'commission_already_paid',
              staff_name: 'Ana Souza',
              paid_at: '2026-10-01T15:00:00.000Z',
            },
          };
        }
        remaining = remaining.filter((t) => t.id !== id);
        guard.stubRpc('get_finance_stats', { body: statsBody(remaining) });
        const kind = id === APT_ID ? 'appointment' : id === PROD_ID ? 'product_sale' : 'manual';
        return { body: { ok: true, kind } };
      });

      await stubSession(page, 'owner');
      await page.goto(`${BASE}/#/financeiro`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible({ timeout: 20_000 });
      await page.getByText('Transações recentes').scrollIntoViewIfNeeded();
      if (vp.width < 768) {
        await expect(page.getByTestId('finance-tx-card').first()).toBeVisible({ timeout: 15_000 });
      } else {
        await expect(page.getByTestId('finance-delete').filter({ visible: true }).first()).toBeVisible({ timeout: 15_000 });
      }

      await openDelete(page, 'Corte', vp.width);
      await expect(page.getByTestId('finance-delete-confirm')).toContainText('atendimento de Maria Silva');
      await shot(page, `confirm-servico-${vp.name}`);
      await page.getByRole('button', { name: 'Cancelar' }).click();

      await openDelete(page, 'Pomada', vp.width);
      await expect(page.getByTestId('finance-delete-confirm')).toHaveText('Só o produto sai. O atendimento continua.');
      await shot(page, `confirm-produto-${vp.name}`);
      await page.getByRole('button', { name: 'Cancelar' }).click();

      await openDelete(page, 'Barba', vp.width);
      await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click();
      const blockToast = page.locator('[data-toast-placement="top"]').filter({ hasText: 'já foi paga a Ana Souza' });
      await expect(blockToast).toBeVisible({ timeout: 10_000 });
      await expect(blockToast).not.toContainText(/PGRST|#/);
      await shot(page, `bloqueio-comissao-paga-${vp.name}`);

      await openDelete(page, 'Caixa extra', vp.width);
      await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click();
      const okToast = page.locator('[data-toast-placement="top"]').filter({ hasText: 'excluída com sucesso' });
      await expect(okToast).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('Caixa extra')).toHaveCount(0);
      await shot(page, `sucesso-toast-${vp.name}`);
      guard.assertNoLeak();
    });

    test(`staff sem Excluir ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const guard = await installProdWriteGuard(page);
      guard.stubRpc('get_finance_stats', { body: statsBody() });
      guard.stubRpc('get_monthly_finance_history', { body: [] });
      await stubSession(page, 'staff');
      await page.goto(`${BASE}/#/financeiro`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Meu Financeiro')).toBeVisible({ timeout: 20_000 });
      await page.getByText('Transações recentes').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('finance-delete')).toHaveCount(0);
      if (vp.width < 768) {
        await page.getByTestId('finance-tx-card').first().click();
        await expect(page.getByTestId('finance-delete')).toHaveCount(0);
      }
      await shot(page, `staff-sem-excluir-${vp.name}`);
      guard.assertNoLeak();
    });
  }
});
