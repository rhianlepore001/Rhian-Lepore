import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('demo: abre modal de reportar problema e mostra ferramenta de demarcacao', async ({ page }) => {
  await page.goto('/#/playwright-bug-reporter-demo');

  const dialog = page.locator('[data-bug-report-dialog]');
  await expect(dialog).toBeVisible({ timeout: 15000 });

  await page.waitForFunction(() => {
    const el = document.querySelector('[data-bug-report-dialog]');
    if (!el) return false;
    const img = el.querySelector('img');
    return img?.naturalWidth > 0;
  }, { timeout: 15000 });

  await expect(dialog.locator('text=Print da tela')).toBeVisible();
  await expect(dialog.getByText(/Descrição/i)).toBeVisible();
  await expect(dialog.getByText(/Lápis/i)).toBeVisible();

  await page.screenshot({ path: `e2e/screenshots/bug-reporter-demo-${test.info().project.name}.png`, fullPage: false });
});

test('demo: desenha marcacao no screenshot', async ({ page }) => {
  await page.goto('/#/playwright-bug-reporter-demo');

  const dialog = page.locator('[data-bug-report-dialog]');
  await expect(dialog).toBeVisible({ timeout: 15000 });

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
    // Seleciona cor branca e espessura grossa para ficar visível no print escuro
    await page.click('button[aria-label="Cor branco"]');
    await page.click('button[aria-label="Espessura 10px"]');

    // Simula desenho freehand disparando eventos de mouse diretamente no canvas
    await page.evaluate((rect) => {
      const canvas = document.querySelector('[data-bug-report-dialog] canvas') as HTMLCanvasElement | null;
      if (!canvas) return;
      const dispatch = (type: string, x: number, y: number) => {
        const event = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: rect.x + x,
          clientY: rect.y + y,
          buttons: type === 'mousemove' ? 1 : 0,
        });
        canvas.dispatchEvent(event);
      };
      dispatch('mousedown', rect.width * 0.2, rect.height * 0.2);
      for (let i = 0; i <= 20; i++) {
        dispatch('mousemove', rect.width * (0.2 + i * 0.03), rect.height * (0.2 + Math.sin(i * 0.5) * 0.15));
      }
      dispatch('mouseup', rect.width * 0.8, rect.height * 0.35);
    }, box);
  }

  // Verifica se o canvas tem pixels desenhados (garante que a ferramenta de demarcação funciona)
  const hasDrawing = await page.evaluate(() => {
    const canvas = document.querySelector('[data-bug-report-dialog] canvas');
    if (!canvas) return false;
    const ctx = (canvas as HTMLCanvasElement).getContext('2d');
    if (!ctx) return false;
    const { width, height } = canvas as HTMLCanvasElement;
    const imageData = ctx.getImageData(0, 0, width, height);
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 0) return true;
    }
    return false;
  });
  expect(hasDrawing).toBe(true);

  await page.screenshot({ path: `e2e/screenshots/bug-reporter-demo-annotated-${test.info().project.name}.png`, fullPage: false });
});
