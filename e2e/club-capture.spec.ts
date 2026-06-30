import { test, Page } from '@playwright/test';

const VIEWS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
];

const TABS = [
    { name: 'plans', selector: 'button:has-text("Planos")' },
    { name: 'pix', selector: 'button:has-text("Configurar Pix")' },
    { name: 'members', selector: 'button:has-text("Assinantes")' },
    { name: 'join', selector: 'button:has-text("Cliente contrata")' },
    { name: 'pix-display', selector: 'button:has-text("Cliente vê QR Pix")' },
];

for (const view of VIEWS) {
    test(`captura clube ${view.name}`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height } });
        const page = await ctx.newPage();
        await page.goto('http://localhost:3000/#/club-demo');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        for (const tab of TABS) {
            const btn = page.locator(tab.selector).first();
            if (await btn.isVisible()) {
                await btn.click();
                await page.waitForTimeout(400);
                await page.screenshot({
                    path: `e2e/screenshots/club/${view.name}-${tab.name}.png`,
                    fullPage: true,
                });
            }
        }
        await ctx.close();
    });
}
