import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { buildApp, startPublishServer, type PublishServer } from './helpers/publishServer';

/**
 * Duas publicações de verdade: build A é servido, o app abre; build B é publicado;
 * o aviso aparece (sem recarregar sozinho) e, ao tocar em "Atualizar", o app passa para o B.
 */
test.describe.configure({ mode: 'serial' });

let dirA = '';
let dirB = '';
let server: PublishServer;

test.beforeAll(async () => {
  test.setTimeout(240_000);
  dirA = buildApp('build-A', 'a');
  dirB = buildApp('build-B', 'b');
});

test.beforeEach(async ({ page }) => {
  server = await startPublishServer(dirA);
  await page.route('https://example.supabase.co/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.route(/images\.unsplash\.com|connect\.facebook\.net/, (route) => route.abort());
});

test.afterEach(async () => {
  await server?.close();
});

// Tolera a troca de página no meio da leitura (durante o recarregamento).
const runningBuild = (page: Page) =>
  page.evaluate(() => document.documentElement.dataset.appBuild).catch(() => null);
const prompt = (page: Page) => page.getByRole('status').filter({ hasText: 'Nova versão disponível' });

async function openAppUnderServiceWorker(page: Page) {
  await page.goto(`${server.origin}/#/login`);
  await expect.poll(() => runningBuild(page)).toBe('build-A');
  // Service Worker instalado e controlando a página (clientsClaim).
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, { timeout: 30_000 });
  await expect(prompt(page)).toHaveCount(0);
}

/** Espera passar o intervalo mínimo entre checagens e simula "voltou para a frente". */
async function backToForeground(page: Page) {
  await page.waitForTimeout(3_300);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
}

test('publicação nova: avisa sem recarregar sozinho e, ao tocar em Atualizar, vai para a versão nova', async ({ page }) => {
  await openAppUnderServiceWorker(page);

  // O usuário está preenchendo um formulário quando a publicação sai.
  await page.getByRole('button', { name: 'Acessar painel para barbearias' }).click();
  await page.getByLabel(/e-?mail/i).first().fill('cliente@exemplo.com');
  await page.evaluate(() => { (window as unknown as { __mesmaPagina: number }).__mesmaPagina = 1; });
  let navigations = 0;
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations += 1; });

  server.publish(dirB);
  await backToForeground(page);

  await expect(prompt(page)).toBeVisible({ timeout: 20_000 });
  await expect(prompt(page)).toContainText('Termine e salve o que está preenchendo');
  // Ainda na versão antiga, mesma página, formulário intacto: o aviso nunca recarrega sozinho.
  await page.waitForTimeout(1_500);
  expect(await runningBuild(page)).toBe('build-A');
  expect(await page.evaluate(() => (window as unknown as { __mesmaPagina?: number }).__mesmaPagina)).toBe(1);
  await expect(page.getByLabel(/e-?mail/i).first()).toHaveValue('cliente@exemplo.com');
  expect(navigations).toBe(0);

  await page.getByRole('button', { name: 'Atualizar' }).click();

  await expect.poll(() => runningBuild(page), { timeout: 20_000 }).toBe('build-B');
  await expect(prompt(page)).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __mesmaPagina?: number }).__mesmaPagina)).toBeUndefined();
  // Sem loop de recarregamento: uma navegação só e nenhum aviso novo.
  const afterApply = navigations;
  await page.waitForTimeout(4_000);
  expect(navigations).toBe(afterApply);
  expect(afterApply).toBe(1);
  await expect(prompt(page)).toHaveCount(0);
  // O worker novo assumiu o controle e não sobrou nenhum em espera.
  expect(await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return { waiting: Boolean(reg?.waiting), controlled: Boolean(navigator.serviceWorker.controller) };
  })).toEqual({ waiting: false, controlled: true });
  // O que está em cache é o build B (offline-first continua funcionando).
  const version = await page.evaluate(async () => (await (await fetch('/version.json', { cache: 'no-store' })).json()).version);
  expect(version).toBe('build-B');
});

test('Service Worker travado: o /version.json avisa e Atualizar limpa os caches e recarrega', async ({ page }) => {
  await openAppUnderServiceWorker(page);

  // Publica o B, mas o sw.js continua sendo o antigo (SW "travado" / sem atualização).
  server.publish(dirB, dirA);
  await backToForeground(page);

  await expect(prompt(page)).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))).toBe(false);
  expect(await runningBuild(page)).toBe('build-A');
  const cachesBefore = await page.evaluate(async () => (await caches.keys()).length);
  expect(cachesBefore).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Atualizar' }).click();
  await expect.poll(() => runningBuild(page), { timeout: 20_000 }).toBe('build-B');
  await expect(prompt(page)).toHaveCount(0);
  await page.waitForTimeout(2_000);
  await expect(prompt(page)).toHaveCount(0);
});

test('"Agora não" esconde o aviso sem atualizar', async ({ page }) => {
  await openAppUnderServiceWorker(page);
  server.publish(dirB);
  await backToForeground(page);
  await expect(prompt(page)).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Agora não' }).click();
  await expect(prompt(page)).toHaveCount(0);
  expect(await runningBuild(page)).toBe('build-A');
});

/**
 * Transição: aparelhos que ainda rodam a versão ANTIGA do app (Service Worker que se ativa sozinho
 * e página sem o aviso). A versão nova não pode ficar "esperando" para sempre nesses aparelhos.
 * Por padrão usa um app antigo sintético; com LEGACY_BUILD_DIR usa um build real antigo.
 */
test('aparelho com versão antiga: o worker novo assume sozinho (não fica esperando)', async ({ page }) => {
  let legacyDir = process.env.LEGACY_BUILD_DIR ?? '';
  if (!legacyDir) {
    legacyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agendix-legacy-'));
    fs.writeFileSync(
      path.join(legacyDir, 'index.html'),
      '<!doctype html><title>antigo</title><script>navigator.serviceWorker.register("/sw.js")</script>',
    );
    fs.writeFileSync(
      path.join(legacyDir, 'sw.js'),
      'self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",(e)=>e.waitUntil(self.clients.claim()));',
    );
  }
  server.publish(legacyDir);
  await page.goto(`${server.origin}/`);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, { timeout: 30_000 });

  // Publicação nova (com o aviso). O aparelho antigo só descobre quando o navegador busca o sw.js.
  server.publish(dirB);
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });

  await expect.poll(
    () => page.evaluate(async () => (await caches.keys()).some((k) => k.includes('precache'))).catch(() => false),
    { timeout: 30_000 },
  ).toBe(true);
  await page.waitForTimeout(3_000);
  const state = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return { waiting: Boolean(reg?.waiting), installing: Boolean(reg?.installing), active: reg?.active?.state };
  }).catch(() => null);
  expect(state).toEqual({ waiting: false, installing: false, active: 'activated' });

  // Na próxima abertura do app o aparelho já entra na versão nova (e dali em diante tem o aviso).
  await page.reload();
  await expect.poll(() => runningBuild(page), { timeout: 20_000 }).toBe('build-B');
});
