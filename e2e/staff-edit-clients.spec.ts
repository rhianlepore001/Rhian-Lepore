import { test, expect, type Page } from '@playwright/test';

const STAFF = '00000000-0000-4000-8000-000000000001';
const OWNER = '00000000-0000-4000-8000-000000000002';
const CLIENT = '00000000-0000-4000-8000-000000000003';
const REF = 'agendix-fictional';

async function mockClients(page: Page, enabled: boolean, rejection?: '42501' | 'empty') {
  const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: STAFF, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fictional`;
  const user = { id: STAFF, email: 'staff@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const session = { access_token: token, refresh_token: 'fictional', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: `sb-${REF}-auth-token`, value: session });
  let client = { id: CLIENT, user_id: OWNER, name: 'Cliente Fictício', phone: '11900000000', email: 'client@example.test', notes: 'Nota fictícia', birth_date: '2000-01-01', total_visits: 0, last_visit: null, is_active: true };
  const patches: Record<string, unknown>[] = [];
  const requests: string[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return route.continue();
    if (url.hostname !== `${REF}.supabase.co`) return route.abort();
    requests.push(url.pathname);
    let body: unknown = [];
    let status = 200;
    if (url.pathname.includes('/auth/v1/user')) body = user;
    else if (url.pathname.includes('/auth/v1/')) body = session;
    else if (url.pathname.endsWith('/profiles')) {
      const isOwner = url.searchParams.get('id') === `eq.${OWNER}`;
      body = [{ id: isOwner ? OWNER : STAFF, role: isOwner ? 'owner' : 'staff', company_id: OWNER,
        full_name: 'Pessoa Fictícia', business_name: 'Empresa Fictícia', business_slug: 'ficticia',
        user_type: 'beauty', region: 'BR', subscription_status: 'active', tutorial_completed: true,
        trial_ends_at: null, aios_enabled: false, public_booking_enabled: true }];
    } else if (url.pathname.endsWith('/team_members')) body = [{ id: '00000000-0000-4000-8000-000000000004', user_id: OWNER, staff_user_id: STAFF, name: 'Staff Fictício', active: true }];
    else if (url.pathname.endsWith('/business_settings')) body = [{ user_id: OWNER, staff_can_edit_clients: enabled, business_hours: {}, onboarding_completed: true }];
    else if (url.pathname.endsWith('/onboarding_progress')) body = [{ is_completed: true }];
    else if (url.pathname.endsWith('/clients')) {
      expect(url.searchParams.get('user_id')).toBe(`eq.${OWNER}`);
      if (request.method() === 'PATCH') {
        const patch = request.postDataJSON();
        patches.push(patch);
        if (rejection === '42501') { status = 403; body = { code: '42501', message: 'staff_client_edit_forbidden' }; }
        else if (rejection === 'empty') body = null;
        else { client = { ...client, ...patch }; body = { id: CLIENT }; }
      } else body = [client];
    }
    if (Array.isArray(body) && (request.headers().accept || '').includes('vnd.pgrst.object+json')) body = body[0] || null;
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return { patches, requests };
}

for (const width of [390, 1440]) {
  test(`staff leitura com chave desligada (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { requests } = await mockClients(page, false);
    await page.goto('/#/clientes');
    if (width === 390) {
      await page.getByRole('button', { name: 'Mais opções' }).click();
      await page.getByRole('dialog', { name: 'Menu de navegação' }).getByRole('button', { name: 'Clientes', exact: true }).click();
    }
    await page.getByRole('heading', { name: 'Cliente Fictício' }).click();
    await expect(page.getByRole('heading', { name: 'Cliente Fictício' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar cliente', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Desativar cliente' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Salvar observação' })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Observações do cliente' })).toHaveAttribute('readonly', '');
    await expect(page.getByText('Total gasto')).toHaveCount(0);
    expect(requests).not.toContain('/rest/v1/rpc/get_client_profile');
    expect(requests).not.toContain('/rest/v1/appointments');
  });
  test(`staff edita com chave ligada (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { patches } = await mockClients(page, true);
    await page.goto(`/#/clientes/${CLIENT}`);
    await page.getByRole('button', { name: 'Editar cliente', exact: true }).click();
    await page.getByLabel('Nome completo').fill('Nome Fictício Atualizado');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nome Fictício Atualizado' })).toBeVisible();
    expect(patches[0]).toMatchObject({ name: 'Nome Fictício Atualizado' });
    await page.getByRole('textbox', { name: 'Observações do cliente' }).fill('Nota atualizada fictícia');
    await page.getByRole('button', { name: 'Salvar observação' }).click();
    await expect(page.getByText('Observação salva.', { exact: true })).toBeVisible();
    expect(patches[1]).toEqual({ notes: 'Nota atualizada fictícia' });
    await expect(page.getByRole('button', { name: 'Desativar cliente' })).toHaveCount(0);
  });
}
for (const rejection of ['42501', 'empty'] as const) {
  test(`permissão revogada (${rejection}) não mostra sucesso`, async ({ page }) => {
    await mockClients(page, true, rejection);
    await page.goto(`/#/clientes/${CLIENT}`);
    await page.getByRole('button', { name: 'Editar cliente', exact: true }).click();
    await page.getByLabel('Nome completo').fill('Alteração bloqueada');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByText('Sua permissão não permite editar este cliente. Fale com o gestor.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cliente Fictício' })).toBeVisible();
    await expect(page.getByText('Cliente atualizado.', { exact: true })).toHaveCount(0);
  });
}
