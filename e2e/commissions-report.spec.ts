/**
 * E2E — histórico de comissões, relatório pago, share PDF (tenant mockado).
 *
 *   npx playwright test e2e/commissions-report.spec.ts --project=chromium-legacy
 */
import { expect, test, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = process.env.E2E_SUPABASE_REF || 'lcqwrngscsziysyfhpfj';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const ANA_ID = '20000000-0000-0000-0000-0000000000a1';
const ARTIFACTS = '/opt/cursor/artifacts/screenshots/comissoes';
const MORNING = '2026-09-10T09:15:00.000Z';
const AFTERNOON = '2026-09-10T18:40:00.000Z';

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
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
    },
    body: JSON.stringify(payload),
  });
}

const paidRows = [
  {
    id: 'fr-1',
    created_at: '2026-08-12T14:00:00.000Z',
    service_name: '',
    description: null,
    client_name: 'João Lima',
    revenue: 50,
    payment_method: 'pix',
    commission_rate: 40,
    commission_value: 20,
    commission_paid: true,
    commission_paid_at: MORNING,
    professional_id: ANA_ID,
    type: 'revenue',
    appointments: { machine_fee_percent: 0, service: 'Corte degradê' },
  },
  {
    id: 'fr-2',
    created_at: '2026-08-20T14:00:00.000Z',
    service_name: 'Barba',
    description: 'Barba',
    client_name: 'Maria',
    revenue: 40,
    payment_method: 'cash',
    commission_rate: 40,
    commission_value: 16,
    commission_paid: true,
    commission_paid_at: MORNING,
    professional_id: ANA_ID,
    type: 'revenue',
    appointments: { machine_fee_percent: 0, service: 'Barba' },
  },
  {
    id: 'fr-3',
    created_at: '2026-09-08T14:00:00.000Z',
    service_name: 'Pigmentação',
    description: null,
    client_name: 'Caio',
    revenue: 80,
    payment_method: 'credit',
    commission_rate: 40,
    commission_value: 32,
    commission_paid: true,
    commission_paid_at: AFTERNOON,
    professional_id: ANA_ID,
    type: 'revenue',
    appointments: { machine_fee_percent: 2, service: 'Pigmentação' },
  },
];

const payments = [
  { paid_at: MORNING, start_date: '2026-08-06', end_date: '2026-09-05', professional_id: ANA_ID, status: 'paid', amount: 36 },
  { paid_at: AFTERNOON, start_date: '2026-09-06', end_date: '2026-09-10', professional_id: ANA_ID, status: 'paid', amount: 32 },
];

function financeStats() {
  return {
    revenue: 170,
    expenses: 0,
    profit: 170,
    commissions_pending: 0,
    pendingExpenses: 0,
    revenue_by_method: { pix: 50, mbway: 0, dinheiro: 40, cartao: 80 },
    transactions: [],
  };
}

async function installMocks(page: Page, mode: 'light' | 'dark') {
  const accessToken = fakeJwt(OWNER_ID);
  const session = {
    access_token: accessToken,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: OWNER_ID,
      email: 'owner.comissoes@example.test',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: 'Studio Atlas' },
      created_at: '2026-01-01T00:00:00.000Z',
    },
  };

  await page.addInitScript(
    ({ key, value, colorMode }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem('agendix_color_mode', colorMode);
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
      navigator.serviceWorker?.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session, colorMode: mode },
  );

  await page.route(/supabase\.co/, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;

    if (req.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        },
      });
      return;
    }

    if (pathname.includes('/auth/v1/user')) {
      await fulfillJson(route, session.user);
      return;
    }
    if (pathname.includes('/auth/v1/token') || pathname.includes('/auth/v1/session')) {
      await fulfillJson(route, session);
      return;
    }
    if (pathname.includes('/rpc/get_commission_cycle_v1')) {
      await fulfillJson(route, { message: 'Could not find the function', code: 'PGRST202' }, 404);
      return;
    }
    if (pathname.includes('/rpc/get_commissions_due')) {
      await fulfillJson(route, [{
        professional_id: ANA_ID,
        professional_name: 'Ana Souza',
        photo_url: null,
        is_owner: false,
        total_due: 0,
        total_earnings_month: 36,
        total_paid: 68,
        total_pending_records: 0,
        commission_rate: 40,
        services_pending: 0,
        products_pending: 0,
        services_month: 3,
        products_sold_month: 0,
        cpf: null,
      }]);
      return;
    }
    if (pathname.includes('/rpc/get_finance_stats')) {
      await fulfillJson(route, financeStats());
      return;
    }
    if (pathname.includes('/rpc/')) {
      await fulfillJson(route, []);
      return;
    }
    if (pathname.includes('/rest/v1/profiles')) {
      await fulfillJson(route, [{
        id: OWNER_ID,
        role: 'owner',
        company_id: OWNER_ID,
        full_name: 'Rhian',
        business_name: 'Studio Atlas',
        business_slug: 'studio-atlas',
        public_booking_enabled: true,
        user_type: 'barber',
        region: 'PT',
        subscription_status: 'active',
        tutorial_completed: true,
      }]);
      return;
    }
    if (pathname.includes('/rest/v1/team_members')) {
      await fulfillJson(route, [{
        id: ANA_ID,
        name: 'Ana Souza',
        photo_url: null,
        active: true,
        staff_user_id: null,
        user_id: OWNER_ID,
        is_owner: false,
        commission_rate: 40,
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
        timezone: 'Europe/Lisbon',
        business_hours: {},
        commission_settlement_day_of_month: 5,
        onboarding_completed: true,
      }]);
      return;
    }
    if (pathname.includes('/rest/v1/finance_records')) {
      const select = url.searchParams.get('select') || '';
      const historySelect = select.includes('commission_paid_at');
      const paidAtEq = url.search.match(/commission_paid_at=eq\.([^&]+)/)?.[1] ?? null;
      const decodedAt = paidAtEq ? decodeURIComponent(paidAtEq) : null;
      let rows = historySelect || select.includes('revenue') ? paidRows : [];
      if (decodedAt) rows = rows.filter((r) => r.commission_paid_at === decodedAt);
      if (select.includes('revenue') && !decodedAt && url.search.includes('commission_paid=eq.false')) {
        rows = [];
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-expose-headers': '*',
          'content-range': `${rows.length ? `0-${rows.length - 1}` : '*'}/${rows.length}`,
        },
        body: JSON.stringify(rows),
      });
      return;
    }
    if (pathname.includes('/rest/v1/commission_payments')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-expose-headers': '*',
          'content-range': `0-${payments.length - 1}/${payments.length}`,
        },
        body: JSON.stringify(payments),
      });
      return;
    }
    if (pathname.includes('/rest/v1/')) {
      await fulfillJson(route, []);
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function openHistory(page: Page) {
  await page.goto(`${BASE}/#/financeiro?tab=commissions`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Pagamento de comissão' })).toBeVisible({ timeout: 30_000 });
  const row = page.getByTestId(`payout-row-${ANA_ID}`);
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: /Mais ações de Ana Souza/i }).click();
  await page.getByRole('menuitem', { name: /Histórico de pagamentos/i }).click();
  await expect(page.getByTestId('payment-history-card').first()).toBeVisible({ timeout: 15_000 });
}

function pdfToPng(pdfPath: string, pngPath: string) {
  fs.mkdirSync(path.dirname(pngPath), { recursive: true });
  try {
    execFileSync('pdftoppm', ['-png', '-singlefile', '-r', '144', pdfPath, pngPath.replace(/\.png$/, '')], { stdio: 'pipe' });
    return;
  } catch {
    // fallback abaixo
  }
  execFileSync('pdftocairo', ['-png', '-singlefile', '-r', '144', pdfPath, pngPath.replace(/\.png$/, '')], { stdio: 'pipe' });
}

test.describe('Comissões — histórico, relatório pago e PDF', () => {
  test.setTimeout(120_000);

  test('histórico agrupa por timestamp, relatório pago e PDFs', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await installMocks(page, 'light');
    await openHistory(page);

    const cards = page.getByTestId('payment-history-card');
    await expect(cards).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Ver relatório' })).toHaveCount(2);
    await page.screenshot({ path: path.join(ARTIFACTS, 'historico-390-light.png'), fullPage: false });

    await page.evaluate(() => {
      localStorage.setItem('agendix_color_mode', 'dark');
      document.documentElement.setAttribute('data-mode', 'dark');
    });
    await page.screenshot({ path: path.join(ARTIFACTS, 'historico-390-dark.png'), fullPage: false });
    await page.evaluate(() => {
      localStorage.setItem('agendix_color_mode', 'light');
      document.documentElement.setAttribute('data-mode', 'light');
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(cards).toHaveCount(2);
    await page.screenshot({ path: path.join(ARTIFACTS, 'historico-1440-light.png'), fullPage: false });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Ver relatório' }).first().click();
    await expect(page.getByText(/Pago em/i).first()).toBeVisible();
    await expect(page.getByTestId('report-mobile-list')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Pagar' })).toHaveCount(0);
    await page.screenshot({ path: path.join(ARTIFACTS, 'relatorio-pago-390-light.png'), fullPage: false });

    await page.getByRole('button', { name: /Compartilhar/i }).click();
    await expect(page.getByTestId('commission-share-sheet')).toBeVisible();
    await expect(page.getByTestId('share-option-resumido')).toBeVisible();
    await expect(page.getByTestId('share-option-detalhado')).toBeVisible();
    await page.screenshot({ path: path.join(ARTIFACTS, 'share-sheet-390-light.png'), fullPage: false });

    const [detailed] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('share-option-detalhado').click(),
    ]);
    const detailedPdf = path.join(ARTIFACTS, 'comissao-detalhado.pdf');
    await detailed.saveAs(detailedPdf);
    expect(detailed.suggestedFilename()).toMatch(/comissao-ana-souza-.*detalhado\.pdf/);
    pdfToPng(detailedPdf, path.join(ARTIFACTS, 'pdf-detalhado.png'));

    await expect(page.getByTestId('commission-share-sheet')).toBeVisible();
    const [summary] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('share-option-resumido').click(),
    ]);
    const summaryPdf = path.join(ARTIFACTS, 'comissao-resumido.pdf');
    await summary.saveAs(summaryPdf);
    expect(summary.suggestedFilename()).toMatch(/comissao-ana-souza-.*resumido\.pdf/);
    pdfToPng(summaryPdf, path.join(ARTIFACTS, 'pdf-resumido.png'));
  });
});
