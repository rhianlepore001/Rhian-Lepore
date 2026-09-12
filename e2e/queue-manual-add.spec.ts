/**
 * E2E: entrada manual na fila (lista + walk-in + recovery sem Minha Área).
 *
 *   npx playwright test e2e/queue-manual-add.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

const PROFILE = {
  id: 'biz-001',
  business_name: 'Barbearia QA',
  user_type: 'barber',
  region: 'BR',
};

const CLIENTS = [
  { id: 'c-1', name: 'Tales Furtado', phone: '11939064172' },
];

const ENTRY = {
  id: 'queue-e2e',
  business_id: PROFILE.id,
  client_name: 'Tales Furtado',
  client_phone: '11939064172',
  service_id: 'svc-corte',
  status: 'waiting',
  joined_at: new Date().toISOString(),
  payment_status: 'unpaid',
};

async function fulfill(route: Route, payload: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

async function mockManualAddApis(page: Page) {
  await page.route('**/rest/v1/clients**', async (route) => {
    if (route.request().method() === 'GET') return fulfill(route, CLIENTS);
    return fulfill(route, []);
  });
  await page.route('**/rest/v1/rpc/**', async (route) => {
    const url = route.request().url();
    if (url.includes('find_active_queue_entry_by_phone')) return fulfill(route, []);
    if (url.includes('add_manual_queue_entry')) {
      return fulfill(route, { id: ENTRY.id, business_id: PROFILE.id });
    }
    return fulfill(route, []);
  });
}

async function mockClientAreaRecovery(page: Page) {
  await page.route('**/rest/v1/rpc/**', async (route) => {
    const url = route.request().url();
    if (url.includes('get_public_profile_by_slug')) return fulfill(route, PROFILE);
    if (url.includes('get_public_business_settings_json')) {
      return fulfill(route, { enable_self_rescheduling: true });
    }
    if (url.includes('get_public_client_by_phone')) return fulfill(route, []);
    if (url.includes('find_active_queue_entry_by_phone')) return fulfill(route, [ENTRY]);
    if (url.includes('get_queue_entry_public')) return fulfill(route, [ENTRY]);
    if (url.includes('get_queue_public_board')) {
      return fulfill(route, {
        entryId: ENTRY.id,
        status: 'waiting',
        paymentStatus: 'unpaid',
        serviceName: 'Corte',
        position: 1,
        etaMinutes: 0,
        people: [{ position: 1, firstName: 'Tales', isYou: true }],
        settings: { allowLeave: true, lateMinutes: 10 },
        calledAt: null,
      });
    }
    if (url.includes('upsert_public_client')) {
      return fulfill(route, [{
        id: 'public-e2e',
        name: ENTRY.client_name,
        phone: ENTRY.client_phone,
        business_id: PROFILE.id,
      }]);
    }
    if (url.includes('membership') || url.includes('get_client_bookings')) {
      return fulfill(route, []);
    }
    return fulfill(route, []);
  });
}

test.describe('Fila — entrada manual e link', () => {
  test.setTimeout(90_000);

  test('lista de clientes gera o link para acompanhar a senha', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockManualAddApis(page);
    await page.goto(`${BASE}/#/playwright-queue-manual-add`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Adicionar cliente à fila' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('queue-source-list')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Buscar por nome ou telefone')).toBeVisible();
    await page.getByText('Buscar por nome ou telefone').click();
    await page.getByText('Tales Furtado').click();
    await page.getByLabel('Serviço').selectOption('svc-corte');
    await page.getByLabel('Forma de pagamento').selectOption('pix');
    await page.getByRole('button', { name: 'Adicionar à fila' }).click();

    await expect(page.getByTestId('queue-manual-success')).toBeVisible();
    await expect(page.getByText('Tales Furtado entrou na fila.')).toBeVisible();
    await expect(page.getByTestId('queue-tracking-url')).toHaveValue(/minha-area\/barbearia-qa\?tab=fila/);
    await expect(page.getByRole('button', { name: 'Enviar no WhatsApp' })).toBeVisible();
    await expect(page.getByText(/informa o mesmo WhatsApp e vê a posição na fila/)).toBeVisible();
  });

  test('walk-in também mostra o link no final', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockManualAddApis(page);
    await page.goto(`${BASE}/#/playwright-queue-manual-add`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Adicionar cliente à fila' })).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('queue-source-walkin').click();
    await page.getByLabel('Nome').fill('Maria Nova');
    const phone = page.locator('input[type="tel"], input[inputmode="numeric"]').first();
    await phone.fill('11988887777');
    await page.getByLabel('Serviço').selectOption('svc-corte');
    await page.getByLabel('Forma de pagamento').selectOption('cash');
    await page.getByRole('button', { name: 'Adicionar à fila' }).click();

    await expect(page.getByTestId('queue-manual-success')).toBeVisible();
    await expect(page.getByText('Maria Nova entrou na fila.')).toBeVisible();
    await expect(page.getByTestId('queue-tracking-url')).toHaveValue(/tab=fila/);
  });

  test('Minha Área recupera senha mesmo sem cadastro público', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockClientAreaRecovery(page);
    await page.goto(`${BASE}/#/minha-area/barbearia-qa?tab=fila`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Acesse sua área' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/WhatsApp usado ao entrar na fila/)).toBeVisible();
    const phone = page.locator('input[type="tel"], input[inputmode="numeric"]').first();
    await phone.fill('11939064172');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(page.getByText('Criar cadastro')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Você é o próximo' })).toBeVisible({ timeout: 20_000 });
  });
});
