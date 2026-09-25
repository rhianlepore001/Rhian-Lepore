/**
 * E2E — iOS PWA (standalone) safe areas: header abaixo da status bar e bottom nav
 * acima do home indicator; Android/desktop sem nenhuma mudança (insets = 0).
 *
 * O Playwright/WebKit reporta env(safe-area-inset-*) = 0, então simulamos o iPhone
 * com o override nativo do Chromium (CDP Emulation.setSafeAreaInsetsOverride), que
 * alimenta o env() real — nenhum CSS é injetado.
 *
 *   E2E_BASE_URL=http://127.0.0.1:4173 E2E_OWNER_EMAIL=... E2E_OWNER_PASS=... \
 *     npx playwright test e2e/ios-safe-area.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Browser } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? '';
const OWNER_PASS = process.env.E2E_OWNER_PASS ?? '';

type Insets = { top: number; bottom: number };

async function openApp(browser: Browser, viewport: { width: number; height: number }, insets: Insets) {
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', {
    insets: { top: insets.top, bottom: insets.bottom, left: 0, right: 0 },
  });
  return { context, page };
}

async function login(page: Page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'load' });
  await page.getByTestId('category-barber').click();
  await page.locator('input[type="email"]').fill(OWNER_EMAIL);
  await page.locator('input[type="password"]').fill(OWNER_PASS);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/#\/(?!login)/, { timeout: 45_000 });
  await page.goto(`${BASE}/#/agenda`, { waitUntil: 'load' });
  await page.locator('nav[aria-label="Navegação principal"]').waitFor({ timeout: 30_000 });
}

async function chromeGeometry(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector('header')!.getBoundingClientRect();
    const nav = document.querySelector('nav[aria-label="Navegação principal"]')!.getBoundingClientRect();
    const labels = [...document.querySelectorAll('nav[aria-label="Navegação principal"] button > span')].map((s) =>
      s.getBoundingClientRect()
    );
    return {
      vh: window.innerHeight,
      headerTop: header.top,
      navTop: nav.top,
      navBottom: nav.bottom,
      labelsMaxBottom: Math.max(...labels.map((l) => l.bottom)),
      labelsMinHeight: Math.min(...labels.map((l) => l.height)),
    };
  });
}

test.describe('iOS safe areas (PWA instalado)', () => {
  test.skip(!OWNER_EMAIL || !OWNER_PASS, 'Defina E2E_OWNER_EMAIL e E2E_OWNER_PASS para rodar este spec.');
  test.setTimeout(120_000);

  test('iPhone standalone (47/34): header abaixo da status bar, nav acima do home indicator', async ({ browser }) => {
    const insets = { top: 47, bottom: 34 };
    const { context, page } = await openApp(browser, { width: 390, height: 844 }, insets);
    await login(page);
    const g = await chromeGeometry(page);
    expect(g.headerTop).toBeGreaterThanOrEqual(insets.top);
    expect(g.navBottom).toBe(g.vh);
    expect(g.labelsMaxBottom).toBeLessThanOrEqual(g.vh - insets.bottom);
    expect(g.labelsMinHeight).toBeGreaterThanOrEqual(12); // labels inteiros, não cortados
    await context.close();
  });

  test('Android (insets 0): layout idêntico ao anterior (header no topo, nav de 64px)', async ({ browser }) => {
    const { context, page } = await openApp(browser, { width: 412, height: 915 }, { top: 0, bottom: 0 });
    await login(page);
    const g = await chromeGeometry(page);
    expect(g.headerTop).toBe(0);
    expect(g.navBottom).toBe(g.vh);
    expect(g.navBottom - g.navTop).toBe(64);
    await context.close();
  });
});
