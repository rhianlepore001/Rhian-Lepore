/**
 * Auditoria rápida de texto cortado no mobile (360×740).
 * Uso: node scripts/audit-mobile-truncate.mjs [baseUrl]
 * Requer app já logado via storageState em e2e/.auth/owner.json (opcional).
 */
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Carrega .env.local sem dependência extra
for (const file of ['.env.local', '.env']) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const baseUrl = process.argv[2] || process.env.E2E_BASE_URL || 'http://localhost:3000';
const authPath = path.resolve(root, 'e2e/.auth/owner.json');
const routes = ['/#/', '/#/insights', '/#/financeiro'];
const email = process.env.E2E_OWNER_EMAIL;
const pass = process.env.E2E_OWNER_PASS;

async function findClipped(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('h1,h2,h3,p,span,button,a,label')) {
      const text = (el.innerText || '').trim().replace(/\s+/g, ' ');
      if (!text || text.length < 2) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const clipped = el.scrollWidth > el.clientWidth + 1;
      if (!clipped) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 4 || rect.bottom < 0 || rect.top > innerHeight) continue;
      // Ignora nós agregadores (filhos já reportados)
      if ([...el.children].some((c) => c.scrollWidth > c.clientWidth + 1)) continue;
      out.push({
        text: text.slice(0, 100),
        tag: el.tagName,
        className: String(el.className).slice(0, 80),
        cw: el.clientWidth,
        sw: el.scrollWidth,
      });
    }
    return out;
  });
}

async function ensureLogin(page) {
  if (!email || !pass) {
    console.warn('Sem E2E_OWNER_* — auditando sem login.');
    return;
  }
  await page.goto(`${baseUrl}/#/login`, { waitUntil: 'load', timeout: 45000 });
  const entrar = page.getByText('ENTRAR').first();
  if (await entrar.count()) {
    await entrar.click().catch(() => {});
    await page.waitForTimeout(800);
  }
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ timeout: 20000 });
  await emailInput.fill(email);
  await page.locator('input[type="password"]').first().fill(pass);
  await page.locator('button[type="submit"]').first().click();
  await page.getByText('Olá,').first().waitFor({ timeout: 45000 });
  fs.mkdirSync(path.dirname(authPath), { recursive: true });
  await page.context().storageState({ path: authPath });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices['iPhone 12'],
  viewport: { width: 360, height: 740 },
  storageState: fs.existsSync(authPath) ? authPath : undefined,
});
const page = await context.newPage();
await ensureLogin(page);
const report = [];

for (const route of routes) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(800);
  const clipped = await findClipped(page);
  const name = await page.locator('header h1').first().innerText().catch(() => '');
  report.push({ route, header: name.replace(/\s+/g, ' ').trim(), clipped });
  console.log(`\n${route}`);
  console.log(`  header: ${name.replace(/\s+/g, ' ').trim()}`);
  if (clipped.length === 0) console.log('  clipped: none');
  else clipped.forEach((c) => console.log(`  clipped: [${c.tag}] ${c.text} (${c.cw}<${c.sw})`));
}

await browser.close();
const bad = report.some((r) => r.clipped.length > 0);
process.exit(bad ? 1 : 0);
