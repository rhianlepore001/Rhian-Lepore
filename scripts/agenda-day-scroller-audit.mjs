/**
 * Auditoria visual + UX do AgendaDayScroller.
 * Uso: set -a && source .env && set +a && node scripts/agenda-day-scroller-audit.mjs
 */
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_OWNER_EMAIL;
const PASS = process.env.E2E_OWNER_PASS;
const OUT = path.resolve('/opt/cursor/artifacts/agenda-day-scroller');

if (!EMAIL || !PASS) {
  console.error('Defina E2E_OWNER_EMAIL e E2E_OWNER_PASS (.env).');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

async function login(page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'load' });
  const entrar = page.getByText('ENTRAR').first();
  await entrar.waitFor({ timeout: 20_000 });
  await page.waitForTimeout(600);
  await entrar.click();
  const email = page.locator('input[type="email"]').first();
  await email.waitFor({ timeout: 20_000 });
  await email.fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.getByText('Olá,').first().waitFor({ timeout: 45_000 });
  await page.waitForTimeout(800);
}

async function goAgenda(page) {
  await page.goto(`${BASE}/#/agenda`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="agenda-day-scroller"]', { timeout: 30000 });
  await page.waitForTimeout(800);
}

async function critique(page, label) {
  const findings = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="agenda-day-scroller"]');
    if (!root) return { error: 'scroller ausente' };
    const buttons = [...root.querySelectorAll('button[role="option"]')];
    const arrows = [
      ...document.querySelectorAll('[aria-label="Semana anterior"], [aria-label="Próxima semana"]'),
    ];
    const scroller = root.querySelector('[aria-label="Calendário de dias"]');
    const style = scroller ? getComputedStyle(scroller) : null;
    const selected = root.querySelector('[data-testid="agenda-day-selected"]');
    return {
      dayCount: buttons.length,
      arrowCount: arrows.length,
      overflowX: style?.overflowX,
      cursor: style?.cursor,
      hasSelected: !!selected,
      scrollerScrollWidth: scroller?.scrollWidth ?? 0,
      scrollerClientWidth: scroller?.clientWidth ?? 0,
      canScroll: (scroller?.scrollWidth ?? 0) > (scroller?.clientWidth ?? 0) + 8,
      monthLabel: root.querySelector('p')?.textContent?.trim() ?? '',
    };
  });

  // Drag horizontal (mouse)
  const box = await page.locator('[aria-label="Calendário de dias"]').boundingBox();
  let dragDelta = null;
  if (box) {
    const before = await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Calendário de dias"]');
      return el?.scrollLeft ?? 0;
    });
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Calendário de dias"]');
      return el?.scrollLeft ?? 0;
    });
    dragDelta = after - before;
  }

  return { label, ...findings, dragDelta };
}

async function runViewport(browser, name, viewport, userAgent) {
  const context = await browser.newContext({
    viewport,
    userAgent,
    deviceScaleFactor: name === 'mobile' ? 2 : 1,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await login(page);
  await goAgenda(page);

  const beforePath = path.join(OUT, `${name}-agenda.png`);
  await page.screenshot({ path: beforePath, fullPage: false });

  const critiqueBeforeDrag = await critique(page, name);

  // Após drag, screenshot
  const afterPath = path.join(OUT, `${name}-agenda-after-drag.png`);
  await page.screenshot({ path: afterPath, fullPage: false });

  // Crop foco no scroller
  const scroller = page.locator('[data-testid="agenda-day-scroller"]');
  await scroller.screenshot({ path: path.join(OUT, `${name}-day-scroller.png`) });

  await context.close();
  return { ...critiqueBeforeDrag, consoleErrors, screenshots: [beforePath, afterPath] };
}

const browser = await chromium.launch({ headless: true });
const results = [];

results.push(
  await runViewport(
    browser,
    'mobile',
    { width: 390, height: 844 },
    devices['iPhone 13'].userAgent,
  ),
);

results.push(
  await runViewport(
    browser,
    'desktop',
    { width: 1440, height: 900 },
    undefined,
  ),
);

await browser.close();

const report = {
  at: new Date().toISOString(),
  base: BASE,
  results,
  verdict: results.every((r) => r.arrowCount === 0 && r.canScroll && Math.abs(r.dragDelta ?? 0) > 10)
    ? 'PASS'
    : 'NEEDS_ATTENTION',
};

fs.writeFileSync(path.join(OUT, 'critique.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(`\nArtifacts: ${OUT}`);
