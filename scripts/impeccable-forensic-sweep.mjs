/**
 * Varredura forense Impeccable + Playwright (AgendiX).
 * Captura screenshots BEFORE/AFTER e detecta overflow, alvos <44px, jargão, hardcodes.
 *
 * Uso:
 *   node --env-file=.env.local scripts/impeccable-forensic-sweep.mjs [before|after] [baseUrl]
 */
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const phase = (process.argv[2] || 'before').toLowerCase();
const BASE =
  process.argv[3] ||
  process.env.E2E_BASE_URL ||
  'https://rhian-lepore.vercel.app';

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || process.env.AGENDIX_TEST_EMAIL;
const OWNER_PASS = process.env.E2E_OWNER_PASS || process.env.AGENDIX_TEST_PASSWORD;
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL;
const STAFF_PASS = process.env.E2E_STAFF_PASS;

const OUT_ROOT = path.resolve('/opt/cursor/artifacts/impeccable-sweep');
const SHOT_DIR = path.join(OUT_ROOT, phase === 'after' ? 'AFTER' : 'BEFORE');
const REPORT_PATH = path.join(OUT_ROOT, 'reports', `${phase}-forensics.json`);

fs.mkdirSync(SHOT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });

const OWNER_ROUTES = [
  { name: 'dashboard', path: '#/dashboard' },
  { name: 'agenda', path: '#/agenda' },
  { name: 'fila', path: '#/fila' },
  { name: 'clientes', path: '#/clientes' },
  { name: 'produtos', path: '#/produtos' },
  { name: 'financeiro', path: '#/financeiro' },
  { name: 'insights', path: '#/insights' },
  { name: 'cfg-geral', path: '#/configuracoes/geral' },
  { name: 'cfg-agendamento', path: '#/configuracoes/agendamento' },
  { name: 'cfg-equipe', path: '#/configuracoes/equipe' },
  { name: 'cfg-servicos', path: '#/configuracoes/servicos' },
  { name: 'cfg-comissoes', path: '#/configuracoes/comissoes' },
  { name: 'cfg-assinatura', path: '#/configuracoes/assinatura' },
];

const STAFF_ROUTES = [
  { name: 'staff-dashboard', path: '#/dashboard' },
  { name: 'staff-agenda', path: '#/agenda' },
  { name: 'staff-insights', path: '#/meus-insights' },
];

const PUBLIC_ROUTES = [
  { name: 'login', path: '#/login' },
  { name: 'public-booking', path: '#/book/barbearia-bob' },
  { name: 'public-queue', path: '#/queue/barbearia-bob' },
];

const JARGON_RE =
  /\b(RPC|UUID|JWT|RLS|webhook|payload|company_id|user_id|undefined|null|NaN|API error|Failed to|Something went wrong|console\.|supabase|stack trace)\b/i;

async function login(page, email, password) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  // Already authenticated (redirected away from login)
  if (!/#\/login/.test(page.url())) {
    await page.waitForTimeout(800);
    return;
  }

  const barber = page.locator('[data-testid="category-barber"]');
  if (await barber.count()) {
    await barber.first().click();
    await page.waitForTimeout(400);
  }
  await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Entrar")');
  await page.waitForFunction(
    () => !location.hash.includes('/login'),
    null,
    { timeout: 45000 }
  );
  await page.waitForTimeout(1200);
}

async function logout(page) {
  await page.evaluate(async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
}

async function auditPage(page, label) {
  return page.evaluate((pageLabel) => {
    const findings = [];
    const vw = innerWidth;
    const vh = innerHeight;

    const isVisible = (el) => {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    // Overflow: text clipped / overflowing container
    const candidates = [
      ...document.querySelectorAll('button, a, [role="button"], [role="tab"], .truncate, h1, h2, h3, label, span'),
    ];
    for (const el of candidates) {
      if (!isVisible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 2 || r.left < -2) {
        findings.push({
          type: 'viewport-overflow',
          severity: 'P1',
          text: (el.innerText || el.textContent || '').trim().slice(0, 80),
          tag: el.tagName.toLowerCase(),
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        });
      }
      if (
        (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.getAttribute('role') === 'tab') &&
        (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)
      ) {
        findings.push({
          type: 'text-overflow-button',
          severity: 'P0',
          text: (el.innerText || '').trim().slice(0, 80),
          tag: el.tagName.toLowerCase(),
          scroll: { sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight },
        });
      }
    }

    // Touch targets < 44
    const interactive = [
      ...document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="tab"]'),
    ];
    let smallTargets = 0;
    for (const el of interactive) {
      if (!isVisible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
        smallTargets += 1;
        if (smallTargets <= 12) {
          findings.push({
            type: 'small-touch-target',
            severity: 'P2',
            text: (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 60),
            size: { w: Math.round(r.width), h: Math.round(r.height) },
          });
        }
      }
    }
    if (smallTargets > 12) {
      findings.push({
        type: 'small-touch-target-summary',
        severity: 'P2',
        count: smallTargets,
      });
    }

    // Hardcoded colors in inline styles
    for (const el of document.querySelectorAll('[style]')) {
      if (!isVisible(el)) continue;
      const st = el.getAttribute('style') || '';
      if (/#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(/.test(st)) {
        findings.push({
          type: 'inline-hardcoded-color',
          severity: 'P2',
          style: st.slice(0, 120),
          text: (el.innerText || '').trim().slice(0, 40),
        });
      }
    }

    // Jargon in visible body text (sample)
    const bodyText = document.body?.innerText || '';
    const jargonHits = [];
    const re =
      /\b(RPC|UUID|JWT|RLS|webhook|payload|company_id|user_id|undefined|null|NaN|Failed to|Something went wrong)\b/gi;
    let m;
    while ((m = re.exec(bodyText)) && jargonHits.length < 10) {
      jargonHits.push(m[0]);
    }
    for (const j of jargonHits) {
      findings.push({ type: 'jargon', severity: 'P1', text: j });
    }

    // Fatal UI
    const lower = bodyText.toLowerCase();
    if (
      lower.includes('application error') ||
      lower.includes('something went wrong') ||
      lower.includes('uncaught') ||
      lower.includes('chunkloaderror')
    ) {
      findings.push({ type: 'fatal-ui', severity: 'P0', text: 'possible crash/error screen' });
    }

    // Console-like dump
    if (/Error:|at Object\.|supabase\.co/.test(bodyText)) {
      findings.push({ type: 'error-leak', severity: 'P0', text: bodyText.slice(0, 160) });
    }

    return {
      page: pageLabel,
      viewport: { w: vw, h: vh },
      findingCount: findings.length,
      findings,
      title: document.title,
      url: location.href,
    };
  }, label);
}

async function capture(page, name, viewport) {
  const file = path.join(SHOT_DIR, `${name}-${viewport}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function runRole(browser, role, email, password, routes, viewport) {
  const results = [];
  const context = await browser.newContext(
    viewport === 'mobile'
      ? {
          ...devices['iPhone 12'],
          viewport: { width: 390, height: 844 },
        }
      : { viewport: { width: 1440, height: 900 } }
  );
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err).slice(0, 200)));

  if (email && password) {
    await login(page, email, password);
  }

  for (const route of routes) {
    const label = `${role}-${route.name}`;
    try {
      await page.goto(`${BASE}/${route.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1600);
      const shot = await capture(page, label, viewport);
      const audit = await auditPage(page, label);
      results.push({
        ...audit,
        screenshot: shot,
        consoleErrors: consoleErrors.splice(0),
      });
      console.log(
        `  [${viewport}] ${label}: findings=${audit.findingCount} → ${path.basename(shot)}`
      );
    } catch (err) {
      results.push({
        page: label,
        error: String(err).slice(0, 300),
        findings: [{ type: 'navigation-error', severity: 'P0', text: String(err).slice(0, 200) }],
      });
      console.log(`  [${viewport}] ${label}: ERROR ${err}`);
    }
  }

  await context.close();
  return results;
}

async function main() {
  if (!OWNER_EMAIL || !OWNER_PASS) {
    console.error('Missing owner credentials in env');
    process.exit(1);
  }

  console.log(`\n=== Impeccable forensic sweep (${phase}) ===`);
  console.log(`Base: ${BASE}`);
  console.log(`Shots: ${SHOT_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const all = [];

  // Public first (no auth)
  for (const vp of ['mobile', 'desktop']) {
    console.log(`\n-- public ${vp} --`);
    all.push(...(await runRole(browser, 'public', null, null, PUBLIC_ROUTES, vp)));
  }

  // Owner
  for (const vp of ['mobile', 'desktop']) {
    console.log(`\n-- owner ${vp} --`);
    all.push(...(await runRole(browser, 'owner', OWNER_EMAIL, OWNER_PASS, OWNER_ROUTES, vp)));
  }

  // Staff
  if (STAFF_EMAIL && STAFF_PASS) {
    for (const vp of ['mobile', 'desktop']) {
      console.log(`\n-- staff ${vp} --`);
      all.push(...(await runRole(browser, 'staff', STAFF_EMAIL, STAFF_PASS, STAFF_ROUTES, vp)));
    }
  }

  await browser.close();

  const summary = {
    phase,
    base: BASE,
    generatedAt: new Date().toISOString(),
    pages: all.length,
    byType: {},
    bySeverity: { P0: 0, P1: 0, P2: 0, P3: 0 },
    pagesWithIssues: all.filter((p) => (p.findings || []).length > 0).map((p) => p.page),
    results: all,
  };

  for (const page of all) {
    for (const f of page.findings || []) {
      summary.byType[f.type] = (summary.byType[f.type] || 0) + 1;
      if (f.severity && summary.bySeverity[f.severity] !== undefined) {
        summary.bySeverity[f.severity] += 1;
      }
    }
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));
  console.log(`\nReport → ${REPORT_PATH}`);
  console.log('Severity:', summary.bySeverity);
  console.log('Types:', summary.byType);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
