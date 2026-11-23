import { test, expect } from '@playwright/test';

const shotsDir = process.env.LANDING_IFRAME_SHOTS_DIR;

test.describe('simulação embutida na landing', () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`demonstração abre na experiência prevista (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize(viewport);
      // Nunca falar com Supabase/Meta durante o teste.
      await page.route(/supabase|facebook/, (route) => route.abort());
      const response = await page.goto('/#/landing');
      const headers = response!.headers();
      expect(headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(headers['content-security-policy']).toContain("script-src 'self'");
      expect(headers['content-security-policy-report-only']).toContain("frame-ancestors 'self'");

      for (const niche of [{ tab: /Barbearia/i, title: /barbearia/i, path: 'barber' }, { tab: /Sal[aã]o/i, title: /sal[aã]o/i, path: 'beauty' }]) {
        await page.locator('#demonstracao').getByRole('button', { name: niche.tab }).first().click();
        await page.locator('#demonstracao').getByRole('button', { name: 'Agenda', exact: true }).click();
        const iframe = page.locator('#demonstracao iframe');
        if (viewport.width < 960) {
          await expect(iframe).toHaveCount(0);
          await page.getByRole('link', { name: 'Explorar a simulação' }).click();
          await expect(page).toHaveURL(`/#/demo/${niche.path}/agenda`);
          await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible({ timeout: 20000 });
          await page.getByRole('link', { name: 'Voltar ao site do AgendiX' }).click();
          continue;
        }

        const explore = page.locator('#demonstracao').getByRole('button', { name: /Explorar a simulação/i });
        if (await explore.isVisible()) await explore.click();
        await expect(iframe).toHaveAttribute('title', niche.title);
        await iframe.scrollIntoViewIfNeeded();
        const frame = page.frameLocator('#demonstracao iframe');
        await expect(frame.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible({ timeout: 20000 });
        if (shotsDir) await page.locator('#demonstracao').screenshot({ path: `${shotsDir}/demo-embutida-${niche.path}-${viewport.width}.png` });
      }
    });
  }

  test('origem externa continua bloqueada ao tentar embutir o site', async ({ page }) => {
    await page.route(/supabase|facebook/, (route) => route.abort());
    await page.goto('http://127.0.0.1:4311/');
    const handle = await page.locator('#alvo').elementHandle();
    const frame = await handle!.contentFrame();
    // O Chromium troca o documento bloqueado por XFO por uma página de erro.
    await page.waitForTimeout(3000);
    const blocked = await frame!.evaluate(() => document.body?.innerText ?? '').then(
      (text) => !text.includes('Simulação'),
      () => true,
    );
    expect(blocked, 'o site não pode renderizar dentro de outra origem').toBe(true);
    await expect(frame!.locator('text=Simulação')).toHaveCount(0);
  });
});
