import { test, expect, type Page } from '@playwright/test';

const OWNER = '00000000-0000-4000-8000-00000000000a';
const HOLDER = '10000000-0000-4000-8000-000000000001';
const PRO = '20000000-0000-4000-8000-000000000001';
const SERVICE = '30000000-0000-4000-8000-000000000001';
const DEP = '40000000-0000-4000-8000-000000000001';

async function mockApp(page: Page, theme: 'beauty' | 'barber', role: 'owner' | 'staff' = 'owner') {
  const actor = role === 'owner' ? OWNER : '00000000-0000-4000-8000-00000000000b';
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const user = { id: actor, email: 'fictional@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const session = { user, access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: actor, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 })}.fictional`, refresh_token: 'fictional', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, token_type: 'bearer' };
  await page.addInitScript(({ session, theme }) => {
    localStorage.setItem('sb-dependents-e2e-auth-token', JSON.stringify(session));
    localStorage.setItem('agendix_color_mode', theme === 'beauty' ? 'light' : 'dark');
    window.open = () => null;
  }, { session, theme });
  const client = { id: HOLDER, user_id: OWNER, name: 'Titular Fictício', phone: '11900000000', email: 'holder@example.test', is_active: true, total_visits: 0 };
  let dependents = [{ id: DEP, user_id: OWNER, client_id: HOLDER, name: 'Dependente Fictício', nickname: null, notes: null, is_active: true }];
  const creates: Record<string, unknown>[] = [];
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    if (url.hostname !== 'dependents-e2e.supabase.co') return route.abort();
    let body: unknown = [];
    const p = url.pathname;
    if (p.includes('/auth/v1/user')) body = user;
    else if (p.includes('/auth/v1/')) body = session;
    else if (p.endsWith('/profiles')) body = [{ id: actor, role, company_id: OWNER, full_name: 'Pessoa Fictícia', business_name: 'Negócio Fictício', user_type: theme, region: 'BR', subscription_status: 'active', tutorial_completed: true, public_booking_enabled: true }];
    else if (p.endsWith('/business_settings')) body = [{ user_id: OWNER, timezone: 'America/Sao_Paulo', business_hours: Object.fromEntries(['mon','tue','wed','thu','fri','sat','sun'].map(day => [day,{ isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] }])), onboarding_completed: true }];
    else if (p.endsWith('/onboarding_progress')) body = [{ is_completed: true }];
    else if (p.endsWith('/team_members')) body = [{ id: PRO, user_id: OWNER, name: 'Profissional Fictício', active: true, staff_user_id: role === 'staff' ? actor : null, is_owner: role === 'owner' }];
    else if (p.endsWith('/clients')) body = [client];
    else if (p.endsWith('/rpc/get_client_profile')) body = [{ client, ltv: 0, appointments_history: [] }];
    else if (p.endsWith('/services')) body = [{ id: SERVICE, user_id: OWNER, name: 'Serviço Fictício', price: 40, duration_minutes: 30, active: true }];
    else if (p.endsWith('/client_dependents')) {
      if (request.method() === 'POST') {
        const row = request.postDataJSON();
        expect(row).toMatchObject({ user_id: OWNER, client_id: HOLDER, source: 'manual' });
        expect(row).not.toHaveProperty('phone');
        const saved = { ...row, id: '40000000-0000-4000-8000-000000000002', is_active: true };
        dependents.push(saved); body = saved;
      } else if (request.method() === 'PATCH') {
        expect(role).toBe('owner');
        const id = url.searchParams.get('id')?.slice(3);
        dependents = dependents.map(row => row.id === id ? { ...row, ...request.postDataJSON() } : row);
        body = dependents.find(row => row.id === id);
      } else {
        expect(url.searchParams.get('user_id')).toBe(`eq.${OWNER}`);
        expect(url.searchParams.get('client_id')).toBe(`eq.${HOLDER}`);
        body = dependents.filter(row => row.is_active);
      }
    } else if (p.endsWith('/rpc/create_internal_attendee_bookings')) {
      creates.push(request.postDataJSON());
      body = { success: true, booking_id: '50000000-0000-4000-8000-000000000001', booking_ids: ['50000000-0000-4000-8000-000000000001'] };
    }
    if (Array.isArray(body) && request.headers().accept?.includes('vnd.pgrst.object+json')) body = body[0] || null;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
  return { creates };
}

for (const theme of ['beauty', 'barber'] as const) {
  for (const width of [390, 1440]) {
    test(`CRM CRUD e agendamento só dependente: ${theme}, ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const { creates } = await mockApp(page, theme);
      await page.goto(`/#/clientes/${HOLDER}`);
      await expect(page.getByText('Dependente Fictício', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
      await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Nova Pessoa Fictícia');
      await page.getByRole('textbox', { name: 'Apelido (opcional)' }).fill('Apelido Fictício');
      await page.getByRole('textbox', { name: 'Observações', exact: true }).fill('Observação fictícia');
      await page.getByRole('button', { name: 'Salvar dependente' }).click();
      await expect(page.getByText('Nova Pessoa Fictícia (Apelido Fictício)')).toBeVisible();
      const row = page.locator('li').filter({ hasText: 'Nova Pessoa Fictícia' });
      await row.getByRole('button', { name: 'Editar', exact: true }).click();
      await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Pessoa Fictícia Editada');
      await page.getByRole('button', { name: 'Salvar dependente' }).click();
      await expect(page.getByText('Pessoa Fictícia Editada (Apelido Fictício)')).toBeVisible();
      await page.locator('li').filter({ hasText: 'Pessoa Fictícia Editada' }).getByRole('button', { name: 'Editar', exact: true }).click();
      await page.getByRole('button', { name: 'Remover dependente' }).click();
      await expect(page.getByText('Pessoa Fictícia Editada (Apelido Fictício)')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.goto('/#/agenda');
      await page.getByRole('button', { name: /Novo Agendamento/ }).first().click();
      await page.getByRole('button', { name: /Novo atendimento Marcar cliente/ }).click();
      await page.getByRole('button', { name: /Buscar cliente por nome ou telefone/ }).click();
      await page.getByText('Titular Fictício', { exact: true }).last().click();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await page.getByRole('combobox', { name: 'Para quem?', exact: true }).selectOption(DEP);
      await page.getByText('Serviço Fictício', { exact: true }).click();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await page.getByRole('button', { name: 'Profissional Fictício', exact: true }).click();
      await page.getByRole('button', { name: '14:00', exact: true }).click();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await expect(page.getByText('Responsável: Titular Fictício')).toBeVisible();
      await expect(page.getByText(/Atendido\(a\): Dependente Fictício/)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `work/dependents-${theme}-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Confirmar Atendimento', exact: true }).click();
      await expect.poll(() => creates.length).toBe(1);
      expect(creates[0]).toMatchObject({ p_business_id: OWNER, p_client_id: HOLDER, p_attendees: [{ dependent_id: DEP, service_ids: [SERVICE], total_price: 40 }] });
    });
  }
}

test('staff cadastra dependente, sem editar ou remover os existentes', async ({ page }) => {
  await mockApp(page, 'beauty', 'staff');
  await page.goto(`/#/clientes/${HOLDER}`);
  await expect(page.getByText('Dependente Fictício', { exact: true })).toBeVisible();
  await expect(page.locator('li').filter({ hasText: 'Dependente Fictício' }).getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Pessoa Fictícia Staff');
  await page.getByRole('button', { name: 'Salvar dependente' }).click();
  await expect(page.getByText('Pessoa Fictícia Staff', { exact: true })).toBeVisible();
});
