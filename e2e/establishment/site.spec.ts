import { expect, test, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';

const shots = '/opt/cursor/artifacts/presenca/mesclado';
const owner = 'b0000000-0000-4000-8000-000000000001';
const serviceId = 'b0000000-0000-4000-8000-000000000020';
const teamId = 'b0000000-0000-4000-8000-000000000030';
const profile = { id: owner, business_slug: 'mock-house', business_name: 'Casa Mock (fictícia)', user_type: 'barber', region: 'BR', address_street: 'Rua Teste, 20 — Pinheiros, São Paulo', phone: null, cover_photo_url: '/demo/barbearia/capa.webp', role: 'owner', company_id: owner, full_name: 'Dono Fictício', tutorial_completed: true, subscription_status: 'active', trial_ends_at: null };
const config = { style: 'dark', headline: 'Barbearia em Pinheiros', about: 'Corte com hora marcada.', accent: '#C89B79', offer: { enabled: false, title: '', condition: '' }, differences: ['Atendimento reservado.'], faq: [], sections: [{ id: 'services', enabled: true }, { id: 'gallery', enabled: true }, { id: 'team', enabled: true }, { id: 'reviews', enabled: true }, { id: 'faq', enabled: true }, { id: 'location', enabled: true }], seoTitle: 'Casa Mock — barbearia em Pinheiros', seoDescription: 'Cortes com hora marcada em Pinheiros.' };
const catalog = {
  get_public_establishment_site: { config },
  get_public_profile_by_slug: profile,
  get_public_business_settings_json: { business_hours: { mon: { isOpen: true, blocks: [{ start: '09:00', end: '20:00' }] }, sun: { isOpen: false, blocks: [] } } },
  get_public_services_catalog: [{ id: serviceId, name: 'Corte com tesoura', description: 'Corte personalizado.', price: 50, duration_minutes: 30, active: true, image_url: '/demo/barbearia/servico-corte-masculino.webp' }],
  get_public_team_catalog: [{ id: teamId, name: 'Profissional Ativo', active: true, deleted_at: null, photo_url: '/demo/barbearia/perfil.webp' }, { id: 'old-team', name: 'Ex Profissional', active: false, photo_url: '/demo/barbearia/perfil.webp' }, { id: 'deleted-team', name: 'Removido', active: true, deleted_at: '2026-01-01' }],
  get_public_gallery_catalog: [],
  get_public_customer_reviews: { average: 4.8, total: 1, reviews: [{ id: 'review1', rating: 5, comment: 'Ótimo corte. Meu contato é cliente@example.test ou 11999998888.', customer_name: 'Nome Completo Privado', customer_phone: '11999998888' }] },
};

async function json(route: Route, body: unknown, status = 200) {
  const single = route.request().headers().accept?.includes('vnd.pgrst.object+json');
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(single && Array.isArray(body) ? body[0] ?? null : body) });
}

async function mockPublic(page: Page, published = true, authenticated = false) {
  const calls: string[] = [];
  const user = { id: owner, email: 'owner@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Dono Fictício' }, created_at: '2026-01-01T00:00:00Z' };
  const jwtPart = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${jwtPart({ alg: 'HS256', typ: 'JWT' })}.${jwtPart({ sub: owner, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 })}.fake-signature`, refresh_token: 'test-refresh', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, token_type: 'bearer', user };
  if (authenticated) await page.addInitScript(({ session }) => localStorage.setItem('sb-presence-e2e-auth-token', JSON.stringify(session)), { session });
  await page.route('**/*.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.split('/').pop() || '';
    calls.push(endpoint);
    if (url.pathname.includes('/auth/')) return json(route, endpoint === 'user' ? user : session);
    if (endpoint in catalog) return json(route, endpoint === 'get_public_establishment_site' && !published ? null : catalog[endpoint as keyof typeof catalog]);
    if (endpoint === 'profiles') return json(route, [profile]);
    if (endpoint === 'establishment_sites') return json(route, { code: 'PGRST205', message: 'Table not found' }, 404);
    if (endpoint === 'get_auth_company_id') return json(route, owner);
    if (endpoint === 'get_auth_role') return json(route, 'owner');
    return json(route, []);
  });
  return calls;
}

async function finishImages(page: Page) {
  await page.evaluate(async () => {
    document.querySelectorAll('img').forEach(img => img.loading = 'eager');
    await Promise.all([...document.images].map(img => img.decode().catch(() => undefined)));
    await document.fonts.ready;
  });
}

async function scrollControlsTo(page: Page, target: ReturnType<Page['locator']>) {
  await target.evaluate(el => {
    const pane = el.closest('.se-controls');
    if (!(pane instanceof HTMLElement)) return;
    pane.scrollTop += el.getBoundingClientRect().top - pane.getBoundingClientRect().top - 8;
  });
}

async function openEditorSection(page: Page, name: string) {
  const section = page.locator('.se-controls > details').filter({ has: page.locator('summary', { hasText: name }) });
  await section.evaluate(el => { (el as HTMLDetailsElement).open = true; });
  await scrollControlsTo(page, section.locator(':scope > summary'));
}

async function capture(page: Page, name: string, fullPage = false, preserveScroll = false) {
  fs.mkdirSync(shots, { recursive: true });
  if (!preserveScroll) await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await finishImages(page);
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage, animations: 'disabled' });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => route.abort());
  await page.route(/google\.com\/maps/, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
});

for (const [niche, slug, heading, style] of [
  ['barber', 'demo-corte-fino', /barbearia em Pinheiros/i, 'light'],
  ['beauty', 'demo-studio-aurora', /salão em Pinheiros/i, 'light'],
] as const) {
  test(`${niche}: público, conteúdo, SEO e screenshots`, async ({ page }, testInfo) => {
    const requests: string[] = [];
    page.on('request', request => { if (request.url().includes('.supabase.co/')) requests.push(request.url()); });
    await page.goto(`/#/site/${slug}`);
    await expect(page.locator('h1')).toContainText(heading);
    await expect(page.locator('.establishment')).toHaveAttribute('data-style', style);
    await expect(page.locator('.es-demo')).toContainText('fictícios');
    await expect(page.locator('.es-services article')).toHaveCount(3);
    await expect(page.locator('.es-team article')).toHaveCount(3);
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    const width = page.viewportSize()!.width;
    const height = page.viewportSize()!.height;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (testInfo.project.name.startsWith('mobile')) {
      await expect(page.locator('.es-hero-media')).toBeInViewport();
      await expect(page.locator('.es-sticky')).toBeVisible();
      await expect(page.locator('.es-header-cta .es-button')).toBeHidden();
      const services = await page.locator('#services h2').boundingBox();
      expect(services, 'a dobra precisa mostrar um indício da seção Serviços').toBeTruthy();
      expect(services!.y).toBeLessThan(height - 70);
    } else {
      await expect(page.locator('.es-sticky')).toBeHidden();
      await expect(page.locator('.es-header-nav')).toBeVisible();
      await expect(page.locator('.es-header-cta .es-button')).toBeVisible();
      const headerX = (await page.locator('.es-wordmark').boundingBox())!.x;
      const heroX = (await page.locator('.es-hero-copy h1').boundingBox())!.x;
      const servicesX = (await page.locator('#services h2').boundingBox())!.x;
      expect(Math.abs(heroX - headerX)).toBeLessThan(3);
      expect(Math.abs(servicesX - headerX)).toBeLessThan(3);
    }
    if (testInfo.project.name.startsWith('desktop')) await expect(page.locator('.es-hero-actions .es-button')).toBeInViewport();
    else await expect(page.locator('.es-sticky .es-button')).toBeInViewport();
    await expect(page.locator('.es-wordmark')).toContainText(niche === 'barber' ? 'Corte Fino' : 'Studio Aurora');
    await expect(page.locator('.es-offer')).not.toContainText(/oferta na primeira visita/i);
    if (niche === 'beauty') await expect(page.locator('.es-offer')).toContainText('Hidratação de presente');
    await capture(page, `${niche}-${width}-fold`);
    await capture(page, `${niche}-${width}-full`, true);
    expect(requests).toHaveLength(0);
  });

  test(`${niche}: detalhes e agendamento contextual usam fluxo existente`, async ({ page }) => {
    await page.goto(`/#/site/${slug}`);
    await page.locator('.es-service-more').first().click();
    await expect(page.locator('h1')).toContainText(niche === 'barber' ? 'Corte masculino' : 'Corte feminino');
    await expect(page.getByRole('heading', { name: 'O que inclui' })).toBeVisible();
    await capture(page, `${niche}-${page.viewportSize()!.width}-service`, true);
    await page.getByRole('button', { name: 'Agendar este serviço', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const frame = page.frameLocator('iframe[title="Agendamento do estabelecimento"]');
    const selected = frame.getByRole('button', { name: niche === 'barber' ? /Corte masculino/ : /Corte feminino/ });
    await expect(selected).toHaveAttribute('aria-pressed', 'true');
    await expect(frame.getByRole('heading', { name: 'Escolha seus serviços' })).toBeVisible();
    await capture(page, `${niche}-${page.viewportSize()!.width}-booking`);
    await page.getByRole('button', { name: 'Fechar agendamento' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
}

test('oferta e profissional conservam contexto sem aplicar desconto fictício', async ({ page }) => {
  await page.goto('/#/site/demo-corte-fino');
  await page.locator('.es-sticky .es-button, .es-header-cta .es-button').filter({ visible: true }).click();
  await expect(page.locator('.es-booking-header')).toContainText('preço de tabela');
  await expect(page.locator('iframe[title="Agendamento do estabelecimento"]')).toHaveAttribute('src', /rebook=/);
  await page.getByRole('button', { name: 'Fechar agendamento' }).click();
  await page.getByRole('button', { name: 'Agendar com Rafael' }).click();
  await expect(page.locator('iframe[title="Agendamento do estabelecimento"]')).toHaveAttribute('src', /pro=d0000000-0000-4000-8001-000000000030/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('cadastro mínimo e fotos de celular continuam um site, não um app', async ({ page }, testInfo) => {
  await page.goto('/#/site/demo-barbearia-do-bairro');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.es-demo')).toContainText('fictícios');
  await expect(page.locator('#team')).toHaveCount(0);
  await expect(page.locator('#gallery')).toHaveCount(0);
  await expect(page.locator('#reviews')).toHaveCount(0);
  const width = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await capture(page, `minimal-${width}-fold`);
  await capture(page, `minimal-${width}-full`, true);
});

test('360–430px: sem rolagem horizontal nos dois estilos', async ({ page }) => {
  for (const slug of ['demo-corte-fino', 'demo-studio-aurora']) {
    for (const width of [360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/#/site/${slug}`);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (width === 360) await capture(page, `${slug}-360-fold`);
    }
  }
});

test('RPCs públicas: publicação, sanitização, equipe vigente e seções vazias', async ({ page }) => {
  const calls = await mockPublic(page);
  await page.goto('/#/site/mock-house');
  await expect(page.locator('h1')).toHaveText('Barbearia em Pinheiros');
  await expect(page).toHaveTitle(config.seoTitle);
  await expect(page.locator('#gallery')).toHaveCount(0);
  await expect(page.locator('#faq')).toHaveCount(0);
  await expect(page.locator('#team')).toContainText('Profissional Ativo');
  await expect(page.locator('body')).not.toContainText('Ex Profissional');
  await expect(page.locator('body')).not.toContainText('Removido');
  await expect(page.locator('body')).not.toContainText('Nome Completo Privado');
  await expect(page.locator('body')).not.toContainText('cliente@example.test');
  await expect(page.locator('body')).not.toContainText('11999998888');
  expect(calls).toContain('get_public_establishment_site');
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() || '{}');
  expect(schema['@type']).toBe('HairSalon');
  expect(schema.address.streetAddress).toContain('Pinheiros');
  expect(schema.hasOfferCatalog.itemListElement[0].price).toBe(50);
});

test('site não publicado mantém acesso ao agendamento legado', async ({ page }) => {
  await mockPublic(page, false);
  await page.goto('/#/site/mock-house');
  await expect(page.getByRole('heading')).toHaveText('Este site ainda não está disponível.');
  await expect(page.getByRole('link', { name: 'Ir para o agendamento' })).toHaveAttribute('href', '/#/book/mock-house');
});

test('links legais do rodapé continuam funcionando entre as entradas pública e produto', async ({ page }) => {
  await mockPublic(page);
  await page.goto('/#/site/demo-corte-fino');
  await page.getByRole('link', { name: 'Privacidade', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Política de Privacidade', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.locator('.es-hero h1')).toContainText(/barbearia em Pinheiros/i);
  await page.getByRole('link', { name: 'Termos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Termos de Uso', exact: true })).toBeVisible();
});

test('editor: prévia ao vivo, estilo, seção e rascunho local', async ({ page }, testInfo) => {
  await page.goto('/#/site-demo/editor/barber');
  await expect(page.getByRole('heading', { name: 'Meu site', exact: true })).toBeVisible();
  await expect(page.getByLabel(/^Frase principal/)).toBeVisible();
  const preview = page.frameLocator('iframe[title="Prévia ao vivo do meu site"]');
  await expect(preview.locator('h1')).toBeVisible();
  await page.getByLabel(/^Frase principal/).fill('Um corte com a sua cara.');
  await expect(preview.locator('h1')).toHaveText('Um corte com a sua cara.');
  if (testInfo.project.name.startsWith('mobile')) {
    const dock = await page.locator('.se-preview-stage').boundingBox();
    expect(dock?.height ?? 0).toBeGreaterThanOrEqual(300);
    await expect(page.getByRole('button', { name: 'Ver em tela cheia' })).toBeVisible();
  }
  await capture(page, `editor-${page.viewportSize()!.width}-preview`, false, true);
  if (testInfo.project.name.startsWith('mobile')) {
    await page.getByRole('button', { name: 'Ver em tela cheia' }).click();
    await expect(page.getByRole('button', { name: 'Voltar ao editor' })).toBeVisible();
    await expect(preview.locator('h1')).toHaveText('Um corte com a sua cara.');
    const full = await page.locator('.se-preview-stage').boundingBox();
    expect(full?.height ?? 0).toBeGreaterThanOrEqual(500);
    await capture(page, `editor-${page.viewportSize()!.width}-fullscreen`, false, true);
    await page.getByRole('button', { name: 'Voltar ao editor' }).click();
    await expect(page.getByLabel(/^Frase principal/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver em tela cheia' })).toBeVisible();
  }
  await scrollControlsTo(page, page.locator('.se-bg'));
  await expect(page.getByRole('radio', { name: /Urbano preciso, recomendada/i })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Personalizada/i })).toBeVisible();
  await openEditorSection(page, 'Estilo e identidade');
  await page.getByRole('button', { name: 'Aa Editorial claro' }).click({ force: true });
  await expect(preview.locator('h1')).toHaveText('Um corte com a sua cara.');
  await expect(preview.locator('.establishment')).toHaveAttribute('data-style', 'light');
  await page.getByRole('radio', { name: /Salão claro, recomendada/i }).evaluate(el => (el as HTMLButtonElement).click());
  await expect(preview.locator('.establishment')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await scrollControlsTo(page, page.locator('.se-bg'));
  await expect(page.getByRole('button', { name: 'Prévia no celular' })).toBeVisible();
  await expect(page.getByLabel(/^Frase principal/)).toHaveCount(1);
  await capture(page, `editor-${page.viewportSize()!.width}-colors`, false, true);
  if (testInfo.project.name.startsWith('mobile')) {
    await page.getByRole('button', { name: 'Prévia no computador' }).click();
    await expect(page.getByRole('button', { name: 'Prévia no computador' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Estilo e identidade', { exact: true })).toBeVisible();
    await expect(page.locator('iframe[title="Prévia ao vivo do meu site"]')).toBeVisible();
    await page.getByRole('button', { name: 'Prévia no celular' }).click();
  }
  await openEditorSection(page, 'Seções e ordem da página');
  await page.getByLabel('Galeria', { exact: true }).evaluate(el => (el as HTMLInputElement).click());
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'salvo neste navegador' })).toBeVisible();
  await capture(page, `editor-${page.viewportSize()!.width}-controls`, true);
  await page.reload();
  await expect(page.getByLabel(/^Frase principal/)).toHaveValue('Um corte com a sua cara.');
  await expect(preview.locator('#preview-gallery')).toHaveCount(0);
});

test('painel autenticado: owner usa rascunho isolado por company_id e fallback identificado', async ({ page }, testInfo) => {
  const calls = await mockPublic(page, true, true);
  await page.goto('/#/configuracoes/meu-site');
  await expect(page.locator('.site-editor h1')).toHaveText('Meu site');
  await expect(page.locator('.se-notice')).toContainText('neste navegador');
  await page.getByLabel(/^Frase principal/).fill('Casa fictícia em Pinheiros.');
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Rascunho salvo' })).toContainText('Nada foi publicado');
  expect(calls).toContain('establishment_sites');
  const storage = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('agendix:presence:')));
  expect(storage).toContain(`agendix:presence:draft:v1:${owner}`);
  await expect(page.getByLabel(/^Frase principal/)).toBeVisible();
  await expect(page.frameLocator('iframe[title="Prévia ao vivo do meu site"]').locator('h1')).toHaveText('Casa fictícia em Pinheiros.');
  await capture(page, `owner-editor-${page.viewportSize()!.width}-preview`, false, true);
  await capture(page, `owner-editor-${page.viewportSize()!.width}-full`, true);
});
