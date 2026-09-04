/**
 * E2E — Gateway de login não herda tema da sessão (white/light, park/dark, beauty).
 *
 * Reproduz o index bugado após logout: data-mode/data-theme da área logada
 * ficam no <html> e os cards BARBEARIAS/STUDIOS (overlay escuro + --color-text)
 * perdem contraste.
 *
 * Combos: barber×dark, barber×light (white), beauty×dark (park), beauty×light.
 *
 *   npx playwright test e2e/login-gateway-theme.spec.ts --project=chromium-legacy
 *
 * Login real (opcional):
 *   E2E_OWNER_EMAIL=... E2E_OWNER_PASS=... npx playwright test e2e/login-gateway-theme.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? process.env.AGENDIX_TEST_EMAIL ?? '';
const OWNER_PASS = process.env.E2E_OWNER_PASS ?? process.env.AGENDIX_TEST_PASSWORD ?? '';
const ARTIFACTS = process.env.E2E_ARTIFACTS_DIR || '/opt/cursor/artifacts';

type ThemeCombo = {
  name: string;
  theme: 'barber' | 'beauty';
  mode: 'dark' | 'light';
};

const COMBOS: ThemeCombo[] = [
  { name: 'barber-dark', theme: 'barber', mode: 'dark' },
  { name: 'barber-light', theme: 'barber', mode: 'light' },
  { name: 'beauty-dark', theme: 'beauty', mode: 'dark' },
  { name: 'beauty-light', theme: 'beauty', mode: 'light' },
];

type GatewaySnapshot = {
  dataTheme: string | null;
  dataMode: string | null;
  colorBg: string;
  colorText: string;
  headingColor: string;
  barberTitleColor: string;
  entrarColor: string;
  savedMode: string | null;
};

function parseColor(color: string): [number, number, number] | null {
  const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const hex = color.trim();
  const m6 = hex.match(/^#([0-9a-f]{6})$/i);
  if (m6) {
    const n = m6[1];
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  }
  const m3 = hex.match(/^#([0-9a-f]{3})$/i);
  if (m3) {
    const n = m3[1];
    return [
      parseInt(n[0] + n[0], 16),
      parseInt(n[1] + n[1], 16),
      parseInt(n[2] + n[2], 16),
    ];
  }
  return null;
}

function relativeLuminance(rgb: [number, number, number]): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb.map(lin) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isLightColor(color: string): boolean {
  const rgb = parseColor(color);
  return rgb ? relativeLuminance(rgb) > 0.45 : false;
}

function isDarkColor(color: string): boolean {
  const rgb = parseColor(color);
  return rgb ? relativeLuminance(rgb) < 0.25 : false;
}

async function snapshotGateway(page: Page): Promise<GatewaySnapshot> {
  return page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const heading = document.querySelector('h1');
    const barber = document.querySelector('[data-testid="category-barber"] h2');
    const entrar = document.querySelector('[data-testid="category-barber"] span');
    return {
      dataTheme: document.documentElement.getAttribute('data-theme'),
      dataMode: document.documentElement.getAttribute('data-mode'),
      colorBg: css.getPropertyValue('--color-bg').trim(),
      colorText: css.getPropertyValue('--color-text').trim(),
      headingColor: heading ? getComputedStyle(heading).color : '',
      barberTitleColor: barber ? getComputedStyle(barber).color : '',
      entrarColor: entrar ? getComputedStyle(entrar).color : '',
      savedMode: localStorage.getItem('agendix_color_mode'),
    };
  });
}

async function expectHealthyGateway(page: Page, leftoverMode: 'dark' | 'light') {
  await expect(page.getByTestId('category-barber')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('category-beauty')).toBeVisible();

  const snap = await snapshotGateway(page);
  expect(snap.dataTheme, `data-theme leftover=${leftoverMode}`).toBe('barber');
  expect(snap.dataMode, `data-mode leftover=${leftoverMode}`).toBe('dark');
  expect(isDarkColor(snap.colorBg), `gateway bg must stay dark: ${JSON.stringify(snap)}`).toBe(true);
  expect(
    isLightColor(snap.colorText) && isLightColor(snap.barberTitleColor),
    `card title must be light on dark overlay: ${JSON.stringify(snap)}`,
  ).toBe(true);
  expect(snap.savedMode).toBe(leftoverMode);
  return snap;
}

test.describe('Gateway de login — tema pós-logout', () => {
  test.setTimeout(120_000);

  for (const combo of COMBOS) {
    test(`anti-FOUC + mount: ${combo.name} não vaza no index`, async ({ page }, testInfo) => {
      fs.mkdirSync(ARTIFACTS, { recursive: true });
      await page.setViewportSize({ width: 390, height: 844 });

      await page.addInitScript(({ theme, mode }) => {
        localStorage.setItem('agendix_color_mode', mode);
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-mode', mode);
      }, combo);

      await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
      const snap = await expectHealthyGateway(page, combo.mode);

      const shot = path.join(ARTIFACTS, `login-gateway-${combo.name}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      await testInfo.attach(`gateway-${combo.name}`, { path: shot, contentType: 'image/png' });
      await testInfo.attach(`snapshot-${combo.name}`, {
        body: JSON.stringify(snap, null, 2),
        contentType: 'application/json',
      });
    });
  }

  test('SPA: leftover no html some ao (re)montar o gateway', async ({ page }, testInfo) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('category-barber')).toBeVisible({ timeout: 20_000 });

    await page.evaluate(() => {
      localStorage.setItem('agendix_color_mode', 'light');
      document.documentElement.setAttribute('data-theme', 'beauty');
      document.documentElement.setAttribute('data-mode', 'light');
    });

    await page.goto(`${BASE}/#/register`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('agendix_color_mode', 'light');
      document.documentElement.setAttribute('data-theme', 'beauty');
      document.documentElement.setAttribute('data-mode', 'light');
    });
    await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });

    const snap = await expectHealthyGateway(page, 'light');
    const shot = path.join(ARTIFACTS, 'login-gateway-spa-remount.png');
    await page.screenshot({ path: shot, fullPage: false });
    await testInfo.attach('gateway-spa-remount', { path: shot, contentType: 'image/png' });
    expect(snap.dataMode).toBe('dark');
  });

  test('logout real restaura o gateway em todos os modos do header', async ({ page }, testInfo) => {
    test.skip(!OWNER_EMAIL || !OWNER_PASS, 'Credenciais E2E_OWNER_* não configuradas');
    fs.mkdirSync(ARTIFACTS, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto(`${BASE}/#/login`, { waitUntil: 'load' });
    await page.getByTestId('category-barber').click();
    await page.locator('input[type="email"]').waitFor({ timeout: 20_000 });
    await page.locator('input[type="email"]').fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(OWNER_PASS);
    await page.locator('button[type="submit"]').click();
    await page.getByText(/Olá,/i).first().waitFor({ timeout: 45_000 });

    const toggle = page.locator('#header-theme-toggle');
    await expect(toggle).toBeVisible({ timeout: 15_000 });

    const modes: Array<'dark' | 'light'> = ['dark', 'light'];
    for (const targetMode of modes) {
      const current = await page.evaluate(
        () => document.documentElement.getAttribute('data-mode') || 'dark',
      );
      if (current !== targetMode) {
        await toggle.click();
        await page.waitForFunction(
          (mode) => document.documentElement.getAttribute('data-mode') === mode,
          targetMode,
          { timeout: 5_000 },
        );
      }

      const more = page.getByRole('button', { name: /mais|menu/i }).first();
      if (await more.isVisible().catch(() => false)) {
        await more.click();
      }
      const sair = page.getByRole('button', { name: /sair/i }).first();
      await expect(sair).toBeVisible({ timeout: 10_000 });
      await sair.click();

      const snap = await expectHealthyGateway(page, targetMode);
      const shot = path.join(ARTIFACTS, `login-gateway-logout-${targetMode}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      await testInfo.attach(`logout-${targetMode}`, { path: shot, contentType: 'image/png' });
      expect(snap.dataMode).toBe('dark');

      if (targetMode === 'dark') {
        await page.getByTestId('category-barber').click();
        await page.locator('input[type="email"]').fill(OWNER_EMAIL);
        await page.locator('input[type="password"]').fill(OWNER_PASS);
        await page.locator('button[type="submit"]').click();
        await page.getByText(/Olá,/i).first().waitFor({ timeout: 45_000 });
      }
    }
  });
});
