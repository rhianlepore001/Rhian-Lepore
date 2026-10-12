/**
 * E2E — Recuperação de senha com Supabase Auth mockado (nenhum e-mail real).
 *
 *   VITE_SUPABASE_URL=http://127.0.0.1:59999 VITE_SUPABASE_ANON_KEY=fake npx vite --port 3417
 *   E2E_BASE_URL=http://127.0.0.1:3417 npx playwright test e2e/password-recovery.spec.ts --project=chromium-legacy
 *
 * Cobre: esqueci a senha → (link do e-mail, mockado) → nova senha → sucesso,
 * link expirado com botão para pedir outro, e URL limpa (sem tokens) com HashRouter.
 */
import { test, expect } from '@playwright/test';
import { expiredCallbackUrl, mockSupabaseAuth, MOCK_EMAIL, recoveryCallbackUrl } from './helpers/mockSupabaseAuth';

const BASE = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

test.describe('recuperação de senha', () => {
  test('esqueci a senha → link → nova senha → painel', async ({ page }) => {
    const log = await mockSupabaseAuth(page);

    await page.goto(`${BASE}/#/forgot-password`);
    await expect(page.getByRole('heading', { name: 'Esqueceu sua senha?' })).toBeVisible();
    await page.getByLabel('E-mail').fill(MOCK_EMAIL);
    await page.getByTestId('forgot-submit').click();
    await expect(page.getByTestId('forgot-sent')).toBeVisible();
    await expect(page.getByTestId('forgot-resend')).toBeDisabled();

    expect(log.recover).toHaveLength(1);
    expect(log.recover[0].email).toBe(MOCK_EMAIL);
    expect(log.recover[0].redirectTo).toBe(`${BASE}/?fluxo=nova-senha`);

    // Clique no link do e-mail: o Auth devolve para o redirect com tokens no fragmento.
    await page.goto(recoveryCallbackUrl(BASE));
    await expect(page.getByTestId('update-password-form')).toBeVisible();
    // HashRouter: rota certa e nenhum token sobrando na barra de endereço.
    expect(page.url()).toBe(`${BASE}/#/update-password`);

    await page.getByLabel('Nova senha', { exact: true }).fill('Nova@Senha1');
    await expect(page.locator('[data-ok="true"]')).toHaveCount(4);
    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await expect(page.getByLabel('Nova senha', { exact: true })).toHaveAttribute('type', 'text');
    await page.getByLabel('Confirmar nova senha').fill('Nova@Senha1');
    await page.getByTestId('update-password-submit').click();

    await expect(page.getByTestId('recovery-success')).toBeVisible();
    expect(log.passwordUpdates).toEqual(['Nova@Senha1']);
    await expect.poll(() => page.url(), { timeout: 8000 }).not.toContain('update-password');

    expect([...log.hosts].some((h) => /promptdeelite/.test(h))).toBe(false);
  });

  test('link expirado → mensagem clara → pedir novo link', async ({ page }) => {
    await mockSupabaseAuth(page);
    await page.goto(expiredCallbackUrl(BASE));
    const box = page.getByTestId('recovery-invalid');
    await expect(box).toBeVisible();
    await expect(box).toHaveAttribute('data-reason', 'expired');
    await expect(page.getByRole('heading', { name: 'Este link expirou' })).toBeVisible();
    expect(page.url()).toBe(`${BASE}/#/update-password`);

    await page.getByTestId('recovery-request-new').click();
    await expect(page).toHaveURL(/#\/forgot-password$/);
    await expect(page.getByRole('heading', { name: 'Esqueceu sua senha?' })).toBeVisible();
  });

  test('abrir /update-password sem link mostra como pedir um', async ({ page }) => {
    await mockSupabaseAuth(page);
    await page.goto(`${BASE}/#/update-password`);
    await expect(page.getByTestId('recovery-invalid')).toHaveAttribute('data-reason', 'missing');
  });

  test('senhas diferentes não são enviadas', async ({ page }) => {
    const log = await mockSupabaseAuth(page);
    await page.goto(recoveryCallbackUrl(BASE));
    await page.getByLabel('Nova senha', { exact: true }).fill('Nova@Senha1');
    await page.getByLabel('Confirmar nova senha').fill('Nova@Senha9');
    await page.getByTestId('update-password-submit').click();
    await expect(page.getByText('As senhas não são iguais.')).toBeVisible();
    expect(log.passwordUpdates).toEqual([]);
  });
});
