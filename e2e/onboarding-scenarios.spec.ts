import { test, expect, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { mockBackend, freshState, noProdTraffic, EMAIL } from './helpers/mockBackend';

/** Cenários de borda do cadastro/onboarding (backend falso, nada em produção). Prints em AUDIT_OUT. */
const OUT = process.env.AUDIT_OUT ?? '/workspace/onboarding-audit';

async function countReplaceState(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__replaceCount = 0;
    const orig = history.replaceState.bind(history);
    history.replaceState = (...a: Parameters<typeof history.replaceState>) => { w.__replaceCount++; return orig(...a); };
  });
}
const replaces = (page: Page) => page.evaluate(() => (window as any).__replaceCount as number);
async function shot(page: Page, name: string) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: `${OUT}/${test.info().project.name}__cenario__${name}.png` });
}
async function login(page: Page) {
  await page.goto('/#/login');
  const recusar = page.getByRole('button', { name: /recusar/i });
  if (await recusar.count()) await recusar.first().click();
  await page.getByTestId('category-barber').click();
  await page.locator('#login-email').fill(EMAIL);
  await page.locator('#login-password').fill('Senha@Forte1');
  await page.locator('#login-password').press('Enter');
}

test('dono sem perfil, onboarding já concluído (caso do Rafael): entra sem laço de redirecionamento', async ({ page }) => {
  const state = freshState({ userType: 'barber', orphanCompleted: true });
  await mockBackend(page, state);
  await countReplaceState(page);
  await login(page);
  await page.waitForTimeout(4000);
  await shot(page, 'sem-perfil-onboarding-concluido');
  expect(await replaces(page)).toBeLessThan(20);
  expect(page.url()).not.toMatch(/onboarding-wizard/);
  expect(state.ensureCalls).toBeGreaterThanOrEqual(1);
  expect(noProdTraffic(state)).toEqual([]);
});

test('falha ao recriar o perfil: não entra em laço e não mostra tela de erro do sistema', async ({ page }) => {
  const state = freshState({ userType: 'barber', orphanCompleted: true, ensureFails: true });
  await mockBackend(page, state);
  await countReplaceState(page);
  await login(page);
  await page.waitForTimeout(4000);
  await shot(page, 'falha-ao-recriar-perfil');
  expect(await replaces(page)).toBeLessThan(20);
  await expect(page.getByText(/Sistema Interrompido/i)).toHaveCount(0);
  expect(noProdTraffic(state)).toEqual([]);
});

test('cadastro com confirmação de e-mail: mostra orientação clara e não abre o onboarding', async ({ page }) => {
  const state = freshState({ userType: 'beauty', emailConfirmation: true });
  await mockBackend(page, state);
  await countReplaceState(page);
  await page.goto('/#/register');
  await page.getByTestId('category-beauty').click();
  const recusar = page.getByRole('button', { name: /recusar/i });
  if (await recusar.count()) await recusar.first().click();
  await page.locator('#reg-name').fill('Rafael Teste');
  await page.getByLabel('Nome do negócio').fill('Oliveira Cortes');
  await page.locator('#reg-email').fill(EMAIL);
  const phone = page.getByLabel(/whatsapp/i).first();
  if (await phone.count()) await phone.fill('11999999999');
  await page.getByLabel('Senha', { exact: true }).fill('Senha@Forte1');
  await page.getByLabel('Confirmar senha').fill('Senha@Forte1');
  const terms = page.getByRole('checkbox');
  if (await terms.count()) await terms.first().check();
  await page.getByRole('button', { name: /finalizar cadastro/i }).click();
  await page.waitForTimeout(3000);
  await shot(page, 'cadastro-com-confirmacao-de-email');
  expect(page.url()).not.toMatch(/onboarding-wizard/);
  expect(noProdTraffic(state)).toEqual([]);
});
