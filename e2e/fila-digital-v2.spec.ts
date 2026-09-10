/**
 * E2E smoke da Fila Digital v2 (mobile).
 *
 * Fluxo público com RPC mockada:
 *   QR → serviço → identidade → pagamento → Minha Área ?tab=fila
 *
 *   npx playwright test e2e/fila-digital-v2.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

const PROFILE = {
  id: 'biz-001',
  business_name: 'Barbearia QA',
  user_type: 'barber',
  region: 'BR',
};

const PROFILE_PT = {
  ...PROFILE,
  region: 'PT',
};

const SERVICES = [
  {
    id: 'svc-corte',
    name: 'Corte',
    duration_minutes: 30,
    price: 50,
    category_id: 'cat-cabelo',
    active: true,
  },
];

const CATEGORIES = [{ id: 'cat-cabelo', name: 'Cabelo' }];

const CLIENT = {
  id: 'client-e2e',
  name: 'Joao QA',
  phone: '11988887777',
  business_id: PROFILE.id,
};

async function fulfillRpc(route: Route, payload: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

interface MockOptions {
  profile?: typeof PROFILE;
  pixConfig?: unknown;
  entryStatus?: 'waiting' | 'calling' | 'completed';
  calledAt?: string | null;
  lateMinutes?: number;
  paymentStatus?: string;
}

async function mockQueuePublicApis(page: Page, options: MockOptions = {}) {
  const profile = options.profile ?? PROFILE;
  const pixConfig = options.pixConfig ?? null;
  const entryStatus = options.entryStatus ?? 'waiting';
  const calledAt = options.calledAt ?? null;
  const lateMinutes = options.lateMinutes ?? 10;
  const paymentStatus = options.paymentStatus ?? (entryStatus === 'waiting' ? 'unpaid' : 'paid');
  const calls: Record<string, number> = {};
  const bump = (name: string) => {
    calls[name] = (calls[name] ?? 0) + 1;
    return calls[name];
  };

  const entry = {
    id: 'queue-e2e',
    business_id: profile.id,
    client_name: CLIENT.name,
    client_phone: CLIENT.phone,
    service_id: 'svc-corte',
    status: entryStatus,
    joined_at: new Date().toISOString(),
    called_at: calledAt,
    payment_status: paymentStatus,
  };

  await page.route('**/rest/v1/rpc/**', async (route) => {
    const url = route.request().url();
    if (url.includes('get_public_profile_by_slug')) {
      return fulfillRpc(route, profile);
    }
    if (url.includes('get_public_services_catalog')) {
      return fulfillRpc(route, SERVICES);
    }
    if (url.includes('get_public_categories_catalog')) {
      return fulfillRpc(route, CATEGORIES);
    }
    if (url.includes('get_public_team_catalog')) {
      return fulfillRpc(route, []);
    }
    if (url.includes('get_public_business_settings_json')) {
      return fulfillRpc(route, { enable_self_rescheduling: true });
    }
    if (url.includes('get_public_pix_config')) {
      return fulfillRpc(route, pixConfig);
    }
    if (url.includes('membership') || url.includes('pix_key')) {
      return fulfillRpc(route, null);
    }
    if (url.includes('get_public_client_by_phone')) {
      return fulfillRpc(route, [CLIENT]);
    }
    if (url.includes('upsert_public_client')) {
      return fulfillRpc(route, [CLIENT]);
    }
    if (url.includes('get_queue_entry_public')) {
      return fulfillRpc(route, [entry]);
    }
    if (url.includes('find_active_queue_entry_by_phone')) {
      bump('find_active');
      if (entryStatus === 'completed') {
        return fulfillRpc(route, []);
      }
      if (entryStatus === 'calling') {
        return fulfillRpc(route, [entry]);
      }
      if (!calls.join_queue_entry) {
        return fulfillRpc(route, []);
      }
      return fulfillRpc(route, [entry]);
    }
    if (url.includes('join_queue_entry')) {
      bump('join_queue_entry');
      return fulfillRpc(route, { id: 'queue-e2e', business_id: profile.id });
    }
    if (url.includes('get_queue_public_board')) {
      return fulfillRpc(route, {
        entryId: 'queue-e2e',
        status: entryStatus,
        paymentStatus,
        serviceName: 'Corte',
        position: entryStatus === 'waiting' ? 1 : null,
        etaMinutes: entryStatus === 'waiting' ? 0 : null,
        people: entryStatus === 'waiting' ? [{ position: 1, firstName: 'Joao', isYou: true }] : [],
        settings: { allowLeave: true, lateMinutes },
        calledAt,
      });
    }
    return fulfillRpc(route, []);
  });
}

async function seedClientSession(page: Page) {
  await page.addInitScript(({ client, ticket }) => {
    localStorage.setItem(`rhian_public_client_${client.business_id}`, JSON.stringify(client));
    localStorage.setItem(`queue_ticket_${ticket.businessId}`, JSON.stringify(ticket));
    localStorage.setItem('queue_last_business_slug', ticket.slug);
  }, {
    client: CLIENT,
    ticket: {
      businessId: PROFILE.id,
      entryId: 'queue-e2e',
      phone: CLIENT.phone,
      slug: 'barbearia-qa',
    },
  });
}

test.describe('Fila digital v2 — smoke mobile', () => {
  test.setTimeout(90_000);

  test('QR escolhe serviço, entra e abre a aba Fila', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockQueuePublicApis(page);

    await page.goto(`${BASE}/#/queue/barbearia-qa`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: PROFILE.business_name })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Qual serviço você quer hoje?' })).toBeVisible();
    await expect(page.getByText('recepção', { exact: false })).toHaveCount(0);

    await page.getByRole('button', { name: /Corte/i }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(page.getByRole('heading', { name: 'Seus dados' })).toBeVisible();
    await page.getByPlaceholder('Como quer ser chamado').fill('Joao QA');
    const phone = page.locator('input[type="tel"], input[inputmode="numeric"]').first();
    if (await phone.count()) {
      await phone.fill('11988887777');
    }
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(page.getByRole('heading', { name: 'Como prefere pagar?' })).toBeVisible();
    await page.getByRole('button', { name: /Pagar no balcão/i }).click();
    await page.getByRole('button', { name: 'Confirmar e entrar na fila' }).click();

    await expect(page).toHaveURL(/minha-area\/barbearia-qa.*tab=fila/);
    await expect(page.getByRole('button', { name: 'Fila', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Você é o próximo' })).toBeVisible();
    await expect(page.getByText('Você pode sair e voltar. Ao ser chamado, terá 10 min para chegar.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sair da fila' })).toBeVisible();
  });

  test('MB WAY mostra o número da casa e só entra depois de Já paguei', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockQueuePublicApis(page, {
      profile: PROFILE_PT,
      pixConfig: {
        pix_key_value: null,
        pix_key_type: null,
        pix_holder_name: null,
        pix_merchant_city: null,
        mbway_phone: '912345678',
        mbway_holder_name: 'Barbearia QA',
      },
      paymentStatus: 'awaiting_confirmation',
    });

    await page.goto(`${BASE}/#/queue/barbearia-qa`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: PROFILE.business_name })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Corte/i }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByPlaceholder('Como quer ser chamado').fill('Joao QA');
    const phone = page.locator('input[type="tel"], input[inputmode="numeric"]').first();
    if (await phone.count()) {
      await phone.fill('912345678');
    }
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(page.getByRole('heading', { name: 'Como prefere pagar?' })).toBeVisible();
    await page.getByRole('button', { name: /MB WAY — ver número/ }).click();
    await expect(page.getByTestId('queue-mbway-pay')).toBeVisible();
    await expect(page.getByText('Barbearia QA')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Já paguei — entrar na fila' })).toBeDisabled();
    await expect(page).toHaveURL(/queue\/barbearia-qa/);
    await expect(page.getByRole('button', { name: 'Já paguei — entrar na fila' })).toBeEnabled({ timeout: 3000 });
    await page.getByRole('button', { name: 'Já paguei — entrar na fila' }).click();
    await expect(page).toHaveURL(/minha-area\/barbearia-qa.*tab=fila/);
  });

  test('prazo esgotado troca o título verde da chamada', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const calledAt = new Date(Date.now() - 12 * 60 * 1000).toISOString();
    await seedClientSession(page);
    await mockQueuePublicApis(page, {
      entryStatus: 'calling',
      calledAt,
      lateMinutes: 2,
      paymentStatus: 'unpaid',
    });

    await page.goto(`${BASE}/#/minha-area/barbearia-qa?tab=fila`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'O prazo para chegar acabou' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Prazo esgotado')).toBeVisible();
    await expect(page.getByRole('heading', { name: /é a sua vez/i })).toHaveCount(0);
  });

  test('atendimento concluído só oferece agendar, sem nova senha', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedClientSession(page);
    await mockQueuePublicApis(page, { entryStatus: 'completed', paymentStatus: 'paid' });

    await page.goto(`${BASE}/#/minha-area/barbearia-qa?tab=fila`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Atendimento concluído' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('link', { name: 'Iniciar agendamento' })).toBeVisible();
    await expect(page.getByText('Pegar outra senha')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Entrar na fila/ })).toHaveCount(0);
  });
});
