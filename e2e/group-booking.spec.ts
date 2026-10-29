import { test, expect, type Page } from '@playwright/test';

const SHOTS = process.env.GROUP_SHOTS_DIR || 'work/group-booking';
const OWNER = '00000000-0000-4000-8000-00000000000a';
const HOLDER = '10000000-0000-4000-8000-000000000001';
const PRO_A = '20000000-0000-4000-8000-000000000001';
const PRO_B = '20000000-0000-4000-8000-000000000002';
const SERVICE_A = '30000000-0000-4000-8000-000000000001';
const SERVICE_B = '30000000-0000-4000-8000-000000000002';
const SERVICE_NO_PRICE = '30000000-0000-4000-8000-000000000003';
const CATEGORY = '60000000-0000-4000-8000-000000000001';
const DEP = '40000000-0000-4000-8000-000000000001';
const HOST = 'group-e2e.supabase.co';

const hours = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => [day, { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] }]));
const services = [
  { id: SERVICE_A, user_id: OWNER, name: 'Corte Fictício', price: 40, duration_minutes: 30, active: true, category_id: CATEGORY },
  { id: SERVICE_B, user_id: OWNER, name: 'Tratamento Fictício', price: 90, duration_minutes: 60, active: true, category_id: CATEGORY },
];
const team = [
  { id: PRO_A, user_id: OWNER, name: 'Ana Fictícia', active: true, is_owner: true, photo_url: null },
  { id: PRO_B, user_id: OWNER, name: 'Bia Fictícia', active: true, is_owner: false, photo_url: null },
];

async function shot(page: Page, name: string) {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false, animations: 'disabled' });
}

async function mockInternal(page: Page, theme: 'beauty' | 'barber') {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const user = { id: OWNER, email: 'fictional@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const session = { user, access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: OWNER, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 })}.fictional`, refresh_token: 'fictional', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, token_type: 'bearer' };
  await page.addInitScript(({ session, theme }) => {
    localStorage.setItem('sb-group-e2e-auth-token', JSON.stringify(session));
    localStorage.setItem('agendix_color_mode', theme === 'beauty' ? 'light' : 'dark');
    window.open = () => null;
  }, { session, theme });
  const client = { id: HOLDER, user_id: OWNER, name: 'Titular Fictício', phone: '11900000000', email: 'holder@example.test', is_active: true, total_visits: 0 };
  const dependents = [{ id: DEP, user_id: OWNER, client_id: HOLDER, name: 'Dependente Fictício', nickname: null, notes: null, is_active: true }];
  const creates: Record<string, unknown>[] = [];
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    if (url.hostname !== HOST) return route.abort();
    let body: unknown = [];
    const p = url.pathname;
    if (p.includes('/auth/v1/user')) body = user;
    else if (p.includes('/auth/v1/')) body = session;
    else if (p.endsWith('/profiles')) body = [{ id: OWNER, role: 'owner', company_id: OWNER, full_name: 'Pessoa Fictícia', business_name: 'Negócio Fictício', user_type: theme, region: 'BR', subscription_status: 'active', tutorial_completed: true, public_booking_enabled: true }];
    else if (p.endsWith('/business_settings')) body = [{ user_id: OWNER, timezone: 'America/Sao_Paulo', business_hours: hours, onboarding_completed: true }];
    else if (p.endsWith('/onboarding_progress')) body = [{ is_completed: true }];
    else if (p.endsWith('/team_members')) body = team;
    else if (p.endsWith('/clients')) body = [client];
    else if (p.endsWith('/services')) body = services;
    else if (p.endsWith('/service_categories')) body = [{ id: CATEGORY, user_id: OWNER, name: 'Serviços', sort_order: 1 }];
    else if (p.endsWith('/client_dependents')) body = dependents;
    else if (p.endsWith('/rpc/create_internal_attendee_bookings_v2')) {
      creates.push(request.postDataJSON());
      body = { success: true, booking_id: '50000000-0000-4000-8000-000000000001', booking_ids: ['50000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002'] };
    }
    if (Array.isArray(body) && request.headers().accept?.includes('vnd.pgrst.object+json')) body = body[0] || null;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
  return { creates };
}

async function mockPublic(page: Page, theme: 'beauty' | 'barber') {
  await page.addInitScript(() => { window.open = () => null; });
  const groupCalls: Record<string, unknown>[] = [];
  const slotCalls: Record<string, unknown>[] = [];
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    if (url.hostname !== HOST) return route.abort();
    const p = url.pathname;
    let body: unknown = [];
    if (p.endsWith('/rpc/get_public_profile_by_slug')) body = { id: OWNER, slug: 'negocio-ficticio', business_name: 'Negócio Fictício', user_type: theme, region: 'BR', phone: '11900000000', public_booking_enabled: true };
    else if (p.endsWith('/rpc/get_public_business_settings_json')) body = { timezone: 'America/Sao_Paulo', business_hours: hours, booking_lead_time_minutes: 0, auto_confirm_online_bookings: true };
    else if (p.endsWith('/rpc/get_public_services_catalog')) body = [...services, { id: SERVICE_NO_PRICE, name: 'Serviço Sem Preço', price: 0, duration_minutes: 30, active: true, category_id: CATEGORY }];
    else if (p.endsWith('/rpc/get_public_categories_catalog')) body = [{ id: CATEGORY, name: 'Serviços' }];
    else if (p.endsWith('/rpc/get_public_team_catalog')) body = team.map(({ id, name, photo_url }) => ({ id, name, photo_url }));
    else if (p.endsWith('/rpc/get_public_products_catalog') || p.endsWith('/rpc/get_public_gallery_catalog')) body = [];
    else if (p.endsWith('/rpc/get_available_slots_v2')) {
      const args = request.postDataJSON();
      slotCalls.push(args);
      body = { slots: args.p_professional_id === PRO_A ? ['09:00', '10:00', '11:00'] : ['10:00', '11:00', '15:00'], lead_time_hours: 0, lead_time_minutes: 0 };
    } else if (p.endsWith('/rpc/get_full_dates_v2')) body = [];
    else if (p.endsWith('/rpc/create_public_group_booking')) {
      const args = request.postDataJSON();
      groupCalls.push(args);
      body = (args.p_people as Array<{ attendee_name?: string; professional_id: string; service_ids: string[] }>).map((person, index) => ({
        id: `7000000${index}-0000-4000-8000-000000000001`, status: 'confirmed', appointment_time: args.p_appointment_time,
        professional_id: person.professional_id, service_ids: person.service_ids, total_price: person.service_ids.includes(SERVICE_A) ? 40 : 90,
        attendee_name: person.attendee_name ?? null, customer_name: args.p_customer_name, customer_phone: args.p_customer_phone,
        group_id: '80000000-0000-4000-8000-000000000001', group_position: index,
      }));
    } else if (p.endsWith('/rpc/upsert_public_client')) body = [{ id: HOLDER, name: 'Titular Fictício', phone: '11900000000' }];
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
  return { groupCalls, slotCalls };
}

for (const theme of ['beauty', 'barber'] as const) {
  test(`agenda interna: titular e dependente com profissionais diferentes, ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { creates } = await mockInternal(page, theme);
    await page.goto('/#/agenda');
    await page.getByRole('button', { name: /Novo Agendamento/ }).first().click();
    await page.getByRole('button', { name: /Novo atendimento Marcar cliente/ }).click();
    await page.getByRole('button', { name: /Buscar cliente por nome ou telefone/ }).click();
    await page.getByText('Titular Fictício', { exact: true }).last().click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByText('Corte Fictício', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Adicionar outra pessoa' }).click();
    const card = page.getByTestId('extra-attendee-card');
    await card.getByRole('combobox', { name: 'Para quem?' }).selectOption(DEP);
    await card.getByText('Tratamento Fictício', { exact: true }).click();
    await card.getByTestId('extra-attendee-professional').selectOption(PRO_B);
    await expect(card.getByText('Serviço avulso')).toHaveCount(0);
    await card.scrollIntoViewIfNeeded();
    await shot(page, `interno-${theme}-1-servicos-por-pessoa`);
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: 'Ana Fictícia', exact: true }).click();
    await page.getByRole('button', { name: '14:00', exact: true }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    const rows = page.getByTestId('group-review-person');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Ana Fictícia');
    await expect(rows.nth(0)).toContainText('14:00');
    await expect(rows.nth(1)).toContainText('Dependente Fictício');
    await expect(rows.nth(1)).toContainText('Bia Fictícia');
    await expect(rows.nth(1)).toContainText('14:00');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await shot(page, `interno-${theme}-2-confirmacao`);
    await page.getByRole('button', { name: 'Confirmar Atendimento', exact: true }).click();
    await expect.poll(() => creates.length).toBe(1);
    expect(creates[0]).toMatchObject({ p_business_id: OWNER, p_client_id: HOLDER, p_professional_id: PRO_A });
    expect(creates[0].p_attendees).toEqual([
      expect.objectContaining({ service_ids: [SERVICE_A] }),
      expect.objectContaining({ dependent_id: DEP, service_ids: [SERVICE_B], professional_id: PRO_B }),
    ]);
  });

  test(`agendamento online: duas pessoas com profissionais diferentes, ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { groupCalls, slotCalls } = await mockPublic(page, theme);
    await page.goto('/#/book/negocio-ficticio');
    await expect(page.getByText('Serviço Sem Preço')).toHaveCount(0);
    await page.getByTestId('group-booking-entry').click();
    await expect(page.getByTestId('group-booking')).toBeVisible();
    await page.getByRole('button', { name: /Corte Fictício/ }).click();
    await page.getByRole('group', { name: 'Profissional' }).getByRole('button', { name: /Ana Fictícia/ }).click();
    await page.getByTestId('group-person-tab-1').click();
    await page.getByLabel(/Nome da pessoa 2/).fill('Caio Fictício');
    await page.getByRole('button', { name: /Tratamento Fictício/ }).click();
    await page.getByRole('group', { name: 'Profissional' }).getByRole('button', { name: /Bia Fictícia/ }).click();
    await shot(page, `online-${theme}-1-pessoas`);
    await page.getByTestId('group-next').click();
    await page.getByLabel('Próximo mês').click();
    await page.locator('button[data-date$="-15"]').first().click();
    await expect(page.getByRole('button', { name: '10:00', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '09:00', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '15:00', exact: true })).toHaveCount(0);
    expect(slotCalls.map(call => [call.p_professional_id, call.p_duration_min]).sort()).toEqual([[PRO_A, 30], [PRO_B, 60]].sort());
    await shot(page, `online-${theme}-2-horarios`);
    await page.getByRole('button', { name: '10:00', exact: true }).click();
    await page.getByTestId('group-next').click();
    const people = page.getByTestId('group-confirm-person');
    await expect(people).toHaveCount(2);
    await expect(people.nth(1)).toContainText('Bia Fictícia');
    await page.locator('#group-customer-name').fill('Marina Fictícia');
    await page.locator('input[type="tel"]').fill('11 90000-0000');
    await page.locator('label[for="group-privacy"] > span').first().click();
    await expect(page.locator('#group-privacy')).toBeChecked();
    await shot(page, `online-${theme}-3-confirmacao`);
    await page.getByTestId('group-submit').click();
    await expect(page.getByTestId('group-booking-success')).toBeVisible();
    await expect(page.getByTestId('group-booking-success-person')).toHaveCount(2);
    expect(groupCalls).toHaveLength(1);
    expect(groupCalls[0].p_people).toEqual([
      { professional_id: PRO_A, service_ids: [SERVICE_A] },
      { attendee_name: 'Caio Fictício', professional_id: PRO_B, service_ids: [SERVICE_B] },
    ]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await shot(page, `online-${theme}-4-sucesso`);
  });
}
