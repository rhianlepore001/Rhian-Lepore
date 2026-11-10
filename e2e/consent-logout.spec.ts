import { expect, test, type Page } from '@playwright/test';
import { installMocks } from './whatsapp-mocks';

// LGPD: a escolha de cookies é do aparelho, não da conta. Sair da conta não pode apagá-la,
// e quem nunca escolheu continua vendo o aviso completo nas telas públicas.
const KEY = 'agendix:marketing-consent:v1';
const SHOTS = process.env.CONSENT_SHOTS_DIR;

async function logout(page: Page) {
  const isMobile = (page.viewportSize()?.width ?? 1440) < 768;
  if (isMobile) {
    await page.getByRole('button', { name: 'Mais opções' }).click();
    await page.getByRole('button', { name: /Sair da Conta/ }).click();
  } else {
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
  }
  await expect(page).toHaveURL(/#\/login/);
  await expect(page.getByText(/Escolha o seu/i)).toBeVisible();
}

for (const theme of ['barber', 'beauty'] as const) {
  test(`${theme}: escolha de cookies sobrevive ao logout`, async ({ page }, info) => {
    await installMocks(page, theme, 'owner');
    await page.goto('/#/');
    await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ version: 1, choice: 'accepted', savedAt: Date.now() })), KEY);
    await expect(page.getByRole('button', { name: 'Mais opções' }).or(page.getByRole('button', { name: 'Sair', exact: true }))).toBeVisible();
    await logout(page);
    await expect(page.getByRole('region', { name: 'Cookies e privacidade' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Preferências de cookies' })).toBeVisible();
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), KEY);
    expect(stored?.choice).toBe('accepted');
    if (SHOTS) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.screenshot({ path: `${SHOTS}/${info.project.name}-${theme}-pos-logout-com-escolha.png` });
    }
  });

  test(`${theme}: sem escolha, o aviso completo aparece após o logout`, async ({ page }, info) => {
    await installMocks(page, theme, 'owner');
    await page.goto('/#/');
    await page.evaluate((key) => localStorage.removeItem(key), KEY);
    await expect(page.getByRole('button', { name: 'Mais opções' }).or(page.getByRole('button', { name: 'Sair', exact: true }))).toBeVisible();
    await logout(page);
    await expect(page.getByRole('region', { name: 'Cookies e privacidade' })).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${info.project.name}-${theme}-pos-logout-sem-escolha.png` });
  });
}
