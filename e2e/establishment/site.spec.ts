import { expect, test, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';

const shots = 'artifacts/visual-critique/presenca';
const owner = 'b0000000-0000-4000-8000-000000000001';
const serviceId = 'b0000000-0000-4000-8000-000000000020';
const teamId = 'b0000000-0000-4000-8000-000000000030';
const profile = { id: owner, business_slug: 'mock-house', business_name: 'Casa Mock (fictícia)', user_type: 'barber', region: 'BR', address_street: 'Rua Teste, 20 — Pinheiros, São Paulo', phone: null, logo_url: '/presenca/demo-logo-barber.svg', cover_photo_url: '/demo/barbearia/capa.webp', role: 'owner', company_id: owner, full_name: 'Dono Fictício', tutorial_completed: true, subscription_status: 'active', trial_ends_at: null };
const beautyProfile = { ...profile, user_type: 'beauty', business_name: 'Studio Mock (fictício)', logo_url: '/presenca/demo-logo-salon.svg', cover_photo_url: '/presenca/rhian/salon-hero.webp' };
const config = { style: 'dark', preset: 'urban', headline: 'Barbearia em Pinheiros', about: 'Corte com hora marcada.', accent: '#C89B79', offer: { enabled: false, title: '', condition: '' }, contact: { addressNote: 'Ao lado do metrô Fradique Coutinho' }, differences: ['Atendimento reservado.'], faq: [], sections: [{ id: 'services', enabled: true }, { id: 'gallery', enabled: true }, { id: 'team', enabled: true }, { id: 'reviews', enabled: true }, { id: 'club', enabled: true }, { id: 'faq', enabled: true }, { id: 'location', enabled: true }], seoTitle: 'Casa Mock — barbearia em Pinheiros', seoDescription: 'Cortes com hora marcada em Pinheiros.' };
const catalog = {
  get_public_establishment_site: { config },
  get_public_profile_by_slug: profile,
  get_public_business_settings_json: { business_hours: { mon: { isOpen: true, blocks: [{ start: '09:00', end: '20:00' }] }, sun: { isOpen: false, blocks: [] } } },
  get_public_categories_catalog: [{ id: 'cat-1', name: 'Cabelo' }],
  get_public_services_catalog: [{ id: serviceId, name: 'Corte com tesoura', category_id: 'cat-1', description: 'Corte personalizado.', price: 50, duration_minutes: 30, active: true, image_url: '/demo/barbearia/servico-corte-masculino.webp' }],
  get_public_team_catalog: [{ id: teamId, name: 'Profissional Ativo', active: true, deleted_at: null, photo_url: '/demo/barbearia/perfil.webp' }, { id: 'old-team', name: 'Ex Profissional', active: false, photo_url: '/demo/barbearia/perfil.webp' }, { id: 'deleted-team', name: 'Removido', active: true, deleted_at: '2026-01-01' }],
  get_public_gallery_catalog: [],
  get_public_customer_reviews: { average: 4.8, total: 1, reviews: [{ id: 'review1', rating: 5, comment: 'Ótimo corte. Meu contato é cliente@example.test ou 11999998888.', customer_name: 'Nome Completo Privado', customer_phone: '11999998888' }] },
  get_public_membership_plans: [],
};

async function json(route: Route, body: unknown, status = 200) {
  const single = route.request().headers().accept?.includes('vnd.pgrst.object+json');
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(single && Array.isArray(body) ? body[0] ?? null : body) });
}

async function mockPublic(page: Page, published = true, authenticated = false, themeProfile = profile) {
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
    if (endpoint === 'get_public_profile_by_slug') return json(route, themeProfile);
    if (endpoint in catalog) return json(route, endpoint === 'get_public_establishment_site' && !published ? null : catalog[endpoint as keyof typeof catalog]);
    if (endpoint === 'profiles') return json(route, [themeProfile]);
    if (endpoint === 'establishment_sites') return json(route, { code: 'PGRST205', message: 'Table not found' }, 404);
    if (endpoint === 'get_auth_company_id') return json(route, owner);
    if (endpoint === 'get_auth_role') return json(route, 'owner');
    return json(route, []);
  });
  return calls;
}

async function finishImages(page: Page, scanScroll = false) {
  await page.evaluate(async shouldScan => {
    document.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
    if (shouldScan) {
      const prevY = window.scrollY;
      const step = Math.max(400, window.innerHeight - 100);
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(resolve => setTimeout(resolve, 60));
      }
      window.scrollTo(0, prevY);
    }
    await Promise.all([...document.images].map(img => (img.complete && img.naturalWidth > 0 ? Promise.resolve() : img.decode().catch(() => undefined))));
    await document.fonts.ready;
  }, scanScroll);
}

async function scrollControlsTo(page: Page, target: ReturnType<Page['locator']>) {
  await target.evaluate(el => {
    const isEmbeddedMobile = Boolean(el.closest('[data-embedded]')) && window.innerWidth < 1000;
    const isPublicDesktop = Boolean(el.closest('.establishment')) && window.innerWidth >= 768;
    const isPublicMobile = Boolean(el.closest('.establishment')) && window.innerWidth < 768;
    let cur: HTMLElement | null = el.parentElement;
    while (cur && cur !== document.documentElement) {
      const style = window.getComputedStyle(cur);
      if (/(auto|scroll)/.test(style.overflowY) && cur.scrollHeight > cur.clientHeight + 4) {
        const isControlsPane = cur.classList.contains('se-controls');
        const offset = isControlsPane ? 24 : isEmbeddedMobile ? 200 : 16;
        cur.scrollTop += el.getBoundingClientRect().top - cur.getBoundingClientRect().top - offset;
        return;
      }
      cur = cur.parentElement;
    }
    const topOffset = isEmbeddedMobile ? 200 : isPublicDesktop ? 96 : isPublicMobile ? 76 : 16;
    window.scrollTo({
      top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - topOffset),
      behavior: 'instant',
    });
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
  await finishImages(page, fullPage);
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage, animations: 'disabled' });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => route.abort());
  await page.route(/google\.com\/maps/, route => {
    const body = `<!doctype html><html><body style="margin:0;height:100vh;background:#e8ecef;font-family:sans-serif;overflow:hidden;position:relative"><svg viewBox="0 0 400 240" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="400" height="240" fill="#eef1f4"/><path d="M0 70 H400 M0 160 H400 M90 0 V240 M230 0 V240 M330 0 V240" stroke="#ffffff" stroke-width="10"/><path d="M0 115 L400 95" stroke="#fcd34d" stroke-width="6"/><rect x="115" y="80" width="90" height="60" rx="6" fill="#dce7d6"/></svg><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-100%);width:26px;height:26px;border-radius:50% 50% 50% 0;background:#dc2626;transform-origin:center;rotate:-45deg;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div></body></html>`;
    return route.fulfill({ status: 200, contentType: 'text/html', body });
  });
});

for (const [niche, slug, heading, preset] of [
  ['barber', 'demo-corte-fino', /Corte preciso, barba na navalha/i, 'urban'],
  ['beauty', 'demo-studio-aurora', /Cor natural, corte com movimento/i, 'salon'],
] as const) {
  test(`${niche}: público, marca própria sem AgendiX, logo, SEO e screenshots`, async ({ page }, testInfo) => {
    const requests: string[] = [];
    page.on('request', request => { if (request.url().includes('.supabase.co/')) requests.push(request.url()); });
    await page.goto(`/#/site/${slug}`);
    await expect(page.locator('h1')).toContainText(heading);
    await expect(page.locator('.establishment')).toHaveAttribute('data-preset', preset);
    await expect(page.locator('.es-demo')).toContainText('fictícios');
    await expect(page.locator('body')).not.toContainText(/agendix/i);
    await expect(page.locator('.es-header .es-brand-logo')).toBeVisible();
    await expect(page.locator('.es-services article')).toHaveCount(3);
    await expect(page.locator('.es-team article')).toHaveCount(3);
    await expect(page.locator('#club')).toBeVisible();
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

  test(`${niche}: categorias, lightbox, detalhes e agendamento contextual`, async ({ page }, testInfo) => {
    await page.goto(`/#/site/${slug}`);
    // Categorias de serviços
    const filterButtons = page.locator('.es-category-chip');
    await expect(filterButtons).toHaveCount(4);
    await filterButtons.nth(1).click();
    await expect(page.locator('.es-services article')).toHaveCount(1);
    await filterButtons.first().click();
    await expect(page.locator('.es-services article')).toHaveCount(3);

    // Lightbox da galeria
    await page.locator('.es-gallery-trigger').first().click();
    await expect(page.locator('dialog.es-lightbox')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog.es-lightbox')).not.toBeVisible();

    // Comparador interativo Antes e Depois (teclado + controle acessível)
    const slider = page.locator('#beforeAfter [role="slider"]').first();
    await expect(slider).toHaveAttribute('aria-valuenow', '50');
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuenow', '55');

    // Acordeão FAQ acessível
    const firstFaq = page.locator('#faq .es-faq-trigger').first();
    await expect(firstFaq).toHaveAttribute('aria-expanded', 'false');
    await firstFaq.click();
    await expect(firstFaq).toHaveAttribute('aria-expanded', 'true');
    await firstFaq.click();
    await expect(firstFaq).toHaveAttribute('aria-expanded', 'false');

    // Página de serviço
    await page.locator('.es-service-more').first().click();
    await expect(page.locator('h1')).toContainText(niche === 'barber' ? 'Corte masculino' : 'Corte feminino');
    await expect(page.getByRole('heading', { name: 'O que inclui' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/agendix/i);
    const crumbBox = await page.locator('.es-breadcrumb a').boundingBox();
    expect(crumbBox?.x ?? 0).toBeGreaterThanOrEqual(16);
    const beforeImgs = await page.locator('.es-before figure img').evaluateAll(imgs => imgs.map(img => img.getAttribute('src')));
    expect(beforeImgs).toHaveLength(2);
    expect(beforeImgs[0]).not.toBe(beforeImgs[1]);
    if (testInfo.project.name.startsWith('mobile')) {
      await expect(page.locator('.es-sticky .es-button')).toBeVisible();
    }
    await capture(page, `${niche}-${page.viewportSize()!.width}-service`, true);
    await page.locator('.es-sticky .es-button, .es-detail-actions .es-button').filter({ visible: true }).click();
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

test('320–430px e 768px: sem rolagem horizontal nos estilos e com logo', async ({ page }) => {
  for (const slug of ['demo-corte-fino', 'demo-studio-aurora']) {
    for (const width of [320, 360, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/#/site/${slug}`);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (width === 320 || width === 768) await capture(page, `${slug}-${width}-fold`);
    }
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/site/demo-studio-aurora/servico/d0000000-0000-4000-8002-000000000023');
  await expect(page.locator('h1')).toContainText('Mechas e luzes');
  await expect(page.locator('.es-sticky')).toContainText('A partir de');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await capture(page, 'beauty-320-service');
});

test('RPCs públicas: publicação, sanitização, equipe vigente, mini mapa seguro e seções vazias', async ({ page }) => {
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

  const mapIframe = page.locator('iframe[title="Mapa com a localização de Casa Mock (fictícia)"]');
  await expect(mapIframe).toHaveAttribute('src', /^https:\/\/www\.google\.com\/maps\?q=.*&output=embed$/);
  await expect(page.locator('.es-map-embed')).not.toHaveAttribute('data-interactive', 'true');
  await page.getByRole('button', { name: 'Explorar mapa' }).click();
  await expect(page.locator('.es-map-embed')).toHaveAttribute('data-interactive', 'true');
  await expect(page.getByRole('button', { name: 'Bloquear mapa' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Como chegar' })).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps/);
  await expect(page.locator('#location')).toContainText('Ao lado do metrô Fradique Coutinho');
  await scrollControlsTo(page, page.locator('#location'));
  await capture(page, `public-map-${page.viewportSize()!.width}`, false, true);
});

test('preset editorial clássico: identidade pergaminho, Fraunces e zero overflow', async ({ page }) => {
  await mockPublic(page);
  await page.route('**/get_public_team_catalog*', route =>
    json(route, [{ id: teamId, name: 'Rafael Costa', active: true, deleted_at: null, photo_url: '/presenca/rhian/barber-portrait.webp' }]),
  );
  await page.route('**/get_public_customer_reviews*', route =>
    json(route, {
      average: 4.9,
      total: 42,
      reviews: [
        {
          id: 'editorial-review-1',
          rating: 5,
          comment: 'Atendimento pontual, toalha quente de verdade e acabamento limpo na navalha.',
          customer_name: 'Carlos M.',
        },
      ],
    }),
  );
  await page.route('**/get_public_establishment_site*', async route => {
    const editorialConfig = {
      ...config,
      style: 'light',
      preset: 'editorial',
      background: '#FBF7F0',
      accent: '#8B4513',
      headline: 'Barbearia clássica em Pinheiros com navalha e tesoura',
      about: 'Atendimento individualizado, toalha quente e horário pontual no coração de Pinheiros.',
      offer: { enabled: true, kind: 'first_visit', title: 'Toalha quente de cortesia na 1ª visita', condition: 'Ao agendar qualquer corte.' },
      differences: ['Horário respeitado sem fila.', 'Lâminas descartáveis e toalhas esterilizadas.', 'Acabamento detalhado na navalha.'],
      faq: [{ question: 'Preciso marcar antes?', answer: 'Sim, reserve seu horário direto por aqui.' }],
    };
    return json(route, { config: editorialConfig });
  });
  await page.goto('/#/site/mock-house');
  await expect(page.locator('.establishment')).toHaveAttribute('data-preset', 'editorial');
  await expect(page.locator('h1')).toContainText('Barbearia clássica em Pinheiros');
  const width = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await capture(page, `editorial-${width}-fold`);
  await capture(page, `editorial-${width}-full`, true);
});

test('site não publicado mantém acesso ao agendamento legado', async ({ page }) => {
  await mockPublic(page, false);
  await page.goto('/#/site/mock-house');
  await expect(page.getByRole('heading')).toHaveText('Este site ainda não está disponível.');
  await expect(page.getByRole('link', { name: 'Ir para o agendamento' })).toHaveAttribute('href', '/#/book/mock-house');
});

test('links legais do rodapé permanecem no próprio estabelecimento sem marca de terceiros', async ({ page }) => {
  await mockPublic(page);
  await page.goto('/#/site/demo-corte-fino');
  await page.locator('.es-footer').getByRole('button', { name: 'Privacidade', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Política de Privacidade', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Política de Privacidade' })).not.toContainText(/agendix/i);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Política de Privacidade', exact: true })).not.toBeVisible();
  await page.locator('.es-footer').getByRole('button', { name: 'Termos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Termos de Uso', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Termos de Uso' })).not.toContainText(/agendix/i);
  await page.getByRole('button', { name: 'Entendi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Termos de Uso', exact: true })).not.toBeVisible();
});

test('editor: prévia ao vivo, passos para leigos, localização, autosave e rascunho local', async ({ page }, testInfo) => {
  await page.goto('/#/site-demo/editor/barber');
  await expect(page.getByRole('heading', { name: 'Meu site', exact: true })).toBeVisible();
  const preview = page.frameLocator('iframe[title="Prévia ao vivo do meu site"]');
  await expect(preview.locator('h1')).toBeVisible();
  if (testInfo.project.name.startsWith('mobile')) {
    const dock = await page.locator('.se-preview-stage').boundingBox();
    expect(dock?.height ?? 0).toBeGreaterThanOrEqual(300);
    await expect(page.getByRole('button', { name: 'Ver em tela cheia' })).toBeVisible();
    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(docHeight).toBeLessThan(3600);
  }
  await page.getByRole('tab', { name: '2. Textos' }).click();
  await expect(page.getByLabel(/^Frase principal/)).toBeVisible();
  await page.getByLabel(/^Frase principal/).fill('Um corte com a sua cara.');
  await expect(preview.locator('h1')).toHaveText('Um corte com a sua cara.');
  await expect(page.locator('.se-autosave-pill')).toContainText('Salvo automaticamente');
  await capture(page, `editor-${page.viewportSize()!.width}-preview`);

  await openEditorSection(page, 'Dúvidas frequentes e contato');
  await page.getByLabel('Endereço completo').fill('Av. Paulista, 1000 — Bela Vista, São Paulo');
  await page.getByLabel(/Link do Google Maps ou coordenadas/i).fill('-23.5649, -46.6519');
  await expect(page.getByText(/Localização exata confirmada \(-23\.5649, -46\.6519\)/i)).toBeVisible();
  await expect(page.locator('.se-autosave-pill')).toContainText('Salvo automaticamente');
  await scrollControlsTo(page, page.locator('.se-block-group').filter({ hasText: 'Contato e endereço' }));
  await capture(page, `editor-${page.viewportSize()!.width}-location`, false, true);

  if (testInfo.project.name.startsWith('mobile')) {
    await page.getByRole('button', { name: 'Ver em tela cheia' }).click();
    await expect(page.getByRole('button', { name: 'Voltar ao editor' })).toBeVisible();
    await expect(preview.locator('h1')).toHaveText('Um corte com a sua cara.');
    const full = await page.locator('.se-preview-stage').boundingBox();
    expect(full?.height ?? 0).toBeGreaterThanOrEqual(500);
    await capture(page, `editor-${page.viewportSize()!.width}-fullscreen`, false, true);
    await page.getByRole('button', { name: 'Voltar ao editor' }).click();
    await expect(page.getByRole('button', { name: 'Ver em tela cheia' })).toBeVisible();
  }
  await page.getByRole('tab', { name: '1. Visual' }).click();
  await scrollControlsTo(page, page.locator('.se-bg'));
  await expect(page.getByRole('radio', { name: /Urbano preciso, recomendada/i })).toBeVisible();
  await expect(page.locator('.se-swatch-badge')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Personalizar cor de fundo/i })).toBeVisible();
  await page.getByRole('button', { name: 'Só o logo' }).click({ force: true });
  await expect(preview.locator('.es-brand-logo')).toBeVisible();
  await page.getByRole('button', { name: 'Logo + nome' }).click({ force: true });
  await scrollControlsTo(page, page.locator('.se-logo-picker'));
  await capture(page, `editor-${page.viewportSize()!.width}-logo`, false, true);
  await page.getByRole('radio', { name: 'Editorial clássico' }).click({ force: true });
  await expect(preview.locator('h1')).toHaveText('Um corte com a sua cara.');
  await expect(preview.locator('.establishment')).toHaveAttribute('data-style', 'light');
  await page.getByRole('radio', { name: 'Salão luminoso' }).evaluate(el => (el as HTMLButtonElement).click());
  await expect(preview.locator('.establishment')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await scrollControlsTo(page, page.locator('.se-bg'));
  await expect(page.getByRole('button', { name: 'Prévia no celular' })).toBeVisible();
  await capture(page, `editor-${page.viewportSize()!.width}-colors`, false, true);
  if (testInfo.project.name.startsWith('mobile')) {
    await page.getByRole('button', { name: 'Prévia no computador' }).click();
    await expect(page.getByRole('button', { name: 'Prévia no computador' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('iframe[title="Prévia ao vivo do meu site"]')).toBeVisible();
    await page.getByRole('button', { name: 'Prévia no celular' }).click();
  }
  await page.getByRole('tab', { name: '3. Fotos' }).click();
  await openEditorSection(page, 'Seções e ordem da página');
  await page.getByLabel('Galeria', { exact: true }).evaluate(el => (el as HTMLInputElement).click());
  await page.getByRole('tab', { name: '4. Divulgar' }).click();
  await expect(preview.locator('h1')).toBeVisible();
  await expect(preview.locator('h1')).toHaveText('Um corte com a sua cara.');
  await expect(preview.locator('.establishment')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByLabel('Prévia do resultado no Google')).toBeVisible();
  await expect(page.getByLabel('Prévia do resultado no Google')).toContainText('agendixstudio.com/s/demo-corte-fino');
  await expect(page.locator('.se-share-url')).toContainText('https://www.agendixstudio.com/s/demo-corte-fino');
  await expect(page.locator('.se-qr-image')).toBeVisible();
  await scrollControlsTo(page, page.locator('.se-share-block .se-label-title'));
  await capture(page, `editor-${page.viewportSize()!.width}-share`, false, true);
  await expect(page.locator('.se-autosave-pill')).toContainText('Salvo automaticamente');
  await capture(page, `editor-${page.viewportSize()!.width}-controls`, true);
  await page.reload();
  await page.getByRole('tab', { name: '2. Textos' }).click();
  await expect(page.getByLabel(/^Frase principal/)).toHaveValue('Um corte com a sua cara.');
  await openEditorSection(page, 'Dúvidas frequentes e contato');
  await expect(page.getByLabel('Endereço completo')).toHaveValue('Av. Paulista, 1000 — Bela Vista, São Paulo');
  await expect(preview.locator('#preview-gallery')).toHaveCount(0);
});

test('painel autenticado: autosave isolado por company_id e Passo 4 acionável quando pendente', async ({ page }) => {
  const calls = await mockPublic(page, true, true);
  await page.goto('/#/configuracoes/meu-site');
  await expect(page.locator('.site-editor h1')).toHaveText('Meu site');
  await expect(page.locator('.se-notice')).toContainText('Liberação pendente');
  await page.getByRole('tab', { name: '2. Textos' }).click();
  await page.getByLabel(/^Frase principal/).fill('Casa fictícia em Pinheiros.');
  await expect(page.locator('.se-autosave-pill')).toContainText('Salvo automaticamente');
  expect(calls).toContain('establishment_sites');
  const storage = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('agendix:presence:')));
  expect(storage).toContain(`agendix:presence:draft:v1:${owner}`);
  await expect(page.frameLocator('iframe[title="Prévia ao vivo do meu site"]').locator('h1')).toHaveText('Casa fictícia em Pinheiros.');
  await capture(page, `owner-editor-${page.viewportSize()!.width}-preview`, false, true);

  await page.getByRole('tab', { name: '4. Divulgar' }).click();
  await expect(page.getByRole('button', { name: /Publicar site/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Solicitar liberação no WhatsApp/i })).toHaveAttribute('href', /^https:\/\/wa\.me\/351927688674\?text=/);
  await expect(page.getByRole('button', { name: /Ver prévia em tela cheia/i })).toBeEnabled();
  await capture(page, `owner-editor-${page.viewportSize()!.width}-share-pending`, false, true);

  if (page.viewportSize()!.width < 500) {
    await page.setViewportSize({ width: 320, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await capture(page, 'owner-editor-320-share-pending', false, true);
    await page.getByRole('tab', { name: '2. Textos' }).click();
    await openEditorSection(page, 'Dúvidas frequentes e contato');
    await scrollControlsTo(page, page.locator('.se-block-group').filter({ hasText: 'Contato e endereço' }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await capture(page, 'owner-editor-320-location', false, true);
  } else {
    await page.getByRole('link', { name: 'Geral' }).click();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page).toHaveURL(/#\/configuracoes\/geral/);
  }
});

test('painel autenticado (beauty claro): preserva contraste, logo, localização e Passo 4', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('agendix_color_mode', 'light'));
  await mockPublic(page, true, true, beautyProfile);
  await page.goto('/#/configuracoes/meu-site');
  await expect(page.locator('.site-editor h1')).toHaveText('Meu site');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
  await expect(page.frameLocator('iframe[title="Prévia ao vivo do meu site"]').locator('.es-brand-logo')).toBeVisible();
  await capture(page, `owner-beauty-light-${page.viewportSize()!.width}-preview`, false, true);
  await scrollControlsTo(page, page.locator('.se-logo-picker'));
  await capture(page, `owner-beauty-light-${page.viewportSize()!.width}-logo`, false, true);
  await page.getByRole('tab', { name: '2. Textos' }).click();
  await openEditorSection(page, 'Dúvidas frequentes e contato');
  await scrollControlsTo(page, page.locator('.se-block-group').filter({ hasText: 'Contato e endereço' }));
  await capture(page, `owner-beauty-light-${page.viewportSize()!.width}-location`, false, true);
  await page.getByRole('tab', { name: '4. Divulgar' }).click();
  await expect(page.getByRole('link', { name: /Solicitar liberação no WhatsApp/i })).toBeVisible();
  await expect(page.locator('.se-qr-image')).toBeVisible();
  await capture(page, `owner-beauty-light-${page.viewportSize()!.width}-share-pending`, false, true);
  await scrollControlsTo(page, page.locator('.se-share-block .se-label-title'));
  await capture(page, `owner-beauty-light-${page.viewportSize()!.width}-share`, false, true);
});
