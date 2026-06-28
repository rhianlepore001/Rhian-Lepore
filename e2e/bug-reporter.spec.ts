import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.AGENDIX_TEST_EMAIL ?? '';
const TEST_PASSWORD = process.env.AGENDIX_TEST_PASSWORD ?? '';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page, context }) => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Credenciais de teste nao configuradas');
  await context.clearCookies();
  await page.goto('/#/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  await page.waitForSelector('button[data-testid="category-barber"]', { timeout: 15000 });
  await page.click('button[data-testid="category-barber"]');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/#\/(dashboard|agenda)/, { timeout: 20000 });
});

test('abre modal de reportar problema e captura screenshot do viewport', async ({ page }) => {
  await page.waitForSelector('button[aria-label="Ajuda e reportar problema"]', { timeout: 10000 });
  await page.click('button[aria-label="Ajuda e reportar problema"]');
  await page.waitForSelector('button:has-text("Reportar problema")', { timeout: 5000 });
  await page.click('button:has-text("Reportar problema")');

  const dialog = page.locator('[data-bug-report-dialog]');
  await expect(dialog).toBeVisible({ timeout: 10000 });

  await page.waitForFunction(() => {
    const el = document.querySelector('[data-bug-report-dialog]');
    if (!el) return false;
    const img = el.querySelector('img');
    return img?.naturalWidth > 0;
  }, { timeout: 15000 });

  await expect(dialog.locator('text=Print da tela')).toBeVisible();
  await expect(dialog.locator('text=Descricao (opcional)')).toBeVisible();
  await expect(dialog.locator('text=Lapis')).toBeVisible();

  await page.screenshot({ path: `e2e/screenshots/bug-reporter-${test.info().project.name}.png`, fullPage: false });
});

test('desenha marcacao no screenshot', async ({ page }) => {
  await page.waitForSelector('button[aria-label="Ajuda e reportar problema"]', { timeout: 10000 });
  await page.click('button[aria-label="Ajuda e reportar problema"]');
  await page.waitForSelector('button:has-text("Reportar problema")', { timeout: 5000 });
  await page.click('button:has-text("Reportar problema")');

  const dialog = page.locator('[data-bug-report-dialog]');
  await expect(dialog).toBeVisible({ timeout: 10000 });

  await page.waitForFunction(() => {
    const el = document.querySelector('[data-bug-report-dialog]');
    if (!el) return false;
    const img = el.querySelector('img');
    return img?.naturalWidth > 0;
  }, { timeout: 15000 });

  const canvas = dialog.locator('canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  if (box) {
    await canvas.hover();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 10 });
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3, { steps: 10 });
    await page.mouse.up();
  }

  await page.screenshot({ path: `e2e/screenshots/bug-reporter-annotated-${test.info().project.name}.png`, fullPage: false });
});
