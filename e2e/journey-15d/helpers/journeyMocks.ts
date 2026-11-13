import type { Page, Route } from '@playwright/test';
import {
  EMAIL,
  UID,
  freshState,
  mockBackend,
  type MockState,
} from '../../helpers/mockBackend';

const PROJECT_REF = process.env.E2E_SUPABASE_REF || 'lcqwrngscsziysyfhpfj';
const ANA_ID = '20000000-0000-0000-0000-0000000000a1';
const SLUG = 'journey-barbearia-e2e';

const MORNING = '2026-09-10T09:15:00.000Z';

const paidFinanceRows = [
  {
    id: 'jr-fr-1',
    created_at: '2026-09-05T14:00:00.000Z',
    service_name: 'Corte',
    description: null,
    client_name: 'Cliente Journey',
    revenue: 50,
    payment_method: 'pix',
    commission_rate: 40,
    commission_value: 20,
    commission_paid: true,
    commission_paid_at: MORNING,
    professional_id: ANA_ID,
    type: 'revenue',
    appointments: { machine_fee_percent: 0, service: 'Corte' },
  },
];

const commissionPayments = [
  {
    paid_at: MORNING,
    start_date: '2026-08-06',
    end_date: '2026-09-05',
    professional_id: ANA_ID,
    status: 'paid',
    amount: 20,
  },
];

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function fakeJwt(sub: string): string {
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({
    sub,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 86400,
  })}.e2e-journey`;
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  const accept = route.request().headers()['accept'] || '';
  const wantsObject = accept.includes('vnd.pgrst.object+json');
  const payload = wantsObject && Array.isArray(body) ? (body[0] ?? null) : body;
  await route.fulfill({
    status: wantsObject && payload === null ? 406 : status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
    body: JSON.stringify(payload),
  });
}

function financeStats() {
  return {
    revenue: 150,
    expenses: 0,
    profit: 150,
    commissions_pending: 0,
    pendingExpenses: 0,
    revenue_by_method: { pix: 50, mbway: 0, dinheiro: 50, cartao: 50 },
    transactions: [],
  };
}

/** Backend em memória: cadastro + financeiro + comissões (sem Supabase real). */
export async function installJourneyMocks(page: Page): Promise<MockState> {
  const state = freshState({ existingOwner: true, userType: 'barber' });
  if (state.profile) {
    state.profile.business_slug = SLUG;
    state.profile.tutorial_completed = true;
  }
  state.tables.clients = [
    { id: 'cli-1', name: 'Cliente Journey', phone: '11911111111', user_id: UID },
  ];
  state.tables.team_members = [
    {
      id: ANA_ID,
      name: 'Ana Journey',
      photo_url: null,
      active: true,
      staff_user_id: null,
      user_id: UID,
      is_owner: false,
      commission_rate: 40,
    },
  ];
  state.tables.services = [
    { id: 'svc-1', name: 'Corte Masculino', duration: 30, price: 45, user_id: UID },
  ];

  await mockBackend(page, state);

  const accessToken = fakeJwt(UID);
  const session = {
    access_token: accessToken,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: UID,
      email: EMAIL,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: 'Rafael Journey' },
    },
  };

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem('agendix_color_mode', 'light');
      navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session },
  );

  await page.route(/supabase\.co|\/auth\/v1\/|\/rest\/v1\//, async (route) => {
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

    if (pathname.includes('/rpc/get_commission_cycle_v1')) {
      await fulfillJson(route, { message: 'Could not find the function', code: 'PGRST202' }, 404);
      return;
    }
    if (pathname.includes('/rpc/get_commissions_due')) {
      await fulfillJson(route, [
        {
          professional_id: ANA_ID,
          professional_name: 'Ana Journey',
          photo_url: null,
          is_owner: false,
          total_due: 0,
          total_earnings_month: 20,
          total_paid: 20,
          total_pending_records: 0,
          commission_rate: 40,
          services_pending: 0,
          products_pending: 0,
          services_month: 1,
          products_sold_month: 0,
          cpf: null,
        },
      ]);
      return;
    }
    if (pathname.includes('/rpc/get_finance_stats')) {
      await fulfillJson(route, financeStats());
      return;
    }
    if (pathname.includes('/rpc/get_public_profile_by_slug')) {
      await fulfillJson(route, {
        id: UID,
        business_name: 'Barbearia Journey',
        user_type: 'barber',
        region: 'BR',
        business_slug: SLUG,
        public_booking_enabled: true,
        phone: '11987654321',
        logo_url: null,
        cover_photo_url: null,
      });
      return;
    }
    if (pathname.includes('/rpc/get_public_business_settings_json')) {
      await fulfillJson(route, {
        enable_self_rescheduling: true,
        online_booking_auto_confirm: false,
        public_queue_enabled: true,
      });
      return;
    }
    if (pathname.includes('/rpc/get_public_services_catalog')) {
      await fulfillJson(route, [
        {
          id: 'svc-1',
          name: 'Corte Masculino',
          duration_minutes: 30,
          price: 45,
          category_id: null,
        },
      ]);
      return;
    }
    if (
      pathname.includes('/rpc/get_public_categories_catalog') ||
      pathname.includes('/rpc/get_public_team_catalog') ||
      pathname.includes('/rpc/get_public_products_catalog') ||
      pathname.includes('/rpc/get_public_gallery_catalog')
    ) {
      await fulfillJson(route, []);
      return;
    }
    if (pathname.includes('/rest/v1/finance_records')) {
      await fulfillJson(route, paidFinanceRows);
      return;
    }
    if (pathname.includes('/rest/v1/commission_payments')) {
      await fulfillJson(route, commissionPayments);
      return;
    }
    if (pathname.includes('/rpc/')) {
      await fulfillJson(route, null);
      return;
    }

    await route.fallback();
  });

  return state;
}

export const JOURNEY_SLUG = SLUG;
export const JOURNEY_OWNER_EMAIL = EMAIL;
