import { test, expect } from '@playwright/test';

const shotsDir = process.env.LANDING_IFRAME_SHOTS_DIR;

test.describe('simulação embutida na landing', () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`iframe da demo carrega na landing (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize(viewport);
      // Nunca falar com Supabase/Meta durante o teste.
      await page.route(/supabase|facebook/, (route) => route.abort());
      const response = await page.goto('/');
      const headers = response!.headers();
      expect(headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(headers['content-security-policy-report-only']).toContain("frame-ancestors 'self'");

      for (const niche of [{ tab: /Barbearia/i, title: /barbearia/i }, { tab: /Sal[aã]o/i, title: /sal[aã]o/i }]) {
        await page.locator('#demonstracao').getByRole('button', { name: niche.tab }).first().click();
        const explore = page.locator('#demonstracao').getByRole('button', { name: /Explorar a simulação/i });
        if (await explore.isVisible()) await explore.click();
        const iframe = page.locator('#demonstracao iframe');
        await expect(iframe).toHaveAttribute('title', niche.title);
        await iframe.scrollIntoViewIfNeeded();
        const frame = page.frameLocator('#demonstracao iframe');
        await expect(frame.getByText('Simulação', { exact: true }).first()).toBeVisible({ timeout: 20000 });
        await expect(frame.getByRole('heading', { name: /Agenda/i }).first()).toBeVisible();
        if (shotsDir) await page.locator('#demonstracao').screenshot({ path: `${shotsDir}/demo-embutida-${niche.tab.source.includes('Barb') ? 'barbearia' : 'salao'}-${viewport.width}.png` });
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
