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

async function fulfillRpc(route: Route, payload: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

async function mockQueuePublicApis(page: Page) {
  const calls: Record<string, number> = {};
  const bump = (name: string) => {
    calls[name] = (calls[name] ?? 0) + 1;
    return calls[name];
  };

  await page.route('**/rest/v1/rpc/**', async (route) => {
    const url = route.request().url();
    if (url.includes('get_public_profile_by_slug')) {
      return fulfillRpc(route, PROFILE);
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
    if (url.includes('membership') || url.includes('pix_config') || url.includes('pix_key')) {
      return fulfillRpc(route, null);
    }
    if (url.includes('get_public_client_by_phone')) {
      return fulfillRpc(route, []);
    }
    if (url.includes('upsert_public_client')) {
      return fulfillRpc(route, [{
        id: 'client-e2e',
        name: 'Joao QA',
        phone: '11988887777',
        business_id: PROFILE.id,
      }]);
    }
    if (url.includes('find_active_queue_entry_by_phone')) {
      bump('find_active');
      // Antes de entrar não há senha ativa (a tela consulta mais de uma vez); depois do join, há.
      if (!calls.join_queue_entry) {
        return fulfillRpc(route, []);
      }
      return fulfillRpc(route, [{
        id: 'queue-e2e',
        business_id: PROFILE.id,
        client_name: 'Joao QA',
        client_phone: '11988887777',
        service_id: 'svc-corte',
        status: 'waiting',
        joined_at: new Date().toISOString(),
        payment_status: 'unpaid',
      }]);
    }
    if (url.includes('join_queue_entry')) {
      bump('join_queue_entry');
      return fulfillRpc(route, { id: 'queue-e2e', business_id: PROFILE.id });
    }
    if (url.includes('get_queue_public_board')) {
      return fulfillRpc(route, {
        entryId: 'queue-e2e',
        status: 'waiting',
        paymentStatus: 'unpaid',
        serviceName: 'Corte',
        position: 1,
        etaMinutes: 0,
        people: [{ position: 1, firstName: 'Joao', isYou: true }],
        settings: { allowLeave: true, lateMinutes: 10 },
        calledAt: null,
      });
    }
    return fulfillRpc(route, []);
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

    const artifactsDir = process.env.E2E_ARTIFACTS_DIR;
    if (artifactsDir) {
      await page.screenshot({
        path: `${artifactsDir}/screenshots/fila_v2_minha_area_tab_fila.png`,
        fullPage: true,
      });
    }
  });
});
