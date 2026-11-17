import { test, expect, type Page } from '@playwright/test';
import { loadEnv } from 'vite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const artifactsDir = process.env.SITE_V2_ARTIFACTS_DIR || '/workspace/artifacts/site-v2';

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
  test(`entrada pública abre o login e mantém a landing separada ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page).toHaveURL(/#\/login$/);
    await expect(page.getByTestId('category-barber')).toBeVisible();
    await expect(page.getByTestId('category-beauty')).toBeVisible();
    await expect(page.locator('.landing')).toHaveCount(0);
    await page.getByTestId('category-barber').click();
    await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
    await page.goto('/#/landing');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu talento cuida dos clientes.');
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
    const completedBackgroundAlpha = await page.locator('.agenda-event-chip.agenda-status-completed').first().evaluate(element => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d')!;
      context.fillStyle = getComputedStyle(element).backgroundColor;
      context.fillRect(0, 0, 1, 1);
      return context.getImageData(0, 0, 1, 1).data[3];
    });
    expect(completedBackgroundAlpha, 'A grade não deve atravessar o fundo do atendimento concluído').toBe(255);
    const selectedDay = page.getByTestId('agenda-day-selected');
    await expect(selectedDay).toHaveCSS('background-color', 'rgb(83, 97, 116)');
    if (width === 390) {
      const grid = await page.getByTestId('agenda-grid-root').boundingBox();
      expect(grid?.y, 'A grade deve começar antes de 390px').toBeLessThan(390);
      const moreScreens = page.getByRole('button', { name: 'Ver mais telas' });
      await expect(moreScreens).toBeVisible();
      await moreScreens.click();
      await expect(page.getByRole('link', { name: 'Equipe', exact: true })).toBeInViewport();
      await page.getByRole('button', { name: 'Ver telas anteriores' }).click();
      await expect(page.getByRole('link', { name: 'Agenda', exact: true })).toBeInViewport();
      for (const control of [page.getByRole('button', { name: 'Histórico', exact: true }), page.getByTestId('agenda-public-link'), page.getByRole('button', { name: 'Todos os agendamentos', exact: true }), page.locator('#btn-new-appointment'), page.getByTestId('agenda-month-trigger')]) {
        const box = await control.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
        expect(box?.width).toBeGreaterThanOrEqual(44);
      }
    }
    await page.getByRole('button', { name: /Novo Agendamento/i }).first().click();
    await expect(page.getByRole('dialog').first()).toBeVisible();
    await page.getByTestId('agenda-choice-new-appointment').click();
    await expect(page.getByRole('dialog').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('link', { name: 'Financeiro', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Financeiro/i }).first()).toBeVisible();
    await expect(page.getByText('Saldo do período', { exact: true })).toBeVisible();
    await expect(page.getByText('Antes de comissões pendentes', { exact: true })).toBeVisible();
    if (width === 390) {
      await expect(page.getByTestId('finance-tx-card')).toHaveCount(6);
      await expect(page.getByTestId('finance-tx-card').filter({ hasText: 'Saída' }).first()).toBeVisible();
      await expect(page.getByTestId('finance-tx-card').filter({ hasText: 'Entrada' }).first()).toBeVisible();
      await page.getByRole('button', { name: 'Mostrar mais transações' }).click();
      await expect(page.getByTestId('finance-tx-card')).toHaveCount(12);
    }
    if (width === 1440) {
      await page.getByRole('button', { name: 'Performance da equipe', exact: true }).click();
      await expect(page).toHaveURL(/#\/demo\/barber\/financeiro\/performance/);
    } else await page.getByRole('link', { name: 'Hora de cadeira', exact: true }).click();
    await expect(page.getByText('Sua hora de cadeira', { exact: true })).toBeVisible();
    await expect(page.getByText('Não foi possível carregar os resultados.', { exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Salão', exact: true }).click();
    await expect(page.getByText('Studio Aurora', { exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'beauty');
    await expect(page).toHaveURL(/#\/demo\/beauty\/financeiro\/performance/);
    await expect(page.getByText('Sua hora de atendimento', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Agenda', exact: true }).click();
    await expect(page.getByRole('button', { name: /Beatriz Souza —/ }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Fazer tour guiado' }).click();
    await page.getByRole('button', { name: 'Próximo passo' }).click();
    await expect(page.getByRole('heading', { name: /Studio Aurora/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crie sua conta grátis' })).toHaveAttribute('href', '/#/register?type=beauty');
    verify();
  });
  test(`landing e capturas ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto('/#/landing');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu talento cuida dos clientes.');
    await expect(page.getByRole('link', { name: 'Entrar', exact: true })).toHaveAttribute('href', '/#/login');
    await expect(page.getByRole('link', { name: 'Crie sua conta grátis', exact: true }).first()).toHaveAttribute('href', '/#/register');
    if (width === 390) {
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      await expect(page.getByRole('link', { name: 'Criar conta para salão' })).toHaveAttribute('href', '/#/register?type=beauty');
      await page.getByRole('button', { name: 'Fechar menu' }).click();
    } else {
      const business = page.getByRole('group', { name: 'Negócio da demonstração' });
      await business.getByRole('button', { name: 'Salão', exact: true }).click();
      await expect(page.locator('.landing-hero .landing-button')).toHaveAttribute('href', '/#/register?type=beauty');
      await business.getByRole('button', { name: 'Barbearia', exact: true }).click();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await prepareLandingCapture(page);
    mkdirSync(path.join(artifactsDir, 'landing-shots'), { recursive: true });
    await page.screenshot({ path: path.join(artifactsDir, `landing-shots/landing-${width}.png`), fullPage: true });
  });
}

for (const width of [320, 390, 768, 1440]) {
  test(`landing acessível por teclado e sem overflow em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const runtimeErrors: string[] = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await page.goto('/#/landing');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('.landing-hero .landing-button').first()).toBeInViewport();
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
    if (width <= 760) {
      const business = page.getByRole('group', { name: 'Negócio da demonstração' });
      const views = page.getByRole('group', { name: 'Tela da demonstração' });
      await business.getByRole('button', { name: 'Salão', exact: true }).click();
      await views.getByRole('button', { name: 'Financeiro', exact: true }).click();
      const explore = page.getByRole('link', { name: 'Explorar a simulação', exact: true });
      await expect(explore).toBeVisible();
      await expect(explore).toHaveAttribute('href', '/#/demo/beauty/financeiro');
      await expect(page.locator('.landing-demo-embed-action')).toBeHidden();
      await expect(page.locator('.landing-demo-frame iframe')).toHaveCount(0);
    }
    expect(runtimeErrors).toEqual([]);
  });
}

test('explora a demonstração embutida mantendo segmento e tarefa sem integrações externas', async ({ page }) => {
  const verify = await isolate(page);
  await page.goto('/#/landing');
  const business = page.getByRole('group', { name: 'Negócio da demonstração' });
  const views = page.getByRole('group', { name: 'Tela da demonstração' });
  await business.getByRole('button', { name: 'Salão', exact: true }).click();
  await views.getByRole('button', { name: 'Financeiro', exact: true }).click();
  await expect(page.locator('.landing-demo-frame iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Explorar a simulação', exact: true }).click();
  const iframe = page.locator('.landing-demo-frame iframe');
  await expect(iframe).toHaveAttribute('src', '/#/demo/beauty/financeiro');
  const frame = page.frameLocator('.landing-demo-frame iframe');
  await expect(frame.getByRole('heading', { name: 'Financeiro', exact: true })).toBeVisible();
  await expect(frame.getByText('Saldo do período', { exact: true })).toBeVisible();
  await views.getByRole('button', { name: 'Agendamento online', exact: true }).click();
  await expect(iframe).toHaveAttribute('src', '/#/demo/beauty/book/simulacao');
  await expect(frame.getByText('Escolha seus serviços', { exact: true })).toBeVisible();
  await expect(frame.getByRole('heading', { name: /Studio Aurora/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir em tela cheia', exact: true })).toHaveAttribute('href', '/#/demo/beauty/book/simulacao');
  verify();
});

test('preserva o callback de recuperação inválida antes de montar o router', async ({ page }) => {
  const verify = await isolate(page, false);
  await page.goto('/?fluxo=nova-senha#error=access_denied&error_code=otp_expired&type=recovery');
  await expect(page).toHaveURL(/#\/update-password/);
  await expect(page.getByText('Este link expirou', { exact: true })).toBeVisible();
  verify();
});

test('mantém o agendamento público da demo claro sem alterar o modo salvo', async ({ page }) => {
  const verify = await isolate(page);
  await page.addInitScript(() => localStorage.setItem('agendix_color_mode', 'dark'));
  await page.goto('/#/demo/barber/book/simulacao');
  await expect(page.getByText('Escolha seus serviços', { exact: true })).toBeVisible();
  await expect(page.locator('#booking-root h1')).toHaveCSS('color', 'rgb(32, 40, 51)');
  await expect(page.locator('#booking-root .container').filter({ has: page.locator('h1') }).first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByText('Corte masculino', { exact: true })).toBeVisible();
  await expect(page.locator('#booking-root img[src*="/landing/agenda-"]')).toHaveCount(0);
  await page.getByText('Corte masculino', { exact: true }).first().click();
  await expect(page.getByRole('button', { name: /Continuar/ }).first()).toBeEnabled();
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'barber');
  await expect(page.getByRole('button', { name: 'Ativar modo escuro' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('agendix_color_mode'))).toBe('dark');
  verify();
  await page.getByRole('link', { name: 'AgendiX', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu talento cuida dos clientes.');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('agendix_color_mode'))).toBe('dark');
});
