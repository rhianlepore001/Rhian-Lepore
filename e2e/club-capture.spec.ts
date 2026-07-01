/**
 * Captura screenshots do fluxo end-to-end do Clube de Assinatura.
 * Cobre 5 passos: Plano → Dados → Pix → Ativo → Checkout
 * Em mobile (375x812) e desktop (1440x900).
 */

import { test, Page } from '@playwright/test';

const VIEWS = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'desktop', width: 1440, height: 900 },
];

async function captureStep(page: Page, name: string, action: () => Promise<void>) {
    await action();
    await page.waitForTimeout(500);
    await page.screenshot({
        path: `e2e/screenshots/club/${name}.png`,
        fullPage: true,
    });
}

for (const view of VIEWS) {
    test(`captura clube ${view.name}`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height } });
        const page = await ctx.newPage();
        await page.goto('http://localhost:3000/#/club-demo');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800);

        // 1. Planos
        await captureStep(page, `${view.name}-1-plans`, async () => {
            // Apenas carregou
        });

        // 2. Dados — clica no Gold
        await captureStep(page, `${view.name}-2-data`, async () => {
            await page.locator('button:has-text("Quero este")').first().click();
        });

        // 3. Pix — clica "Continuar"
        await captureStep(page, `${view.name}-3-pix`, async () => {
            await page.locator('button:has-text("Continuar")').click();
        });

        // 4. Ativo — clica "Simular Pix Recebido"
        await captureStep(page, `${view.name}-4-active`, async () => {
            await page.locator('[data-testid="simulate-pix-confirm"]').click();
        });

        // 5. Checkout — agenda um serviço coberto (Corte)
        await captureStep(page, `${view.name}-5-checkout-free`, async () => {
            await page.locator('[data-testid="schedule-svc-corte"]').click();
        });

        // 6. Checkout — agenda um serviço não coberto (Pigmentação)
        await captureStep(page, `${view.name}-6-checkout-paid`, async () => {
            await page.locator('[data-testid="schedule-svc-pigmentacao"]').click();
        });

        await ctx.close();
    });
}
