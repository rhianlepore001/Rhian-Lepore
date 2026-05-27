const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Navegar para a página de login
  await page.goto('http://localhost:3001/#/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // 1.5 Clicar no segmento "Barbearias" para acessar o formulário de login
  const barberBtn = await page.locator('text=ENTRAR').first();
  if (await barberBtn.isVisible()) {
    await barberBtn.click();
    await page.waitForTimeout(2000);
  }

  // 2. Preencher credenciais
  await page.fill('input[type="email"]', 'rleporesilva@gmail.com');
  await page.fill('input[type="password"]', 'rhianlepore789');

  // 3. Clicar em entrar
  await page.click('button[type="submit"]');

  // 4. Aguardar redirect para dashboard
  await page.waitForURL('http://localhost:3001/#/', { timeout: 15000 });
  await page.waitForTimeout(3000);

  // 5. Screenshot dark mode (default)
  await page.screenshot({ path: 'screenshots/dashboard-dark.png', fullPage: true });

  // 6. Clicar no toggle de tema para light mode
  const themeToggle = await page.locator('#header-theme-toggle');
  if (await themeToggle.isVisible()) {
    await themeToggle.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/dashboard-light.png', fullPage: true });
  }

  // 7. Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/dashboard-mobile.png', fullPage: true });

  await browser.close();
  console.log('Screenshots capturados com sucesso!');
})();
