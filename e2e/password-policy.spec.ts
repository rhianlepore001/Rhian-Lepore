/**
 * E2E — Política de senha simples (8 caracteres + 1 maiúscula) com indicador de força.
 * Supabase mockado: nenhuma conta real é criada e nenhum e-mail é enviado.
 *
 *   VITE_SUPABASE_URL=http://127.0.0.1:59999 VITE_SUPABASE_ANON_KEY=fake npx vite --port 3417
 *   E2E_BASE_URL=http://127.0.0.1:3417 npx playwright test e2e/password-policy.spec.ts --project=chromium-legacy
 */
import { test, expect } from '@playwright/test';
import { mockSupabaseAuth, recoveryCallbackUrl } from './helpers/mockSupabaseAuth';

const BASE = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

test.describe('política de senha', () => {
  test('cadastro do dono: indicador fraca → forte → muito forte e envia senha sem número/símbolo', async ({ page }) => {
    const log = await mockSupabaseAuth(page);
    await page.goto(`${BASE}/#/register?type=barber`);
    const strength = page.getByTestId('password-strength');
    await expect(strength).toHaveAttribute('data-level', 'empty');
    await expect(page.getByText('1 número e 1 símbolo')).toHaveCount(0);

    await page.getByLabel('Seu nome').fill('Rafael');
    await page.getByLabel('Nome do negócio').fill('Negócio Teste');
    await page.getByLabel('E-mail').fill('dono.e2e@exemplo.com');

    const pwd = page.getByLabel('Senha', { exact: true });
    await pwd.fill('rafael12');
    await expect(strength).toHaveAttribute('data-level', 'missing');
    await expect(strength).toContainText('Falta:');
    await pwd.fill('Rafaelzz');
    await expect(strength).toHaveAttribute('data-level', 'weak');
    await expect(page.getByTestId('password-strength-label')).toHaveText('Senha fraca');
    await pwd.fill('Rafaelz1');
    await expect(page.getByTestId('password-strength-label')).toHaveText('Senha forte');
    await pwd.fill('Rafael 2026 corte');
    await expect(page.getByTestId('password-strength-label')).toHaveText('Muito forte');

    await pwd.fill('Rafaelzz');
    await page.getByLabel('Confirmar senha').fill('Rafaelzz');
    await page.getByRole('button', { name: /finalizar cadastro/i }).click();
    await expect.poll(() => log.signups.length, { timeout: 10000 }).toBe(1);
    expect(log.signups[0]).toEqual({ email: 'dono.e2e@exemplo.com', password: 'Rafaelzz' });
  });

  test('cadastro: sem maiúscula não envia', async ({ page }) => {
    const log = await mockSupabaseAuth(page);
    await page.goto(`${BASE}/#/register?type=beauty`);
    await page.getByLabel('Seu nome').fill('Ana');
    await page.getByLabel('Nome do negócio').fill('Negócio Teste');
    await page.getByLabel('E-mail').fill('ana.e2e@exemplo.com');
    await page.getByLabel('Senha', { exact: true }).fill('semmaiuscula');
    await page.getByLabel('Confirmar senha').fill('semmaiuscula');
    await page.getByRole('button', { name: /finalizar cadastro/i }).click();
    await expect(page.getByRole('alert')).toContainText('A senha precisa de uma letra maiúscula.');
    expect(log.signups).toEqual([]);
  });

  test('nova senha (recuperação): aceita só o mínimo', async ({ page }) => {
    const log = await mockSupabaseAuth(page);
    await page.goto(recoveryCallbackUrl(BASE));
    await page.getByLabel('Nova senha', { exact: true }).fill('Barbearia');
    await expect(page.getByTestId('password-strength')).toHaveAttribute('data-level', 'weak');
    await page.getByLabel('Confirmar nova senha').fill('Barbearia');
    await page.getByTestId('update-password-submit').click();
    await expect(page.getByTestId('recovery-success')).toBeVisible();
    expect(log.passwordUpdates).toEqual(['Barbearia']);
  });
});
