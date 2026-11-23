import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://example.supabase.co/**', route => route.fulfill({
    status: 200, contentType: 'application/json', body: '{}',
  }));
  await page.route('https://images.unsplash.com/**', route => route.abort());
  await page.route('https://connect.facebook.net/**', route => route.fulfill({
    contentType: 'application/javascript', body: '/* Meta stub: no external tracking in tests */',
  }));
});

for (const width of [393, 1280]) {
  test('banner at ' + width + 'px', async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 393 ? 852 : 900 });
    let pixelRequests = 0;
    page.on('request', request => { if (request.url().includes('connect.facebook.net')) pixelRequests += 1; });
    await page.goto('/#/login');
    const banner = page.getByRole('region', { name: 'Cookies e privacidade' });
    await expect(banner).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aceitar', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Recusar', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(pixelRequests).toBe(0);
    await page.screenshot({ path: testInfo.outputPath('banner-' + width + '.png'), fullPage: false });
    await testInfo.attach('banner-' + width, { path: testInfo.outputPath('banner-' + width + '.png'), contentType: 'image/png' });
    await page.getByRole('button', { name: 'Recusar', exact: true }).click();
    await page.reload();
    await expect(banner).toHaveCount(0);
    expect(pixelRequests).toBe(0);
    await page.getByRole('button', { name: 'Preferências de cookies' }).click();
    await page.getByRole('button', { name: 'Aceitar', exact: true }).click();
    await expect.poll(() => pixelRequests).toBe(1);
    const events = await page.evaluate(() => window.fbq?.queue || []);
    expect(events.some(args => args[0] === 'trackSingle' && args[2] === 'PageView')).toBe(true);
    await page.goto('/#/register');
    await expect(page.getByLabel('Seu nome')).toBeVisible();
    expect(await page.evaluate(() => window.fbq?.queue.filter(args => args[2] === 'Lead').length)).toBe(0);
    await page.locator('form').evaluate(form => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    // Lead só depois da conta criada no servidor (nunca no envio do formulário).
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.fbq?.queue.filter(args => args[2] === 'Lead').length)).toBe(0);
    await page.getByRole('button', { name: 'Preferências de cookies' }).click();
    await page.getByRole('button', { name: 'Recusar', exact: true }).click();
    await expect.poll(async () => page.evaluate(() => window.fbq?.queue.length)).toBe(0);
    await page.reload();
    expect(pixelRequests).toBe(1);
    await expect(page.locator('#agendix-meta-pixel')).toHaveCount(0);
  });
}

test('never injects Meta on a public booking route', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('agendix:marketing-consent:v1', JSON.stringify({ choice: 'accepted', version: 1, savedAt: Date.now() })));
  await page.goto('/#/book/example');
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('#agendix-meta-pixel')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Preferências de cookies' })).toHaveCount(0);
});


test('keeps private URLs and tokens out of browser and server events after marketing navigation', async ({ page }) => {
  const browserUrls: string[] = [];
  const serverEvents: { event_name: string; event_source_url: string }[] = [];
  await page.route('https://www.facebook.com/tr/**', async route => {
    browserUrls.push(new URL(route.request().url()).searchParams.get('dl') || '');
    await route.fulfill({ status: 200, body: '', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.route('https://example.supabase.co/functions/v1/meta-capi', async route => {
    if (route.request().method() === 'POST') serverEvents.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, body: '{}', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.route('https://connect.facebook.net/**', route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      const pixel = window.fbq;
      let consented = true;
      pixel.callMethod = (...args) => {
        if (args[0] === 'consent') consented = args[1] === 'grant';
        if (args[0] === 'trackSingle' && consented) {
          fetch('https://www.facebook.com/tr/?dl=' + encodeURIComponent(location.href));
        }
      };
      const queued = pixel.queue.splice(0);
      queued.forEach(args => pixel.callMethod(...args));
      if (!pixel.disablePushState) {
        window.addEventListener('hashchange', () => {
          pixel.callMethod('trackSingle', '123456789', 'PageView');
        });
      }
    `,
  }));
  await page.goto('/#/login');
  await page.getByRole('button', { name: 'Aceitar', exact: true }).click();
  await expect.poll(() => browserUrls.length).toBe(1);
  await page.goto('/#/register');
  await expect(page.getByLabel('Seu nome')).toBeVisible();
  await expect.poll(() => browserUrls.length).toBe(2);
  await expect.poll(() => serverEvents.length).toBe(2);
  for (const url of ['/#/book/private?token=secret', '/#/minha-area/private?token=secret', '/#/register?token=secret']) {
    await page.goto(url);
    await page.evaluate(() => window.fbq?.('trackSingle', '123456789', 'PageView', {}, { eventID: 'late' }));
    await page.waitForLoadState('networkidle');
    expect(browserUrls).toHaveLength(2);
    expect(serverEvents).toHaveLength(2);
    expect(await page.evaluate(() => window.fbq?.queue.length || 0)).toBe(0);
  }
  expect(browserUrls.every(url => !/book|private|minha-area|token/.test(url))).toBe(true);
  expect(serverEvents.every(event => event.event_name === 'PageView')).toBe(true);
});

test('sends landing and registration-start events once, with the same event_id in Pixel and server', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('agendix:marketing-consent:v1', JSON.stringify({ choice: 'accepted', version: 1, savedAt: Date.now() })));
  const serverEvents: { event_name: string; event_id: string; custom_data?: Record<string, unknown>; event_source_url: string }[] = [];
  await page.route('https://example.supabase.co/functions/v1/meta-capi', async route => {
    if (route.request().method() === 'POST') serverEvents.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, body: '{}', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.route('https://connect.facebook.net/**', route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      window.__pixelCalls = [];
      const pixel = window.fbq;
      pixel.callMethod = (...args) => window.__pixelCalls.push(args);
      pixel.queue.splice(0).forEach(args => pixel.callMethod(...args));
    `,
  }));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/#/landing');
  await expect.poll(() => serverEvents.map(event => event.event_name)).toContain('PageView');
  await expect.poll(() => serverEvents.map(event => event.event_name)).toContain('ViewContent');
  await page.getByRole('group', { name: 'Seu tipo de negócio' }).getByRole('button', { name: /Salão/ }).click();
  await expect.poll(() => serverEvents.map(event => event.event_name)).toContain('NichoSwitch');
  await page.getByRole('button', { name: 'Agenda', exact: true }).click();
  await expect.poll(() => serverEvents.map(event => event.event_name)).toContain('DemoStart');
  await expect.poll(() => serverEvents.map(event => event.event_name)).toContain('DemoScreenView');
  await page.getByRole('button', { name: 'Fila', exact: true }).click();
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.getByRole('button', { name: 'Financeiro', exact: true }).click();
  await expect.poll(() => serverEvents.map(event => event.event_name)).toContain('DemoComplete');
  await page.getByRole('heading', { name: 'Perguntas frequentes' }).scrollIntoViewIfNeeded();
  await page.getByText('Preciso colocar cartão para testar?').click();
  await expect.poll(() => serverEvents.map(event => event.event_name)).toContain('FAQOpen');
  await page.getByRole('link', { name: /Crie sua conta grátis/ }).first().click();
  await expect(page.getByLabel('Seu nome')).toBeVisible();
  await page.getByLabel('Seu nome').click();
  await page.getByLabel('Seu nome').fill('Pessoa Teste');
  await page.getByLabel('Seu nome').fill('Pessoa Teste 2');
  await expect.poll(() => serverEvents.map(event => event.event_name)).toContain('StartRegistration');
  const names = serverEvents.map(event => event.event_name);
  expect(names.filter(name => name === 'ViewContent').length).toBeGreaterThanOrEqual(1);
  expect(names.filter(name => name === 'ViewContent').length).toBeLessThanOrEqual(2);
  expect(names.filter(name => name === 'NichoSwitch')).toHaveLength(1);
  expect(names.filter(name => name === 'DemoStart')).toHaveLength(1);
  expect(names.filter(name => name === 'DemoComplete')).toHaveLength(1);
  expect(names.filter(name => name === 'FAQOpen')).toHaveLength(1);
  expect(names.filter(name => name === 'CTAClick').length).toBeGreaterThanOrEqual(1);
  expect(names.filter(name => name === 'StartRegistration')).toHaveLength(1);
  expect(serverEvents.find(event => event.event_name === 'ViewContent')?.custom_data).toEqual(expect.objectContaining({ content_category: 'barber' }));
  expect(serverEvents.find(event => event.event_name === 'NichoSwitch')?.custom_data).toEqual(expect.objectContaining({ content_category: 'beauty' }));
  expect(serverEvents.find(event => event.event_name === 'CTAClick')?.custom_data).toEqual(expect.objectContaining({
    cta_id: expect.stringMatching(/^free_trial_/),
    cta_position: expect.stringMatching(/^(hero|demo|meio|final|header)$/),
  }));
  expect(serverEvents.find(event => event.event_name === 'FAQOpen')?.custom_data).toEqual(expect.objectContaining({ faq_id: 'faq_card' }));
  expect(serverEvents.every(event => event.event_source_url.includes('#/landing') || event.event_source_url.includes('#/register'))).toBe(true);
  expect(serverEvents.every(event => !/Pessoa|cartão|WhatsApp/i.test(JSON.stringify(event.custom_data || {})))).toBe(true);
  const pixelCalls = await page.evaluate(() => (window as unknown as { __pixelCalls: unknown[][] }).__pixelCalls);
  for (const name of ['StartRegistration', 'DemoComplete', 'FAQOpen']) {
    const call = pixelCalls.find(args => args[0] === 'trackSingleCustom' && args[2] === name);
    expect(call?.[4]).toEqual({ eventID: serverEvents.find(event => event.event_name === name)?.event_id });
  }
});

test('landing scroll and dwell marks fire once with niche', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('agendix:marketing-consent:v1', JSON.stringify({ choice: 'accepted', version: 1, savedAt: Date.now() })));
  const serverEvents: { event_name: string; custom_data?: Record<string, unknown> }[] = [];
  await page.route('https://example.supabase.co/functions/v1/meta-capi', async route => {
    if (route.request().method() === 'POST') serverEvents.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, body: '{}', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.route('https://connect.facebook.net/**', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.fbq.callMethod = (...args) => {}; window.fbq.queue.splice(0);`,
  }));
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto('/#/landing');
  await expect.poll(() => serverEvents.some(event => event.event_name === 'PageView')).toBe(true);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => serverEvents.map(event => event.event_name)).toContain('Scroll90');
  expect(serverEvents.filter(event => event.event_name === 'Scroll25')).toHaveLength(1);
  expect(serverEvents.filter(event => event.event_name === 'Scroll50')).toHaveLength(1);
  expect(serverEvents.filter(event => event.event_name === 'Scroll75')).toHaveLength(1);
  expect(serverEvents.filter(event => event.event_name === 'Scroll90')).toHaveLength(1);
  await page.waitForTimeout(16_000);
  await expect.poll(() => serverEvents.map(event => event.event_name)).toContain('TimeOnPage15s');
  expect(serverEvents.find(event => event.event_name === 'Scroll90')?.custom_data).toEqual(
    expect.objectContaining({ content_category: 'barber', content_name: 'landing' }),
  );
});
