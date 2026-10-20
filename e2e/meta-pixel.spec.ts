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
    const banner = page.getByRole('region', { name: 'Sua escolha sobre cookies' });
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
    await expect.poll(async () => page.evaluate(() => window.fbq?.queue.filter(args => args[2] === 'Lead').length)).toBe(1);
    await page.getByRole('button', { name: 'Preferências de cookies' }).click();
    await page.getByRole('button', { name: 'Recusar', exact: true }).click();
    await expect.poll(async () => page.evaluate(() => window.fbq?.queue.at(-1)?.[1])).toBe('revoke');
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
