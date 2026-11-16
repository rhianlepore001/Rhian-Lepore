import { test, expect, type Page } from '@playwright/test';
import { loadEnv } from 'vite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const artifactsDir = process.env.SITE_V2_ARTIFACTS_DIR || '/workspace/artifacts/site-v2';

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
  await page.routeWebSocket(/supabase\.(co|in|com|net|invalid)/, socket => { forbidden.push('websocket'); socket.close(); });
  return () => { if (requireNoExternal) expect(forbidden, 'A demo não pode chamar integrações externas').toEqual([]); expect(errors, 'Erros de runtime').toEqual([]); };
}

for (const width of [1440, 390]) {
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
    await expect(page.getByRole('button', { name: /Beatriz Souza —/ }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Fazer tour guiado' }).click();
    await page.getByRole('button', { name: 'Próximo passo' }).click();
    await expect(page.getByRole('heading', { name: /Studio Aurora/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crie sua conta grátis' })).toHaveAttribute('href', '/#/register?type=beauty');
    verify();
  });
  test(`landing e capturas ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu talento cuida dos clientes.');
    await expect(page.getByRole('link', { name: 'Entrar', exact: true })).toHaveAttribute('href', '/#/login');
    await expect(page.getByRole('link', { name: 'Crie sua conta grátis', exact: true }).first()).toHaveAttribute('href', '/#/register');
    if (width === 390) await page.getByRole('button', { name: 'Abrir menu' }).click();
    await expect(page.getByRole('link', { name: 'Criar conta para salão' })).toHaveAttribute('href', '/#/register?type=beauty');
    if (width === 390) await page.getByRole('button', { name: 'Fechar menu' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.evaluate(() => window.scrollTo(0, 0));
    mkdirSync(path.join(artifactsDir, 'landing-shots'), { recursive: true });
    await page.screenshot({ path: path.join(artifactsDir, `landing-shots/landing-${width}.png`), fullPage: true });
  });
}

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
