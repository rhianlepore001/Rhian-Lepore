import { test, expect, type Page } from '@playwright/test';

// Pedido em grupo: nomes de cada pessoa nos pedidos do dono e mensagem de WhatsApp com os profissionais.
// Tudo com dados fictícios e Supabase simulado; nenhuma mensagem é enviada.
//   npx playwright test -c e2e/group-booking-names.config.ts
const SHOTS = process.env.GROUP_NAMES_SHOTS_DIR || 'work/group-booking-names';
const HOST = 'names-e2e.supabase.co';
const OWNER = '00000000-0000-4000-8000-00000000000a';
const PROS = [
  { id: '20000000-0000-4000-8000-000000000001', name: 'Carla Exemplo' },
  { id: '20000000-0000-4000-8000-000000000002', name: 'Juliana Exemplo' },
  { id: '20000000-0000-4000-8000-000000000003', name: 'Renata Exemplo' },
];
const CATEGORY = '60000000-0000-4000-8000-000000000001';
const SERVICES = {
  beauty: [
    { id: '30000000-0000-4000-8000-000000000001', name: 'Escova', price: 60, duration_minutes: 30 },
    { id: '30000000-0000-4000-8000-000000000002', name: 'Manicure', price: 45, duration_minutes: 30 },
    { id: '30000000-0000-4000-8000-000000000003', name: 'Corte Feminino', price: 80, duration_minutes: 30 },
  ],
  barber: [
    { id: '30000000-0000-4000-8000-000000000001', name: 'Corte Masculino', price: 40, duration_minutes: 30 },
    { id: '30000000-0000-4000-8000-000000000002', name: 'Barba', price: 30, duration_minutes: 30 },
    { id: '30000000-0000-4000-8000-000000000003', name: 'Corte e Barba', price: 65, duration_minutes: 30 },
  ],
} as const;
const BUSINESS = { beauty: 'Studio Exemplo', barber: 'Barbearia Exemplo' } as const;
const PEOPLE = ['Mariana Exemplo', 'Ana Exemplo', 'Bia Exemplo'];
const hours = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => [day, { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] }]));
const GROUP = '80000000-0000-4000-8000-000000000001';

type Theme = 'beauty' | 'barber';

async function shot(page: Page, name: string) {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false, animations: 'disabled' });
}

const ok = (body: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });

async function mockPublic(page: Page, theme: Theme) {
  await page.addInitScript(() => { window.open = () => null; });
  const services = SERVICES[theme].map(s => ({ ...s, user_id: OWNER, active: true, category_id: CATEGORY }));
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    if (url.hostname !== HOST) return route.abort();
    const p = url.pathname;
    let body: unknown = [];
    if (p.endsWith('/rpc/get_public_profile_by_slug')) body = { id: OWNER, slug: 'negocio-exemplo', business_name: BUSINESS[theme], user_type: theme, region: 'BR', phone: '11900000000', public_booking_enabled: true };
    else if (p.endsWith('/rpc/get_public_business_settings_json')) body = { timezone: 'America/Sao_Paulo', business_hours: hours, booking_lead_time_minutes: 0, auto_confirm_online_bookings: false };
    else if (p.endsWith('/rpc/get_public_services_catalog')) body = services;
    else if (p.endsWith('/rpc/get_public_categories_catalog')) body = [{ id: CATEGORY, name: 'Serviços' }];
    else if (p.endsWith('/rpc/get_public_team_catalog')) body = PROS.map(pro => ({ ...pro, photo_url: null }));
    else if (p.endsWith('/rpc/get_available_slots_v2')) body = { slots: ['10:00', '11:00'], lead_time_hours: 0, lead_time_minutes: 0 };
    else if (p.endsWith('/rpc/create_public_group_booking')) {
      const args = request.postDataJSON();
      body = (args.p_people as Array<{ attendee_name?: string; professional_id: string; service_ids: string[] }>).map((person, index) => ({
        id: `7000000${index}-0000-4000-8000-000000000001`, status: 'pending', appointment_time: args.p_appointment_time,
        professional_id: person.professional_id, service_ids: person.service_ids,
        total_price: services.find(s => s.id === person.service_ids[0])?.price ?? 0,
        attendee_name: person.attendee_name ?? null, customer_name: args.p_customer_name, customer_phone: args.p_customer_phone,
        group_id: GROUP, group_position: index,
      }));
    } else if (p.endsWith('/rpc/upsert_public_client')) body = [{ id: '10000000-0000-4000-8000-000000000001', name: PEOPLE[0], phone: '11900000000' }];
    await route.fulfill(ok(body));
  });
}

async function mockOwner(page: Page, theme: Theme) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const user = { id: OWNER, email: 'fictional@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const session = { user, access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: OWNER, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 })}.fictional`, refresh_token: 'fictional', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, token_type: 'bearer' };
  await page.addInitScript(({ session, theme }) => {
    localStorage.setItem('sb-names-e2e-auth-token', JSON.stringify(session));
    localStorage.setItem('agendix_color_mode', theme === 'beauty' ? 'light' : 'dark');
    window.open = () => null;
  }, { session, theme });
  const services = SERVICES[theme].map(s => ({ ...s, user_id: OWNER, active: true, category_id: CATEGORY }));
  const start = '2026-11-03T13:00:00Z';
  const pending = PEOPLE.map((name, index) => ({
    id: `7000000${index}-0000-4000-8000-000000000001`, business_id: OWNER, status: 'pending', appointment_time: start,
    customer_name: PEOPLE[0], customer_phone: '11900000000', attendee_name: index === 0 ? null : name,
    group_id: GROUP, group_position: index, professional_id: PROS[index].id, service_ids: [services[index].id],
    total_price: services[index].price, duration_minutes: 30, is_edit: false,
  }));
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    if (url.hostname !== HOST) return route.abort();
    let body: unknown = [];
    const p = url.pathname;
    if (p.includes('/auth/v1/user')) body = user;
    else if (p.includes('/auth/v1/')) body = session;
    else if (p.endsWith('/profiles')) body = [{ id: OWNER, role: 'owner', company_id: OWNER, full_name: 'Pessoa Exemplo', business_name: BUSINESS[theme], user_type: theme, region: 'BR', subscription_status: 'active', tutorial_completed: true, public_booking_enabled: true }];
    else if (p.endsWith('/business_settings')) body = [{ user_id: OWNER, timezone: 'America/Sao_Paulo', business_hours: hours, onboarding_completed: true }];
    else if (p.endsWith('/onboarding_progress')) body = [{ is_completed: true }];
    else if (p.endsWith('/team_members')) body = PROS.map(pro => ({ ...pro, user_id: OWNER, active: true, is_owner: false, photo_url: null }));
    else if (p.endsWith('/services')) body = services;
    else if (p.endsWith('/service_categories')) body = [{ id: CATEGORY, user_id: OWNER, name: 'Serviços', sort_order: 1 }];
    else if (p.endsWith('/rpc/list_company_pending_public_bookings')) body = pending;
    if (Array.isArray(body) && request.headers().accept?.includes('vnd.pgrst.object+json')) body = body[0] || null;
    await route.fulfill(ok(body));
  });
}

test.use({ viewport: { width: 390, height: 694 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

for (const theme of ['beauty', 'barber'] as const) {
  test(`pedidos do dono mostram o nome de cada pessoa, ${theme}`, async ({ page }) => {
    await mockOwner(page, theme);
    await page.goto('/#/agenda?date=2026-11-03');
    const box = page.getByTestId('agenda-public-bookings');
    await expect(box).toBeVisible();
    await expect(box.getByText('Mariana Exemplo', { exact: true })).toHaveCount(1);
    await expect(box.getByText('Ana Exemplo (responsável: Mariana Exemplo)')).toBeVisible();
    await expect(box.getByText('Bia Exemplo (responsável: Mariana Exemplo)')).toBeVisible();
    await shot(page, `pedidos-nomes-${theme}-1`);
    await page.mouse.move(195, 500);
    await page.mouse.wheel(0, 330);
    await page.waitForTimeout(400);
    await expect(box.getByText('Bia Exemplo (responsável: Mariana Exemplo)')).toBeInViewport();
    await shot(page, `pedidos-nomes-${theme}-2`);
  });

  test(`mensagem de WhatsApp lista cada pessoa com serviço e profissional, ${theme}`, async ({ page }) => {
    await mockPublic(page, theme);
    const [s1, s2, s3] = SERVICES[theme];
    await page.goto('/#/book/negocio-exemplo');
    await page.getByTestId('group-booking-entry').click();
    const pickPerson = async (service: string, pro: string) => {
      await page.getByRole('button', { name: new RegExp(service) }).first().click();
      await page.getByRole('group', { name: 'Profissional' }).getByRole('button', { name: new RegExp(pro) }).click();
    };
    await pickPerson(s1.name, PROS[0].name);
    await page.getByTestId('group-person-tab-1').click();
    await page.getByLabel(/Nome da pessoa 2/).fill(PEOPLE[1]);
    await pickPerson(s2.name, PROS[1].name);
    await page.getByTestId('group-add-person').click();
    await page.getByLabel(/Nome da pessoa 3/).fill(PEOPLE[2]);
    await pickPerson(s3.name, PROS[2].name);
    await page.getByTestId('group-next').click();
    await page.getByLabel('Próximo mês').click();
    await page.locator('button[data-date$="-15"]').first().click();
    await page.getByRole('button', { name: '10:00', exact: true }).click();
    await page.getByTestId('group-next').click();
    await page.locator('#group-customer-name').fill(PEOPLE[0]);
    await page.locator('input[type="tel"]').fill('11 90000-0000');
    await page.locator('label[for="group-privacy"] > span').first().click();
    await page.getByTestId('group-submit').click();
    await expect(page.getByTestId('group-booking-success')).toBeVisible();
    await expect(page.getByTestId('group-booking-success-person')).toHaveCount(3);

    const link = page.getByTestId('group-booking-success').locator('a[href*="wa.me"]');
    await link.scrollIntoViewIfNeeded();
    await shot(page, `whatsapp-botao-${theme}`);
    const href = (await link.getAttribute('href')) || '';
    const text = new URL(href).searchParams.get('text') || '';
    expect(text).toContain(BUSINESS[theme]);
    expect(text).toContain('3 pessoas');
    expect(text).toContain(`${PEOPLE[0]}: ${s1.name} com ${PROS[0].name}`);
    expect(text).toContain(`${PEOPLE[1]}: ${s2.name} com ${PROS[1].name}`);
    expect(text).toContain(`${PEOPLE[2]}: ${s3.name} com ${PROS[2].name}`);
    expect(text).not.toMatch(/qualquer profissional/i);

    // Prévia do texto exato que o botão abre no WhatsApp (nada é enviado).
    const dark = theme === 'barber';
    const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    await page.setContent(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>
      body{margin:0;font-family:system-ui,sans-serif;background:${dark ? '#0b141a' : '#efeae2'};color:${dark ? '#e9edef' : '#111b21'};height:100vh;display:flex;flex-direction:column}
      header{padding:14px 16px;background:${dark ? '#202c33' : '#008069'};color:#fff;font-weight:600}
      header small{display:block;font-weight:400;opacity:.8;font-size:12px}
      main{flex:1;padding:18px 14px;display:flex;flex-direction:column;justify-content:flex-end}
      .b{align-self:flex-end;max-width:88%;background:${dark ? '#005c4b' : '#d9fdd3'};border-radius:10px 10px 2px 10px;padding:9px 11px;font-size:14.5px;line-height:1.4;white-space:pre-wrap;box-shadow:0 1px 1px rgba(0,0,0,.2)}
      footer{padding:10px 14px;font-size:12px;opacity:.7;text-align:center}
    </style><header>${esc(BUSINESS[theme])}<small>Mensagem pronta, ainda não enviada</small></header><main><div class="b">${esc(text)}</div></main><footer>Prévia do texto que o botão abre no WhatsApp</footer>`);
    await shot(page, `whatsapp-mensagem-${theme}`);
  });
}
