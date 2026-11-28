import { test, expect, type Page } from '@playwright/test';
import { loadEnv } from 'vite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const artifactsDir = process.env.SITE_V2_ARTIFACTS_DIR || '/tmp/site-v2-artifacts';

async function prepareLandingCapture(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.fonts.ready);
  for (const image of await page.locator('.landing img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function isolate(page: Page, requireNoExternal = true) {
  const forbidden: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const configured = process.env.VITE_SUPABASE_URL || loadEnv('development', process.cwd(), 'VITE_').VITE_SUPABASE_URL;
  const configuredHost = configured ? new URL(configured).host : '';
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (/supabase\.(co|in|com|net|invalid)$/.test(url.hostname) || (configuredHost && url.host === configuredHost) || /facebook\.com|facebook\.net|whatsapp\.com|wa\.me/.test(url.hostname)) {
      forbidden.push(`${url.hostname}${url.pathname}`);
      return route.abort();
    }
    return route.continue();
  });
  await page.routeWebSocket(/supabase\.(co|in|com|net|invalid)/, socket => {
    const url = new URL(socket.url());
    forbidden.push(`websocket:${url.host}${url.pathname}`);
    socket.close();
  });
  return () => { if (requireNoExternal) expect(forbidden, 'A demo não pode chamar integrações externas').toEqual([]); expect(errors, 'Erros de runtime').toEqual([]); };
}

for (const width of [1440, 390]) {
  test(`entrada pública abre a landing e permite acessar o login ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page).toHaveURL(/#\/landing$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mais que agenda.');
    await page.getByRole('link', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/#\/login$/);
    await expect(page.getByTestId('category-barber')).toBeVisible();
    await expect(page.getByTestId('category-beauty')).toBeVisible();
    await page.getByTestId('category-barber').click();
    await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
    await page.goto('/#/landing');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mais que agenda.');
    await expect(page.getByRole('link', { name: 'AgendiX, início' })).toHaveAttribute('href', '/#/landing');
  });
  test(`demo isolada ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const verify = await isolate(page);
    await page.goto('/#/demo/barber/agenda');
    await expect(page.getByText('Simulação', { exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'barber');
    await expect(page.getByRole('heading', { name: /Agenda/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Pedro Souza —/ }).first()).toBeVisible();
    const selectedDay = page.getByTestId('agenda-day-selected');
    await expect(selectedDay).toHaveCSS('background-color', 'rgb(107, 80, 16)');
    if (width === 390) {
      await expect(page.getByTestId('agenda-grid-root')).toBeVisible();
      for (const control of [page.getByRole('button', { name: 'Histórico', exact: true }), page.getByTestId('agenda-public-link'), page.getByRole('button', { name: 'Todos os agendamentos', exact: true }), page.locator('#btn-new-appointment')]) {
        const box = await control.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
        expect(box?.width).toBeGreaterThanOrEqual(44);
      }
      // Garante que o botão de alternância de tema e o link Salão não se sobrepõem no mobile
      const toggleBox = await page.getByRole('button', { name: /Alternar para tema/i }).boundingBox();
      const salonBox = await page.locator('.demo-niches').getByRole('link', { name: 'Salão', exact: true }).boundingBox();
      expect(toggleBox).toBeTruthy();
      expect(salonBox).toBeTruthy();
      if (toggleBox && salonBox) {
        const overlaps = !(toggleBox.x + toggleBox.width <= salonBox.x || salonBox.x + salonBox.width <= toggleBox.x || toggleBox.y + toggleBox.height <= salonBox.y || salonBox.y + salonBox.height <= toggleBox.y);
        expect(overlaps, 'Botão Claro/Escuro não pode cobrir o link Salão').toBe(false);
      }
    }
    // Aceite de solicitação online sem erro
    await page.getByTestId('agenda-online-requests-toggle').click();
    const acceptButton = page.getByRole('button', { name: 'Aceitar' }).first();
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();
    await expect(page.getByText(/Erro ao aceitar/i)).toHaveCount(0);
    await page.keyboard.press('Escape');

    // Alterna para tema escuro e preserva ao trocar de nicho
    await page.getByRole('button', { name: 'Alternar para tema escuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');

    await page.getByRole('button', { name: /Novo Agendamento/i }).first().click();
    await expect(page.getByRole('dialog').first()).toBeVisible();
    await page.getByTestId('agenda-choice-new-appointment').click();
    await expect(page.getByRole('dialog').first()).toBeVisible();
    await page.keyboard.press('Escape');

    await page.goto('/#/demo/barber/financeiro');
    await expect(page.getByRole('heading', { name: /Financeiro/i }).first()).toBeVisible();
    await expect(page.getByText('Lucro', { exact: true })).toBeVisible();
    if (width === 1440) {
      await page.getByRole('button', { name: 'Performance da equipe', exact: true }).click();
      await expect(page).toHaveURL(/#\/demo\/barber\/financeiro\/performance/);
    } else await page.goto('/#/demo/barber/financeiro/performance');
    await expect(page.getByText('Resultados por hora', { exact: true })).toBeVisible();
    await expect(page.getByText('Não foi possível carregar os resultados.', { exact: true })).toHaveCount(0);
    await page.locator('.demo-niches').getByRole('link', { name: 'Salão', exact: true }).click();
    await expect(page.getByText('Studio Aurora', { exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'beauty');
    await expect(page).toHaveURL(/#\/demo\/beauty\/financeiro\/performance/);
    await expect(page.getByText('Resultados por hora', { exact: true })).toBeVisible();
    await page.goto('/#/demo/beauty/agenda');
    await expect(page.getByRole('button', { name: /Beatriz Souza —/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crie sua conta grátis' })).toHaveAttribute('href', '/#/register?type=beauty');
    verify();
  });
  test(`landing e capturas ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto('/#/landing');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mais que agenda.');
    await expect(page.getByRole('link', { name: 'Entrar', exact: true })).toHaveAttribute('href', '/#/login');
    await expect(page.getByRole('link', { name: 'Crie sua conta grátis', exact: true }).first()).toHaveAttribute('href', '/#/register');
    if (width === 390) {
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      await expect(page.getByRole('link', { name: 'Criar conta para salão' })).toHaveAttribute('href', '/#/register?type=beauty');
      await page.getByRole('button', { name: 'Fechar menu' }).click();
    } else {
      const business = page.getByRole('group', { name: 'Negócio da demonstração' });
      await business.getByRole('button', { name: 'Salão de beleza', exact: true }).click();
      await expect(page.locator('.landing-hero .landing-button')).toHaveAttribute('href', '/#/register?type=beauty');
      await business.getByRole('button', { name: 'Barbearia', exact: true }).click();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await prepareLandingCapture(page);
    mkdirSync(path.join(artifactsDir, 'landing-shots'), { recursive: true });
    await page.screenshot({ path: path.join(artifactsDir, `landing-shots/landing-${width}.png`), fullPage: true });
    const resultsLink = page.locator('#produto').getByRole('link', { name: /^Resultados por hora/ });
    const resultsTitle = page.getByRole('heading', { name: 'Resultados por hora', level: 1 });
    await resultsLink.click();
    await expect(page).toHaveURL('/#/demo/barber/resultados-por-hora');
    await expect(resultsTitle).toBeInViewport();
    await page.locator('.demo-niches').getByRole('link', { name: 'Salão', exact: true }).click();
    await expect(page).toHaveURL('/#/demo/beauty/resultados-por-hora');
    await expect(resultsTitle).toBeInViewport();
    await page.getByRole('link', { name: 'Voltar ao site do AgendiX' }).click();
    await resultsLink.click();
    await expect(resultsTitle).toBeInViewport();
  });
}

for (const width of [320, 390, 768, 1440]) {
  test(`landing acessível por teclado e sem overflow em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const runtimeErrors: string[] = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await page.goto('/#/landing');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('.landing-hero .landing-button').first()).toBeInViewport();
    await expect(page.locator('.landing-hero .landing-phone')).toBeInViewport();
    await expect(page.locator('.landing-demo-poster img')).toHaveAttribute('src', '/landing/phone-presence-studio-aurora.webp');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('meta[name="viewport"]').getAttribute('content')).not.toContain('user-scalable=no');

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#landing-main')).toBeFocused();
    expect(new URL(page.url()).hash).not.toBe('#landing-main');

    const menu = page.getByRole('button', { name: 'Abrir menu' });
    if (await menu.isVisible()) {
      const box = await menu.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(48);
      expect(box?.height).toBeGreaterThanOrEqual(48);
      expect(box && box.x + box.width).toBeLessThanOrEqual(width);
      await menu.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await expect(menu).toBeFocused();
    }

    const question = page.locator('.landing-faq summary').first();
    await question.scrollIntoViewIfNeeded();
    await question.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.landing-faq details').first()).toHaveAttribute('open', '');
    const focusStyle = await question.evaluate(element => getComputedStyle(element).outlineStyle);
    expect(focusStyle).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page.locator('.landing-faq details').first()).not.toHaveAttribute('open');
    if (width <= 959) {
      const business = page.getByRole('group', { name: 'Negócio da demonstração' });
      const views = page.getByRole('group', { name: 'Tela da demonstração' });
      await business.getByRole('button', { name: 'Salão de beleza', exact: true }).click();
      await views.getByRole('button', { name: 'Financeiro', exact: true }).click();
      const explore = page.getByRole('link', { name: 'Explorar a simulação', exact: true });
      await expect(explore).toBeVisible();
      await expect(explore).toHaveAttribute('href', '/#/demo/beauty/financeiro');
      await expect(page.locator('.landing-demo-embed-action')).toBeHidden();
      await expect(page.locator('.landing-demo-frame iframe')).toHaveCount(0);
      await explore.click();
      await expect(page).toHaveURL(/#\/demo\/beauty\/financeiro$/);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'beauty');
      await expect(page.getByText('Lucro', { exact: true })).toBeVisible();
      await page.getByRole('link', { name: 'Voltar ao site do AgendiX' }).click();
      await expect(page.locator('#demonstracao')).toBeFocused();
      await expect(business.getByRole('button', { name: 'Salão de beleza', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(views.getByRole('button', { name: 'Financeiro', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.landing-hero .landing-button')).toHaveAttribute('href', '/#/register?type=beauty');
    }
    expect(runtimeErrors).toEqual([]);
  });
}

test('explora a demonstração embutida mantendo segmento e tarefa sem integrações externas', async ({ page }) => {
  const verify = await isolate(page);
  await page.goto('/#/landing');
  await page.getByRole('button', { name: 'Recusar' }).click();
  const business = page.getByRole('group', { name: 'Negócio da demonstração' });
  const views = page.getByRole('group', { name: 'Tela da demonstração' });
  await business.getByRole('button', { name: 'Salão de beleza', exact: true }).click();
  await views.getByRole('button', { name: 'Financeiro', exact: true }).click();
  await expect(page.locator('.landing-demo-frame iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Explorar a simulação', exact: true }).click();
  const iframe = page.locator('.landing-demo-frame iframe');
  await expect(iframe).toHaveAttribute('src', '/demo-preview#/demo/beauty/financeiro');
  const frame = page.frameLocator('.landing-demo-frame iframe');
  await expect(frame.getByRole('heading', { name: 'Financeiro', exact: true })).toBeVisible();
  await expect(frame.locator('html')).toHaveAttribute('data-theme', 'beauty');
  await expect(frame.locator('html')).toHaveAttribute('data-mode', 'light');
  await expect(frame.locator('.demo-content, main').first()).toBeVisible();
  expect(await iframe.evaluate(element => element.clientWidth)).toBeLessThanOrEqual(390);
  await expect(frame.getByText('Lucro', { exact: true })).toBeVisible();
  await views.getByRole('button', { name: 'Agendamento online', exact: true }).click();
  await expect(iframe).toHaveAttribute('src', '/demo-preview#/demo/beauty/book/simulacao');
  await expect(frame.getByText('Escolha seus serviços', { exact: true })).toBeVisible();
  await expect(frame.getByRole('heading', { name: 'Studio Aurora', exact: true })).toBeVisible();
  const nailsFilter = frame.getByRole('button', { name: /^Unhas$/i });
  await nailsFilter.click();
  await expect(nailsFilter).toHaveAttribute('aria-pressed', 'true');
  await expect(nailsFilter).toHaveCSS('color', 'rgb(255, 255, 255)');
  const manicure = frame.getByRole('button', { name: /Manicure/i });
  await expect(manicure).toBeVisible();
  await expect(frame.getByText('Corte feminino', { exact: true })).toHaveCount(0);
  await manicure.press('Space');
  await expect(manicure).toHaveAttribute('aria-pressed', 'true');
  await frame.getByRole('button', { name: /Continuar/ }).first().press('Enter');
  await expect(frame.getByRole('heading', { name: 'Escolha o profissional' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir em tela cheia', exact: true })).toHaveAttribute('href', '/#/demo/beauty/book/simulacao');
  await business.getByRole('button', { name: 'Barbearia', exact: true }).click();
  await expect(frame.locator('html')).toHaveAttribute('data-theme', 'barber');
  await expect(frame.locator('html')).toHaveAttribute('data-mode', 'light');
  await frame.getByText('Corte masculino', { exact: true }).click();
  await frame.getByRole('button', { name: /Continuar/ }).first().click();
  await expect(frame.getByRole('heading', { name: 'Escolha o profissional' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar a simulação' }).click();
  await expect(iframe).toHaveCount(0);
  await expect(page.locator('.landing-demo-poster img')).toHaveAttribute('src', '/landing/phone-barber-booking.webp');
  verify();
});

test('a rota incorporada abre apenas a simulação', async ({ page }) => {
  const verify = await isolate(page);
  await page.goto('/demo-preview#/login');
  await expect(page).toHaveURL(/\/demo-preview#\/demo\/barber\/agenda$/);
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
  await expect(page.locator('.demo-header')).toHaveCount(0);
  await expect(page.getByTestId('category-barber')).toHaveCount(0);
  verify();
});

test('preserva o callback de recuperação inválida antes de montar o router', async ({ page }) => {
  const verify = await isolate(page, false);
  await page.goto('/?fluxo=nova-senha#error=access_denied&error_code=otp_expired&type=recovery');
  await expect(page).toHaveURL(/#\/update-password/);
  await expect(page.getByText('Este link expirou', { exact: true })).toBeVisible();
  verify();
});

test('usa o tema claro padrão no agendamento da demo sem alterar o modo salvo', async ({ page }) => {
  const verify = await isolate(page);
  await page.addInitScript(() => localStorage.setItem('agendix_color_mode', 'dark'));
  await page.goto('/#/demo/barber/book/simulacao');
  await expect(page.getByText('Escolha seus serviços', { exact: true })).toBeVisible();
  await expect(page.locator('#booking-root h1')).toHaveCSS('color', 'rgb(26, 22, 16)');
  await expect(page.getByText('Corte masculino', { exact: true })).toBeVisible();
  await expect(page.locator('#booking-root img[src*="/landing/agenda-"]')).toHaveCount(0);
  await page.getByText('Corte masculino', { exact: true }).first().click();
  await expect(page.getByRole('button', { name: /Continuar/ }).first()).toBeEnabled();
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'barber');
  await expect(page.getByRole('button', { name: 'Ativar modo claro' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('agendix_color_mode'))).toBe('dark');
  verify();
  await page.getByRole('link', { name: /AgendiX/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Mais que agenda.');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('agendix_color_mode'))).toBe('dark');
});


test('a demo abre o histórico da fila e a ficha do cliente dentro da simulação', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const verify = await isolate(page);

  await page.goto('/#/demo/beauty/fila');
  await page.getByRole('button', { name: 'Histórico', exact: true }).click();
  await expect(page).toHaveURL(/#\/demo\/beauty\/fila\/historico$/);
  await expect(page.getByRole('heading', { name: 'Histórico da fila' })).toBeVisible();

  await page.goto('/#/demo/barber/clientes');
  const profile = page.getByRole('heading', { name: 'Pedro Souza', exact: true });
  await profile.click();
  await expect(page).toHaveURL(/#\/demo\/barber\/clientes\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'Pedro Souza', exact: true })).toBeVisible();

  await page.locator('.demo-niches').getByRole('link', { name: 'Salão' }).click();
  await expect(page).toHaveURL(/#\/demo\/beauty\/clientes$/);
  await expect(page.getByRole('heading', { name: 'Beatriz Souza', exact: true })).toBeVisible();
  verify();
});
