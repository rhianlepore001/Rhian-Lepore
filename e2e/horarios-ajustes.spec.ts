import { test, expect, type Page } from '@playwright/test';

const PHASE = process.env.HOR_PHASE === 'before' ? 'before' : 'after';
const SHOTS = process.env.HOR_SHOTS_DIR || 'work/horarios-ajustes';
const OWNER = '00000000-0000-4000-8000-00000000000a';
const CATEGORY = '60000000-0000-4000-8000-000000000001';
const HOST = 'group-e2e.supabase.co';
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const defaultHours = Object.fromEntries(DAYS.map(day => [day, { isOpen: day !== 'sun', blocks: [{ start: '09:00', end: '18:00' }] }]));
const services = [
  { id: '30000000-0000-4000-8000-000000000001', user_id: OWNER, name: 'Corte Fictício Completo com Acabamento', price: 150, duration_minutes: 90, active: true, category_id: CATEGORY, sort_order: 1 },
  { id: '30000000-0000-4000-8000-000000000002', user_id: OWNER, name: 'Hidratação Fictícia', price: 50, duration_minutes: 45, active: true, category_id: CATEGORY, sort_order: 2 },
];

async function shot(page: Page, name: string) {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/${PHASE}-${name}.png`, fullPage: false, animations: 'disabled' });
}

async function centerHours(page: Page) {
  await page.locator('input[type="time"], select[aria-label$="bloco 1, início (hora)"]').nth(2).evaluate(el => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
}

async function mock(page: Page, theme: 'beauty' | 'barber', mode: 'light' | 'dark') {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const user = { id: OWNER, email: 'fictional@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const session = { user, access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: OWNER, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 })}.fictional`, refresh_token: 'fictional', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, token_type: 'bearer' };
  await page.addInitScript(({ session, mode }) => {
    localStorage.setItem('sb-group-e2e-auth-token', JSON.stringify(session));
    localStorage.setItem('agendix_color_mode', mode);
    window.open = () => null;
  }, { session, mode });
  const db = {
    settings: { id: '90000000-0000-4000-8000-000000000001', user_id: OWNER, timezone: 'America/Sao_Paulo', business_hours: defaultHours, onboarding_completed: true } as Record<string, unknown>,
    saves: [] as Record<string, unknown>[],
    progressCompleted: true,
  };
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    if (url.hostname !== HOST) return route.abort();
    const p = url.pathname;
    const method = request.method();
    let body: unknown = [];
    if (p.includes('/auth/v1/user')) body = user;
    else if (p.includes('/auth/v1/')) body = session;
    else if (p.endsWith('/profiles')) body = [{ id: OWNER, role: 'owner', company_id: OWNER, full_name: 'Pessoa Fictícia', business_name: 'Negócio Fictício', user_type: theme, region: 'BR', subscription_status: 'active', tutorial_completed: true, public_booking_enabled: true }];
    else if (p.endsWith('/business_settings')) {
      if (method === 'POST' || method === 'PATCH') {
        const payload = request.postDataJSON();
        const incoming = Array.isArray(payload) ? payload[0] : payload;
        db.saves.push(incoming);
        db.settings = { ...db.settings, ...incoming };
      }
      body = [db.settings];
    }
    else if (p.endsWith('/onboarding_progress')) body = [{ id: '91000000-0000-4000-8000-000000000001', company_id: OWNER, current_step: 4, completed_steps: [1, 2, 3], is_completed: db.progressCompleted, completed_at: null, step_data: {} }];
    else if (p.endsWith('/rpc/upsert_onboarding_progress') || p.endsWith('/rpc/update_onboarding_step')) body = {};
    else if (p.endsWith('/services')) body = services;
    else if (p.endsWith('/service_categories')) body = [{ id: CATEGORY, user_id: OWNER, name: 'Serviços', display_order: 1 }];
    if (Array.isArray(body) && request.headers().accept?.includes('vnd.pgrst.object+json')) body = body[0] || null;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
  return db;
}

const combos = [
  { theme: 'beauty', mode: 'light' }, { theme: 'beauty', mode: 'dark' },
  { theme: 'barber', mode: 'light' }, { theme: 'barber', mode: 'dark' },
] as const;

for (const { theme, mode } of combos) {
  const tag = `${theme}-${mode}`;

  test(`horários em Ajustes: 24h, cabe no cartão e botão volta ao normal, ${tag}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mock(page, theme, mode);
    await page.goto('/#/configuracoes/geral');
    const section = page.getByRole('heading', { name: 'Horário de Funcionamento' });
    await section.scrollIntoViewIfNeeded();
    await centerHours(page);
    await page.waitForTimeout(600);
    await shot(page, `${tag}-1-ajustes-horarios`);
    if (PHASE === 'before') return;

    const end = page.getByLabel('Segunda-feira, bloco 1, fim (hora)');
    await expect(end).toHaveValue('18');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('input[type="time"]')).toHaveCount(0);
    const card = await end.evaluate(el => {
      const row = el.closest('div[class*="items-center"]')!;
      const cardEl = row.parentElement!.closest('section, div[class*="border"]')!;
      const r = row.getBoundingClientRect();
      const c = cardEl.getBoundingClientRect();
      return { rowRight: r.right, cardRight: c.right };
    });
    expect(card.rowRight).toBeLessThanOrEqual(card.cardRight + 1);

    const save = page.getByRole('button', { name: /Salvar Alterações|Salvo!/ });
    await end.selectOption('20');
    await expect(save).toHaveText(/Salvar Alterações/);
    await save.click();
    await expect(save).toHaveText(/Salvo!/);
    await end.selectOption('21');
    await expect(save).toHaveText(/Salvar Alterações/);
    await expect(save).toBeEnabled();
    await centerHours(page);
    await shot(page, `${tag}-2-ajustes-botao-normal-apos-editar`);
  });

  test(`serviços: preço em uma linha e Escape fecha o modal, ${tag}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mock(page, theme, mode);
    await page.goto('/#/configuracoes/servicos');
    await expect(page.getByText('Hidratação Fictícia').first()).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(400);
    await shot(page, `${tag}-3-servicos-lista`);
    if (PHASE === 'before') return;

    for (const id of services.map(s => s.id)) {
      const rects = await page.getByTestId(`service-price-${id}`).evaluate(el => el.getClientRects().length);
      expect(rects).toBe(1);
    }
    await page.getByRole('button', { name: /Serviço/ }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test(`wizard: horários 24h e Ajustes reflete o que foi salvo, ${tag}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const db = await mock(page, theme, mode);
    await page.goto('/#/configuracoes/geral');
    await expect(page.getByRole('heading', { name: 'Horário de Funcionamento' })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(600);
    db.progressCompleted = false;
    await page.evaluate(() => { window.location.hash = '#/onboarding-wizard'; });
    await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(600);
    await shot(page, `${tag}-4-wizard-horarios`);
    if (PHASE === 'before') {
      await page.locator('input[type="time"]').first().fill('21:00');
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await expect.poll(() => db.saves.length).toBeGreaterThan(0);
      db.progressCompleted = true;
      await page.evaluate(() => { window.location.hash = '#/configuracoes/geral'; });
      await page.waitForTimeout(1200);
      await page.getByRole('heading', { name: 'Horário de Funcionamento' }).scrollIntoViewIfNeeded();
      await centerHours(page);
      await shot(page, `${tag}-5-ajustes-apos-wizard`);
      return;
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel('Segunda-feira, bloco 1, fim (hora)').selectOption('21');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await expect.poll(() => db.saves.length).toBeGreaterThan(0);
    db.progressCompleted = true;
    await page.evaluate(() => { window.location.hash = '#/configuracoes/geral'; });
    await expect(page).toHaveURL(/configuracoes\/geral/);
    await expect(page.getByLabel('Segunda-feira, bloco 1, fim (hora)')).toHaveValue('21');
    await page.getByRole('heading', { name: 'Horário de Funcionamento' }).scrollIntoViewIfNeeded();
    await centerHours(page);
    await shot(page, `${tag}-5-ajustes-apos-wizard`);
  });
}
