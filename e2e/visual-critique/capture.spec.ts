/**
 * Captura PNGs para crítica visual (desktop 1280×800 + mobile 390×844).
 *
 *   npm run visual:critique
 *
 * Credenciais e slugs só via env / storageState — nunca hardcoded.
 */
import { test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
loadEnv({ path: path.join(ROOT, '.env'), quiet: true });
loadEnv({ path: path.join(ROOT, '.env.local'), quiet: true });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.join(ROOT, 'artifacts/visual-critique');
const TEMPLATE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'CRITIQUE.template.md');

const DEMO_SLUG = (process.env.DEMO_SLUG || process.env.E2E_BOOK_SLUG || process.env.BOOK_SLUG || '').trim();

const DEMO_EMAIL = (
  process.env.DEMO_EMAIL ||
  process.env.E2E_OWNER_EMAIL ||
  process.env.AGENDIX_TEST_EMAIL ||
  ''
).trim();
const DEMO_PASSWORD = (
  process.env.DEMO_PASSWORD ||
  process.env.E2E_OWNER_PASS ||
  process.env.AGENDIX_TEST_PASSWORD ||
  ''
).trim();

type ViewportKind = 'desktop' | 'mobile';

type ShotRecord = {
  name: string;
  viewport: ViewportKind;
  status: 'captured' | 'skipped';
  path?: string;
  hash?: string;
  reason?: string;
  redirectedTo?: string;
  hasFatal?: boolean;
};

type ClaimHit = {
  surface: string;
  viewport: ViewportKind;
  line: string;
};

type Manifest = {
  generatedAt: string;
  baseURL: string;
  auth: { mode: 'storageState' | 'credentials' | 'none'; storageStateConfigured: boolean };
  demoSlugConfigured: boolean;
  shots: ShotRecord[];
  skipped: ShotRecord[];
};

const AUTH_ROUTES: { name: string; hash: string }[] = [
  { name: 'agenda', hash: '/#/agenda' },
  { name: 'crm', hash: '/#/clientes' },
  { name: 'financeiro', hash: '/#/financeiro' },
  { name: 'clube', hash: '/#/configuracoes/clube' },
  { name: 'fila', hash: '/#/fila' },
];

const CLAIM_RE =
  /(\d+\s*dias?|gr[aá]tis|trial|teste gr[aá]tis|ilimitad|intelig[eê]ncia|\bIA\b|powered by|em breve|coming soon|agenda|fila|crm|financeiro|clube|assinatura)/i;

function storageStatePath(): string | null {
  const candidates = [
    process.env.PLAYWRIGHT_STORAGE_STATE,
    process.env.VISUAL_CRITIQUE_STORAGE_STATE,
  ].filter((value): value is string => Boolean(value && value.trim()));
  for (const candidate of candidates) {
    const resolved = path.resolve(ROOT, candidate);
    if (fs.existsSync(resolved)) return resolved;
  }
  return null;
}

function ensureOutDirs(): void {
  fs.mkdirSync(path.join(OUT_DIR, 'desktop'), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'mobile'), { recursive: true });
}

function seedCritiqueDoc(): void {
  const dest = path.join(OUT_DIR, 'CRITIQUE.md');
  if (!fs.existsSync(dest) && fs.existsSync(TEMPLATE)) {
    fs.copyFileSync(TEMPLATE, dest);
  }
}

function loadManifest(): Manifest {
  const file = path.join(OUT_DIR, 'MANIFEST.json');
  if (!fs.existsSync(file)) {
    return {
      generatedAt: new Date().toISOString(),
      baseURL: BASE,
      auth: { mode: 'none', storageStateConfigured: false },
      demoSlugConfigured: Boolean(DEMO_SLUG),
      shots: [],
      skipped: [],
    };
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Manifest;
}

function saveManifest(manifest: Manifest): void {
  manifest.generatedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT_DIR, 'MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

function upsertShot(manifest: Manifest, shot: ShotRecord): void {
  const key = `${shot.name}:${shot.viewport}`;
  const list = shot.status === 'skipped' ? manifest.skipped : manifest.shots;
  const other = shot.status === 'skipped' ? manifest.shots : manifest.skipped;
  const otherIdx = other.findIndex((item) => `${item.name}:${item.viewport}` === key);
  if (otherIdx >= 0) other.splice(otherIdx, 1);
  const idx = list.findIndex((item) => `${item.name}:${item.viewport}` === key);
  if (idx >= 0) list[idx] = shot;
  else list.push(shot);
}

function writeSkippedDoc(manifest: Manifest): void {
  const lines = [
    '# Telas puladas na captura visual',
    '',
    'Gerado por `npm run visual:critique`. Não contém senhas.',
    '',
  ];
  const skipped = manifest.skipped;
  if (skipped.length === 0) {
    lines.push('Nenhuma rota ficou de fora neste run.');
  } else {
    lines.push('| Superfície | Viewport | Motivo |');
    lines.push('|---|---|---|');
    for (const item of skipped) {
      lines.push(`| ${item.name} | ${item.viewport} | ${item.reason ?? ''} |`);
    }
    lines.push('');
    lines.push('Para capturar o produto autenticado:');
    lines.push('');
    lines.push('1. Defina `PLAYWRIGHT_STORAGE_STATE` apontando para um JSON de `storageState`, ou');
    lines.push('2. Defina `DEMO_EMAIL`/`DEMO_PASSWORD` (ou `E2E_OWNER_EMAIL`/`E2E_OWNER_PASS`) no `.env.local`.');
    lines.push('3. Booking público: `DEMO_SLUG=seu-slug npm run visual:critique`.');
  }
  lines.push('');
  fs.writeFileSync(path.join(OUT_DIR, 'SKIPPED.md'), `${lines.join('\n')}\n`);
}

function loadClaims(): ClaimHit[] {
  const file = path.join(OUT_DIR, 'claims.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')) as ClaimHit[];
}

function saveClaims(claims: ClaimHit[]): void {
  fs.writeFileSync(path.join(OUT_DIR, 'claims.json'), `${JSON.stringify(claims, null, 2)}\n`);
}

function hashOf(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hash || '';
  } catch {
    return '';
  }
}

async function waitUntilNotLoading(page: Page): Promise<void> {
  const loc = page.getByText(/preparando os horários|preparando tudo para você/i);
  await loc.first().waitFor({ timeout: 4000 }).catch(() => undefined);
  if ((await loc.count()) > 0) {
    await loc.first().waitFor({ state: 'hidden', timeout: 25000 }).catch(() => undefined);
  }
  await page.waitForTimeout(500);
}

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  try {
    await page.waitForLoadState('networkidle', { timeout: 8000 });
  } catch {
    // SPAs com realtime/poll raramente ficam idle.
  }
  await page.addStyleTag({
    content: '*, *::before, *::after { animation: none !important; transition: none !important; }',
  }).catch(() => undefined);
  await page.waitForTimeout(800);
}

async function preparePage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      void navigator.serviceWorker?.getRegistrations?.().then((regs) => {
        regs.forEach((reg) => {
          void reg.unregister();
        });
      });
    } catch {
      // ignore
    }
  });
}

async function hasFatal(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const text = document.body?.innerText?.toLowerCase() ?? '';
    return (
      text.includes('uncaught') ||
      text.includes('application error') ||
      text.includes('something went wrong') ||
      text.includes('chunkloaderror')
    );
  });
}

async function extractClaims(page: Page, surface: string, viewport: ViewportKind): Promise<ClaimHit[]> {
  const text = await page.evaluate(() => document.body?.innerText ?? '');
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.length < 180 && CLAIM_RE.test(line))
    .slice(0, 40)
    .map((line) => ({ surface, viewport, line }));
}

async function shot(
  page: Page,
  name: string,
  viewport: ViewportKind,
): Promise<{ filePath: string; hasFatal: boolean; hash: string }> {
  const dir = path.join(OUT_DIR, viewport);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return { filePath, hasFatal: await hasFatal(page), hash: hashOf(page.url()) };
}

async function gotoHash(page: Page, hashPath: string): Promise<void> {
  const url = hashPath.startsWith('http') ? hashPath : `${BASE}${hashPath.startsWith('/') ? hashPath : `/${hashPath}`}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await settle(page);
  await waitUntilNotLoading(page);
}

async function looksLikeLogin(page: Page): Promise<boolean> {
  const hash = hashOf(page.url());
  if (/#\/login\b/.test(hash)) return true;
  const gateway = page.locator('[data-testid="category-barber"]');
  return (await gateway.count()) > 0;
}

async function looksLikeDashboard(page: Page): Promise<boolean> {
  const hello = page.getByText(/Olá,/i).first();
  return hello.isVisible().catch(() => false);
}

async function openLoginForm(page: Page): Promise<void> {
  await gotoHash(page, '/#/login');
  const category = page.locator('[data-testid="category-barber"]');
  if (await category.count()) {
    await category.click();
    await page.waitForTimeout(400);
  } else {
    const entrar = page.getByText(/entrar/i).first();
    if (await entrar.isVisible().catch(() => false)) {
      await entrar.click();
      await page.waitForTimeout(400);
    }
  }
  await page.locator('input[type="email"]').waitFor({ timeout: 20000 });
}

async function loginWithCredentials(page: Page): Promise<void> {
  await openLoginForm(page);
  await page.locator('input[type="email"]').fill(DEMO_EMAIL);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  const submit = page.locator('button[type="submit"]');
  if (await submit.count()) {
    await submit.click();
  } else {
    await page.getByRole('button', { name: /entrar/i }).click();
  }
  await page.waitForFunction(
    () => {
      const hash = window.location.hash || '';
      return hash !== '' && !hash.includes('/login');
    },
    { timeout: 35000 },
  );
  await settle(page);
}

async function newContext(
  browser: Browser,
  viewport: { width: number; height: number },
  userAgent: string | undefined,
  state?: string,
): Promise<BrowserContext> {
  return browser.newContext({
    viewport,
    userAgent,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    storageState: state,
  });
}

test('captura matriz visual', async ({ browser, viewport }, testInfo) => {
  ensureOutDirs();
  seedCritiqueDoc();

  const vp = viewport ?? { width: 1280, height: 800 };
  const kind: ViewportKind = vp.width <= 500 ? 'mobile' : 'desktop';
  const userAgent =
    kind === 'mobile'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      : undefined;

  const authFile = storageStatePath();
  const authMode: Manifest['auth']['mode'] = authFile ? 'storageState' : DEMO_EMAIL && DEMO_PASSWORD ? 'credentials' : 'none';

  const manifest = loadManifest();
  manifest.baseURL = BASE;
  manifest.auth = { mode: authMode, storageStateConfigured: Boolean(authFile) };
  manifest.demoSlugConfigured = Boolean(DEMO_SLUG);

  const claims = loadClaims().filter((hit) => hit.viewport !== kind);

  const publicCtx = await newContext(browser, vp, userAgent);
  const page = await publicCtx.newPage();
  await preparePage(page);

  const record = (shotRec: ShotRecord) => {
    upsertShot(manifest, shotRec);
    const rel = shotRec.path ? path.relative(ROOT, shotRec.path) : '';
    const flag = shotRec.status === 'captured' ? 'SHOT' : 'SKIP';
    // eslint-disable-next-line no-console
    console.log(`[${flag}] ${kind}/${shotRec.name}${rel ? ` → ${rel}` : ''} ${shotRec.reason ?? ''}`);
  };

  // --- Login / gateway ---
  await gotoHash(page, '/#/login');
  const gatewayReady = page.locator('[data-testid="category-barber"]');
  await gatewayReady.waitFor({ timeout: 20000 });
  const gatewayShot = await shot(page, 'login-gateway', kind);
  record({
    name: 'login-gateway',
    viewport: kind,
    status: 'captured',
    path: gatewayShot.filePath,
    hash: gatewayShot.hash,
    hasFatal: gatewayShot.hasFatal,
  });
  claims.push(...(await extractClaims(page, 'login-gateway', kind)));

  // --- Login form (não preenche senha neste PNG) ---
  await openLoginForm(page);
  const formShot = await shot(page, 'login-form', kind);
  record({
    name: 'login-form',
    viewport: kind,
    status: 'captured',
    path: formShot.filePath,
    hash: formShot.hash,
    hasFatal: formShot.hasFatal,
  });
  claims.push(...(await extractClaims(page, 'login-form', kind)));

  // --- Landing `/` (pula se for só redirect para login/dashboard) ---
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  let landingIsRedirect = await looksLikeLogin(page);
  if (!landingIsRedirect) {
    await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    landingIsRedirect = (await looksLikeLogin(page)) || (await looksLikeDashboard(page));
  }
  if (landingIsRedirect) {
    const reason = (await looksLikeDashboard(page))
      ? 'root autenticado é o Dashboard, não landing de marketing'
      : 'redirect-only para /#/login — landing de marketing ainda não existe';
    record({ name: 'landing', viewport: kind, status: 'skipped', reason, hash: hashOf(page.url()) });
  } else {
    const landingShot = await shot(page, 'landing', kind);
    record({
      name: 'landing',
      viewport: kind,
      status: 'captured',
      path: landingShot.filePath,
      hash: landingShot.hash,
      hasFatal: landingShot.hasFatal,
    });
    claims.push(...(await extractClaims(page, 'landing', kind)));
  }

  // --- Book público ---
  if (!DEMO_SLUG) {
    record({
      name: 'book',
      viewport: kind,
      status: 'skipped',
      reason: 'DEMO_SLUG / E2E_BOOK_SLUG não definido',
    });
  } else {
    await gotoHash(page, `/#/book/${encodeURIComponent(DEMO_SLUG)}`);
    const bookShot = await shot(page, 'book', kind);
    record({
      name: 'book',
      viewport: kind,
      status: 'captured',
      path: bookShot.filePath,
      hash: bookShot.hash,
      hasFatal: bookShot.hasFatal,
    });
    claims.push(...(await extractClaims(page, 'book', kind)));
  }

  await publicCtx.close();

  // --- Produto autenticado ---
  if (authMode === 'none') {
    for (const route of AUTH_ROUTES) {
      record({
        name: route.name,
        viewport: kind,
        status: 'skipped',
        reason: 'sem storageState nem DEMO/E2E credentials — placeholder',
      });
    }
  } else {
    const authCtx = await newContext(browser, vp, userAgent, authFile ?? undefined);
    const authPage = await authCtx.newPage();
    await preparePage(authPage);
    let authed = Boolean(authFile);
    try {
      if (authMode === 'credentials') {
        await loginWithCredentials(authPage);
        authed = !(await looksLikeLogin(authPage));
      } else {
        await gotoHash(authPage, '/#/agenda');
        authed = !(await looksLikeLogin(authPage));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'login falhou';
      for (const route of AUTH_ROUTES) {
        record({
          name: route.name,
          viewport: kind,
          status: 'skipped',
          reason: `sessão não estabelecida (${message.slice(0, 160)})`,
        });
      }
      authed = false;
    }

    if (authed) {
      for (const route of AUTH_ROUTES) {
        await gotoHash(authPage, route.hash);
        const currentHash = hashOf(authPage.url());
        if (await looksLikeLogin(authPage)) {
          record({
            name: route.name,
            viewport: kind,
            status: 'skipped',
            reason: 'sessão expirou ou redirecionou para login',
            redirectedTo: currentHash,
          });
          continue;
        }
        const captured = await shot(authPage, route.name, kind);
        const redirected =
          currentHash && !currentHash.replace(/^#/, '').startsWith(route.hash.replace(/^\/#/, ''));
        record({
          name: route.name,
          viewport: kind,
          status: 'captured',
          path: captured.filePath,
          hash: captured.hash,
          hasFatal: captured.hasFatal,
          redirectedTo: redirected ? currentHash : undefined,
          reason: redirected ? `navegou para ${currentHash} (onboarding/guard?)` : undefined,
        });
        claims.push(...(await extractClaims(authPage, route.name, kind)));
      }
    } else {
      const already = AUTH_ROUTES.every((route) =>
        manifest.skipped.some((item) => item.name === route.name && item.viewport === kind),
      );
      if (!already) {
        for (const route of AUTH_ROUTES) {
          record({
            name: route.name,
            viewport: kind,
            status: 'skipped',
            reason: 'storageState/credenciais não chegaram numa sessão logada',
          });
        }
      }
    }
    await authCtx.close();
  }

  saveClaims(claims);
  saveManifest(manifest);
  writeSkippedDoc(manifest);

  const capturedHere = manifest.shots.filter((item) => item.viewport === kind);
  if (capturedHere.length === 0) {
    throw new Error(`Nenhum PNG gerado para ${kind} (${testInfo.project.name}). Verifique se a app sobe em ${BASE}.`);
  }
});
