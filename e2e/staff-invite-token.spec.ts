/**
 * Convite com token: fluxo Equipe → cadastro → link inválido, sem escrever em prod.
 * RPCs novas (ainda inexistentes em prod) são simuladas. Qualquer escrita HTTP
 * ao banco é bloqueada.
 *
 *   npx playwright test e2e/staff-invite-token.spec.ts --project=chromium-mobile
 */
import { test, expect, type Page, type Route, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || 'Bob.teste@gmail.com';
const OWNER_PASS = process.env.E2E_OWNER_PASS || 'BobTeste@123';
const ARTIFACTS = process.env.INVITE_SHOTS_DIR || '/workspace/artifacts/invite-token-20261116';
const TOKEN = 'ab'.repeat(32);
const COMPANY = '03254cc1-3f37-44f8-a31c-e4fdffd1304b';
const MEMBER = '8c00405e-0000-4000-8000-000000000002';

function isWrite(method: string) {
  return method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE';
}

function rpcName(url: string, post: string | null): string {
  const m = url.match(/\/rpc\/([a-z0-9_]+)/i);
  if (m) return m[1];
  if (post) {
    try {
      const j = JSON.parse(post);
      if (typeof j === 'string') return '';
    } catch { /* ignore */ }
  }
  return '';
}

type GuardState = { validInvite: boolean; userType: 'barber' | 'beauty' };

async function installGuards(page: Page, opts: GuardState) {
  await page.route('**/*', async (route: Route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();
    const post = req.postData();
    const valid = opts.validInvite !== false;
    const userType = opts.userType ?? 'barber';

    if (url.includes('/rest/v1/rpc/')) {
      const name = rpcName(url, post);
      if (name === 'get_or_create_staff_invite' || name === 'rotate_staff_invite') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(name === 'rotate_staff_invite' ? 'cd'.repeat(32) : TOKEN) });
      }
      if (name === 'get_team_member_for_invite') {
        let args: { p_invite_token?: string } = {};
        try { args = post ? JSON.parse(post) : {}; } catch { /* ignore */ }
        if (!valid || !args.p_invite_token || !/^[0-9a-f]{64}$/.test(args.p_invite_token)) {
          return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        }
        const row = {
          id: MEMBER,
          name: userType === 'beauty' ? 'Ana Souza' : 'João Silva',
          role: userType === 'beauty' ? 'Cabeleireira' : 'Barbeiro',
          staff_user_id: null,
          business_name: userType === 'beauty' ? 'Studio Aurora' : 'Barbearia Corte Fino',
          user_type: userType,
        };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([row]) });
      }
      // other RPCs: block writes, allow reads
      if (isWrite(method) && !/^(get_|list_|fetch_|check_|ensure_|save_signup_attribution)/.test(name)) {
        // allow login-adjacent reads; block mutating RPCs
        if (/^(insert|update|delete|create|complete|claim|upsert|rotate|purge|release|accept|sign)/.test(name)) {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(null) });
        }
      }
      return route.continue();
    }

    if (url.includes('/rest/v1/') && isWrite(method) && !url.includes('/rpc/')) {
      return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    }
    return route.continue();
  });
}

async function loginOwner(page: Page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'load' });
  const entrar = page.getByText('ENTRAR').first();
  await entrar.waitFor({ timeout: 20_000 });
  await page.waitForTimeout(400);
  await entrar.click();
  await page.locator('input[type="email"]').waitFor({ timeout: 20_000 });
  await page.locator('input[type="email"]').fill(OWNER_EMAIL);
  await page.locator('input[type="password"]').fill(OWNER_PASS);
  await page.locator('button[type="submit"]').click({ timeout: 5_000 });
  await page.getByText(/Olá,/i).first().waitFor({ timeout: 45_000 });
}

async function setTheme(page: Page, theme: 'barber' | 'beauty', mode: 'dark' | 'light') {
  await page.evaluate(({ theme, mode }) => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-mode', mode);
  }, { theme, mode });
  await page.waitForTimeout(200);
}

test.describe('Convite com token — Equipe, cadastro e link inválido', () => {
  test.setTimeout(180_000);

  test('390: Equipe (barbearia escuro e salão claro) + cadastro + link inválido', async ({ page, browser }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await installGuards(page, { validInvite: true, userType: 'barber' });
    await loginOwner(page);

    await page.goto(`${BASE}/#/configuracoes/equipe`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Equipe', exact: true })).toBeVisible({ timeout: 20_000 });

    const resend = page.getByRole('button', { name: /Reenviar convite/i }).first();
    await expect(resend).toBeVisible({ timeout: 20_000 });
    const pending = page.getByTestId('invite-pending').first();
    await expect(pending).toContainText('Ainda sem acesso');
    await resend.click();

    // Abre o formulário do pendente (não o dono) e entra no modal "Convite pronto".
    const editDialog = page.getByRole('dialog').filter({ hasText: /Editar profissional/i });
    await expect(editDialog).toBeVisible({ timeout: 15_000 });
    const abrir = editDialog.getByRole('button', { name: /Abrir convite/i });
    await abrir.scrollIntoViewIfNeeded();
    await expect(abrir).toBeVisible({ timeout: 10_000 });
    await abrir.click();
    const inviteModal = page.getByRole('dialog').filter({ hasText: /Convite pronto/i });
    await expect(inviteModal).toBeVisible({ timeout: 20_000 });
    await expect(inviteModal.getByTestId('invite-regenerate')).toBeVisible();
    const inviteUrl = (await inviteModal.getByTestId('invite-link').innerText()).trim();
    expect(inviteUrl).toMatch(/\/#\/register\?company=[0-9a-f-]+&member=[0-9a-f-]+&invite=[0-9a-f]{64}/i);
    await expect(inviteModal.getByText(/Vale por 30 dias/i)).toBeVisible();

    await setTheme(page, 'barber', 'dark');
    await page.screenshot({ path: path.join(ARTIFACTS, 'equipe-convite-barber-dark-390.png') });

    await setTheme(page, 'beauty', 'light');
    await page.screenshot({ path: path.join(ARTIFACTS, 'equipe-convite-beauty-light-390.png') });

    // Cadastro e link inválido em contextos novos (sem autofill do login do dono).
    async function openPublic(userType: 'barber' | 'beauty') {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        locale: 'pt-BR',
        timezoneId: 'Europe/Lisbon',
      });
      const staff = await ctx.newPage();
      const guard: GuardState = { validInvite: true, userType };
      await installGuards(staff, guard);
      await staff.goto(`${BASE}/#/register?company=${COMPANY}&member=${MEMBER}&invite=${TOKEN}`, { waitUntil: 'domcontentloaded' });
      await expect(staff.getByTestId('staff-name-locked')).toBeVisible({ timeout: 15_000 });
      await expect(staff.getByTestId('staff-name-locked')).toContainText(userType === 'beauty' ? 'Ana Souza' : 'João Silva');
      await expect(staff.getByText(userType === 'beauty' ? /Studio Aurora/i : /Barbearia Corte Fino/i)).toBeVisible();
      return { ctx, staff, guard };
    }

    async function snapTheme(staff: Page, theme: 'barber' | 'beauty', mode: 'dark' | 'light', file: string) {
      await setTheme(staff, theme, mode);
      // A tela de cadastro força modo escuro no mount; reaplica antes do print.
      await setTheme(staff, theme, mode);
      await staff.screenshot({ path: path.join(ARTIFACTS, file) });
    }

    const beauty = await openPublic('beauty');
    await snapTheme(beauty.staff, 'beauty', 'light', 'cadastro-convite-beauty-light-390.png');
    await beauty.staff.goto(`${BASE}/#/register?company=${COMPANY}&member=${MEMBER}`, { waitUntil: 'domcontentloaded' });
    await expect(beauty.staff.getByTestId('invite-stale')).toBeVisible({ timeout: 15_000 });
    await expect(beauty.staff.getByText('Este convite foi atualizado. Peça ao gestor um novo link.')).toBeVisible();
    await expect(beauty.staff.getByRole('button', { name: /criar minha conta/i })).toHaveCount(0);
    await snapTheme(beauty.staff, 'beauty', 'light', 'link-invalido-beauty-light-390.png');
    await beauty.ctx.close();

    const barber = await openPublic('barber');
    await snapTheme(barber.staff, 'barber', 'dark', 'cadastro-convite-barber-dark-390.png');
    await barber.staff.goto(`${BASE}/#/register?company=${COMPANY}&member=${MEMBER}`, { waitUntil: 'domcontentloaded' });
    await expect(barber.staff.getByTestId('invite-stale')).toBeVisible({ timeout: 15_000 });
    await expect(barber.staff.getByText('Este convite foi atualizado. Peça ao gestor um novo link.')).toBeVisible();
    await expect(barber.staff.getByRole('button', { name: /criar minha conta/i })).toHaveCount(0);
    await snapTheme(barber.staff, 'barber', 'dark', 'link-invalido-barber-dark-390.png');
    await barber.ctx.close();
  });
});
