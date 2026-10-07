/**
 * E2E — Bloqueio de agenda com 3 opções (none/own/all) + telas "depois".
 *
 *   E2E_OWNER_EMAIL=... E2E_OWNER_PASS=... \
 *     npx playwright test e2e/agenda-block-scope.spec.ts --project=chromium-legacy
 *
 * Prod SÓ LEITURA. GET passa (com a coluna nova injetada na resposta de
 * business_settings, porque a migration ainda não está em prod). Toda escrita é
 * stubada ou abortada — nada é gravado. "Colaborador" é simulado com o login do
 * dono de teste: as respostas de profiles/team_members são reescritas para
 * role=staff e o team_member "Bob Funcionario".
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import { BASE, login } from './helpers/agendixLogin';

const SHOTS = process.env.SHOTS_BLOCK_DIR || '/workspace/screens/block-perms/after';
const BIZ = '03254cc1-3f37-44f8-a31c-e4fdffd1304b';
const STAFF_TM = '0c9fd56b-1aac-422e-9057-3f8554da6076'; // Bob Funcionario
const READ_RPCS = new Set(['get_auth_company_id', 'get_auth_role', 'list_agenda_blocks', 'get_available_slots', 'get_available_slots_v2']);

type Scope = 'none' | 'own' | 'all';
interface Opts { scope: Scope; staff?: boolean; theme?: 'barber' | 'beauty' }
type Write = { method: string; path: string; body: unknown };

async function guard(page: Page, opts: Opts) {
  const writes: Write[] = [];
  /** Escritas/RPCs desconhecidas: abortadas (nunca chegam ao banco). Só informativo. */
  const blocked: string[] = [];
  const stubbed = new Set<string>();
  const fulfill = (route: Route, status: number, body: string) => {
    stubbed.add(route.request().method() + ' ' + route.request().url());
    return route.fulfill({ status, contentType: 'application/json', body });
  };
  await page.route(/\.supabase\.co\//, async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const m = req.method();
    if (m === 'OPTIONS' || url.pathname === '/auth/v1/token' || url.pathname.startsWith('/auth/v1/user')) return route.continue();
    if (m === 'GET' || m === 'HEAD') {
      const table = url.pathname.match(/^\/rest\/v1\/([^/?]+)/)?.[1];
      if (table === 'business_settings' || table === 'profiles' || (opts.staff && table === 'team_members' && url.searchParams.has('staff_user_id'))) {
        if (opts.staff && table === 'team_members') {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: STAFF_TM }) });
        }
        const res = await route.fetch();
        let json: unknown = await res.json().catch(() => null);
        const patchRow = (r: Record<string, unknown>) => {
          if (table === 'business_settings') return { ...r, staff_agenda_block_scope: opts.scope, staff_can_block_agenda: opts.scope !== 'none' };
          const out = { ...r };
          if (opts.theme && 'user_type' in out) out.user_type = opts.theme;
          if (opts.staff && url.searchParams.get('select') === '*') { out.role = 'staff'; out.company_id = BIZ; out.tutorial_completed = true; }
          return out;
        };
        if (Array.isArray(json)) json = json.map((r) => patchRow(r as Record<string, unknown>));
        else if (json && typeof json === 'object') json = patchRow(json as Record<string, unknown>);
        return route.fulfill({ response: res, body: JSON.stringify(json) });
      }
      return route.continue();
    }
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([^/?]+)/)?.[1];
    let body: unknown = null;
    try { body = req.postDataJSON(); } catch { body = req.postData(); }
    if (rpc && READ_RPCS.has(rpc)) return route.continue();
    if (rpc === 'list_company_pending_public_bookings') return fulfill(route, 200, '[]');
    if (rpc === 'relink_staff_if_unbound') return fulfill(route, 200, JSON.stringify(STAFF_TM));
    writes.push({ method: m, path: url.pathname, body });
    if (url.pathname === '/rest/v1/business_settings') return fulfill(route, 201, '');
    if (rpc === 'log_error' || rpc === 'track_event') return fulfill(route, 200, 'null');
    blocked.push(`${m} ${url.pathname}`);
    return route.abort('blockedbyclient');
  });
  // Nenhuma escrita pode terminar no servidor: requisição não-GET que terminou (requestfinished)
  // precisa ter sido stubada (fulfill). Abortadas disparam requestfailed, não entram aqui.
  const reached: string[] = [];
  page.on('requestfinished', (req) => {
    const url = new URL(req.url());
    if (!/\.supabase\.co$/.test(url.hostname)) return;
    const m = req.method();
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS' || url.pathname === '/auth/v1/token') return;
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([^/?]+)/)?.[1];
    if (rpc && READ_RPCS.has(rpc)) return;
    if (!stubbed.has(m + ' ' + req.url())) reached.push(`${m} ${url.pathname}`);
  });
  return { writes, blocked, leaked: reached };
}

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

async function prep(page: Page, mode: 'light' | 'dark', vp: { width: number; height: number }) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.setViewportSize(vp);
  await page.addInitScript((m) => localStorage.setItem('agendix_color_mode', m), mode);
}

async function openAgenda(page: Page) {
  await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
  await page.locator('#btn-new-appointment').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1200);
}

const VARIANTS = [
  { name: 'desktop-light-barber', mode: 'light', vp: { width: 1440, height: 900 }, theme: 'barber' },
  { name: 'desktop-dark-barber', mode: 'dark', vp: { width: 1440, height: 900 }, theme: 'barber' },
  { name: 'mobile-375-dark-barber', mode: 'dark', vp: { width: 375, height: 812 }, theme: 'barber' },
  { name: 'mobile-375-light-beauty', mode: 'light', vp: { width: 375, height: 812 }, theme: 'beauty' },
  { name: 'desktop-light-beauty', mode: 'light', vp: { width: 1440, height: 900 }, theme: 'beauty' },
] as const;

test.describe('Configurações › Equipe — card "Bloqueio de agenda" (3 opções)', () => {
  test.setTimeout(120_000);

  for (const v of VARIANTS) {
    test(`card com radios e salvar ${v.name}`, async ({ page }) => {
      await prep(page, v.mode, v.vp);
      const g = await guard(page, { scope: 'own', theme: v.theme });
      await login(page, 'owner');
      await page.goto(`${BASE}/#/configuracoes/equipe`, { waitUntil: 'domcontentloaded' });
      const group = page.getByRole('radiogroup', { name: 'Bloqueio de agenda' });
      await expect(group).toBeVisible({ timeout: 30_000 });
      await expect(group.getByText('Não podem bloquear')).toBeVisible();
      await expect(group.getByText('Podem bloquear a própria agenda')).toBeVisible();
      await expect(group.getByText('Podem bloquear todas')).toBeVisible();
      await expect(group.getByRole('radio', { name: /Podem bloquear a própria agenda/ })).toBeChecked();
      await expect(page.getByTestId('staff-block-scope-pending')).toHaveCount(0);
      await expect(page.getByRole('switch')).toHaveCount(0);

      const section = page.getByTestId('staff-edit-scope-section');
      await page.mouse.move(2, 2);
      if (v.vp.width < 768) {
        // Mobile: a página rola num container interno; foca o card novo inteiro na tela.
        await page.getByText('Bloqueio de agenda', { exact: true }).evaluate((el) => {
          el.scrollIntoView({ block: 'start' });
          let p: HTMLElement | null = el.parentElement;
          while (p && !(p.scrollHeight > p.clientHeight && /(auto|scroll)/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
          (p ?? document.scrollingElement)?.scrollBy(0, -170); // abaixo do cabeçalho/abas fixos
        });
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${SHOTS}/settings-bloqueio-3-opcoes-${v.name}.png` });
      } else {
        await section.scrollIntoViewIfNeeded();
        await page.waitForTimeout(600);
        await section.screenshot({ path: `${SHOTS}/settings-bloqueio-3-opcoes-${v.name}.png` });
      }

      await group.getByTestId('staff-block-scope-all').click();
      await expect(page.getByText('Permissão da equipe atualizada.')).toBeVisible({ timeout: 10_000 });
      await expect(group.getByRole('radio', { name: /Podem bloquear todas/ })).toBeChecked();
      const save = g.writes.filter((w) => w.path === '/rest/v1/business_settings');
      expect(save).toHaveLength(1);
      expect(save[0].body).toEqual({ user_id: BIZ, staff_agenda_block_scope: 'all' });
      if (v.name === 'desktop-light-barber' || v.name === 'mobile-375-light-beauty') {
        await page.waitForTimeout(300);
        await group.screenshot({ path: `${SHOTS}/settings-bloqueio-salvo-todas-${v.name}.png` });
      }
      expect(g.leaked, 'escrita vazou').toEqual([]);
    });
  }
});

test.describe('Agenda — formulário de bloqueio por permissão', () => {
  test.setTimeout(120_000);

  for (const v of [VARIANTS[0], VARIANTS[2], VARIANTS[3]]) {
    test(`dono: select de profissional ${v.name}`, async ({ page }) => {
      await prep(page, v.mode, v.vp);
      const g = await guard(page, { scope: 'none', theme: v.theme });
      await login(page, 'owner');
      await openAgenda(page);
      await page.locator('#btn-new-appointment').click();
      await page.getByTestId('agenda-choice-block').click();
      await expect(page.getByTestId('agenda-block-form')).toBeVisible({ timeout: 8_000 });
      await expect(page.getByTestId('agenda-block-professional')).toBeVisible();
      await page.mouse.move(2, 2);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SHOTS}/agenda-form-bloqueio-dono-${v.name}.png` });
      expect(g.leaked).toEqual([]);
    });

    test(`staff "todas": vê o select com todos, inclusive o dono ${v.name}`, async ({ page }) => {
      await prep(page, v.mode, v.vp);
      const g = await guard(page, { scope: 'all', staff: true, theme: v.theme });
      await login(page, 'owner');
      await openAgenda(page);
      await page.locator('#btn-new-appointment').click();
      await page.getByTestId('agenda-choice-block').click();
      await expect(page.getByTestId('agenda-block-form')).toBeVisible({ timeout: 8_000 });
      const select = page.getByTestId('agenda-block-professional');
      await expect(select).toBeVisible();
      await page.mouse.move(2, 2);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SHOTS}/agenda-form-bloqueio-staff-todas-${v.name}.png` });
      // Select nativo: as opções não ficam "visíveis" para o Playwright; confere a lista.
      const names = await select.locator('option').allTextContents();
      expect(names).toContain('Bob'); // dono
      expect(names).toContain('Marcos Silva');
      expect(names).toContain('Bob Funcionario'); // o próprio colaborador
      await expect(select).toHaveValue(STAFF_TM); // começa na própria coluna
      expect(g.leaked).toEqual([]);
    });

    test(`staff "própria agenda": sem select (vai a própria coluna) ${v.name}`, async ({ page }) => {
      await prep(page, v.mode, v.vp);
      const g = await guard(page, { scope: 'own', staff: true, theme: v.theme });
      await login(page, 'owner');
      await openAgenda(page);
      await page.locator('#btn-new-appointment').click();
      await page.getByTestId('agenda-choice-block').click();
      await expect(page.getByTestId('agenda-block-form')).toBeVisible({ timeout: 8_000 });
      await expect(page.getByTestId('agenda-block-professional')).toHaveCount(0);
      await page.mouse.move(2, 2);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SHOTS}/agenda-form-bloqueio-staff-propria-${v.name}.png` });
      expect(g.leaked).toEqual([]);
    });
  }

  test('staff "não podem": + abre direto o novo atendimento (sem "Bloquear agenda")', async ({ page }) => {
    await prep(page, 'light', { width: 1440, height: 900 });
    const g = await guard(page, { scope: 'none', staff: true });
    await login(page, 'owner');
    await openAgenda(page);
    await page.locator('#btn-new-appointment').click();
    await page.waitForTimeout(1200);
    await expect(page.getByTestId('agenda-choice-block')).toHaveCount(0);
    expect(g.leaked).toEqual([]);
  });
});
