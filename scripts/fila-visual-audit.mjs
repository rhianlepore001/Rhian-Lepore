/**
 * Captura visual da Fila Digital — login nas contas de teste + fila pública.
 *
 *   E2E_BASE_URL=https://rhian-lepore.vercel.app \
 *   node scripts/fila-visual-audit.mjs
 */
import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'https://rhian-lepore.vercel.app';
const OUT = process.env.FILA_AUDIT_OUT || '/opt/cursor/artifacts/screenshots/fila';
const SILVA_SLUG = process.env.E2E_SILVA_SLUG || 'vanessa-lepore';

const ACCOUNTS = {
  owner: {
    label: 'owner-bob',
    email: process.env.E2E_OWNER_EMAIL || 'bob.teste@gmail.com',
    pass: process.env.E2E_OWNER_PASS || 'BobTeste@123',
  },
  staff: {
    label: 'staff-bob',
    email: process.env.E2E_STAFF_EMAIL || 'bob.teste.colab@gmail.com',
    pass: process.env.E2E_STAFF_PASS || 'BobTeste@123',
  },
};

fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`SHOT ${file}`);
  return file;
}

async function login(page, { email, pass }) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const entrar = page.getByText(/ENTRAR/i).first();
  if (await entrar.isVisible().catch(() => false)) {
    await entrar.click();
  }
  const barber = page.locator('button[data-testid="category-barber"]');
  if (await barber.isVisible().catch(() => false)) {
    await barber.click();
  }
  await page.locator('input[type="email"]').waitFor({ timeout: 20_000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(pass);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/#\/(dashboard|agenda|onboarding-wizard|fila)?/, { timeout: 45_000 });
  await page.waitForTimeout(1500);
}

async function captureOwner(browser) {
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'pt-BR' });
  const page = await context.newPage();
  const { label, email, pass } = ACCOUNTS.owner;
  await login(page, { email, pass });

  await page.goto(`${BASE}/#/fila`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await shot(page, `01-${label}-fila-operacao`);

  const ajustes = page.getByRole('button', { name: /Ajustes/i });
  if (await ajustes.isVisible().catch(() => false)) {
    await ajustes.click();
    await page.waitForTimeout(1200);
    await shot(page, `02-${label}-fila-ajustes`);
    await page.keyboard.press('Escape');
  }

  await context.close();
}

async function captureStaff(browser) {
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'pt-BR' });
  const page = await context.newPage();
  const { label, email, pass } = ACCOUNTS.staff;
  await login(page, { email, pass });

  await page.goto(`${BASE}/#/agenda`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await shot(page, `03-${label}-agenda`);

  await page.goto(`${BASE}/#/fila`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await shot(page, `04-${label}-fila`);

  await context.close();
}

async function capturePublicQueue(browser) {
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'pt-BR' });
  const page = await context.newPage();

  await page.goto(`${BASE}/#/queue/${SILVA_SLUG}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await shot(page, '05-publico-silva-servico');

  const serviceCard = page.locator('button').filter({ hasText: /€|R\$/ }).first();
  await serviceCard.waitFor({ timeout: 15_000 });
  await serviceCard.click();
  await page.waitForTimeout(600);
  const continuarServico = page.getByRole('button', { name: /Continuar/i });
  await continuarServico.click();
  await page.waitForTimeout(1500);
  await shot(page, '06-publico-silva-identidade');

  const nameInput = page.getByPlaceholder(/nome completo/i);
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('Cliente Teste');
  }
  const phoneInput = page.locator('input[type="tel"], input[inputmode="numeric"]').first();
  if (await phoneInput.isVisible().catch(() => false)) {
    await phoneInput.fill('912345678');
  }
  await page.getByRole('button', { name: /Continuar/i }).click();
  await page.waitForTimeout(2000);
  await shot(page, '07-publico-silva-pagamento');

  await context.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await captureOwner(browser);
    await captureStaff(browser);
    await capturePublicQueue(browser);
    console.log(`\nDone. Screenshots in ${OUT}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
