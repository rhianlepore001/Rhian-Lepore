/**
 * Auditoria visual CRM v2 — login + prints + checks estruturais.
 * Uso:
 *   E2E_OWNER_EMAIL=... E2E_OWNER_PASS=... node scripts/crm-v2-visual-audit.mjs
 */
import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_OWNER_EMAIL || 'bob.teste@gmail.com';
const PASS = process.env.E2E_OWNER_PASS || 'BobTeste@123';
const OUT = process.env.CRM_AUDIT_OUT || '/opt/cursor/artifacts/crm-v2';

fs.mkdirSync(OUT, { recursive: true });

const findings = [];
function note(level, msg) {
  findings.push({ level, msg });
  console.log(`[${level}] ${msg}`);
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`SHOT ${file}`);
  return file;
}

async function login(page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const entrar = page.getByText(/ENTRAR/i).first();
  if (await entrar.isVisible().catch(() => false)) {
    await entrar.click();
  }
  await page.locator('input[type="email"]').waitFor({ timeout: 20_000 });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('button[type="submit"]').click();
  await page.getByText(/Olá,/i).first().waitFor({ timeout: 45_000 });
}

async function goClients(page) {
  await page.goto(`${BASE}/#/clientes`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /^Clientes$/i }).waitFor({ timeout: 20_000 });
  await page.waitForTimeout(1200);
}

async function auditMobile(browser) {
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    locale: 'pt-BR',
  });
  const page = await context.newPage();
  await login(page);
  await goClients(page);
  await shot(page, '01-mobile-lista-todos');

  // Filtros
  for (const filter of ['VIP', 'Novos', 'Inativo']) {
    await page.getByRole('tab', { name: filter }).click();
    await page.waitForTimeout(500);
    await shot(page, `02-mobile-filtro-${filter.toLowerCase()}`);
  }
  await page.getByRole('tab', { name: 'Todos' }).click();
  await page.waitForTimeout(400);

  // Modal novo cliente
  await page.getByRole('button', { name: /Adicionar cliente/i }).first().click();
  await page.getByRole('heading', { name: /Novo cliente/i }).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await shot(page, '03-mobile-modal-novo');

  const bodyText = await page.locator('body').innerText();
  if (/Origem do cliente|Recente|Antigo/i.test(bodyText) && /Novo cliente/i.test(bodyText)) {
    // "Novo" no título é ok; "Origem" não
  }
  if (/Origem do cliente/i.test(bodyText)) {
    note('P0', 'Modal ainda mostra Origem do cliente');
  } else {
    note('OK', 'Modal sem Origem do cliente');
  }
  if (/Data de aniversário/i.test(bodyText)) {
    note('OK', 'Modal tem data de aniversário');
  } else {
    note('P0', 'Modal sem campo de aniversário');
  }

  // Preencher aniversário e cancelar (não poluir se já existir fluxo)
  await page.getByLabel(/Data de aniversário/i).fill('1995-08-06').catch(async () => {
    await page.locator('input[type="date"]').fill('1995-08-06');
  });
  await shot(page, '04-mobile-modal-com-aniversario');

  // Fechar modal
  const closeBtn = page.getByRole('button', { name: /fechar|close|cancelar/i }).first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(500);

  // Abrir primeiro cliente da lista
  const firstCard = page.locator('a[href*="#/clientes/"], a[href^="/clientes/"]').first();
  const cardCount = await page.locator('a[href*="clientes/"]').count();
  note('INFO', `Cards de cliente na lista (Todos): ${cardCount}`);

  if (cardCount > 0) {
    await firstCard.click();
    await page.waitForURL(/clientes\//, { timeout: 15_000 });
    await page.waitForTimeout(1500);
    await shot(page, '05-mobile-crm-ficha');

    const crmText = await page.locator('body').innerText();
    const banned = [
      [/SEM MEMÓRIAS PROFUNDAS/i, 'Bloco IA semântica ainda presente'],
      [/Membro desde 2021/i, 'Texto hardcoded Membro desde 2021'],
      [/Próxima Visita/i, 'KPI predição Próxima Visita ainda hero'],
      [/Anote preferências nas notas para ativar a IA/i, 'Copy IA incompleta ainda presente'],
    ];
    for (const [re, msg] of banned) {
      if (re.test(crmText)) note('P0', msg);
      else note('OK', `Ausente: ${msg}`);
    }
    const required = [
      [/Última visita/i, 'KPI Última visita'],
      [/Visitas/i, 'KPI Visitas'],
      [/Total gasto/i, 'KPI Total gasto'],
      [/Observações/i, 'Seção Observações'],
      [/Histórico/i, 'Seção Histórico'],
    ];
    for (const [re, msg] of required) {
      if (re.test(crmText)) note('OK', msg);
      else note('P1', `Falta ${msg}`);
    }

    // Scroll histórico / notas
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await shot(page, '06-mobile-crm-scroll');

    // Editar
    const edit = page.getByRole('button', { name: /Editar cliente/i });
    if (await edit.isVisible().catch(() => false)) {
      await edit.click();
      await page.waitForTimeout(500);
      await shot(page, '07-mobile-crm-editar');
      const editText = await page.locator('body').innerText();
      if (/Data de aniversário/i.test(editText)) note('OK', 'Edit tem aniversário');
      else note('P0', 'Edit sem aniversário');
      await page.keyboard.press('Escape');
    } else {
      note('P1', 'Botão editar cliente não encontrado');
    }
  } else {
    note('P1', 'Lista sem clientes — CRM detalhe não auditado');
  }

  await context.close();
}

async function auditDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pt-BR',
  });
  const page = await context.newPage();
  await login(page);
  await goClients(page);
  await shot(page, '08-desktop-lista');

  // Checar sidebar Clientes CRM
  const side = page.locator('aside, nav').filter({ hasText: /Clientes/i }).first();
  if (await side.isVisible().catch(() => false)) note('OK', 'Sidebar mostra Clientes para dono');

  // Abrir cliente
  const first = page.locator('a[href*="clientes/"]').first();
  if (await first.count()) {
    await first.click();
    await page.waitForTimeout(1500);
    await shot(page, '09-desktop-crm');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await shot(page, '10-desktop-crm-scroll');
  }

  // Densidade / overflow checks
  const overflow = await page.evaluate(() => {
    const issues = [];
    document.querySelectorAll('h1,h2,h3,button,p').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 2) {
        issues.push((el.textContent || '').trim().slice(0, 60));
      }
    });
    return issues.slice(0, 10);
  });
  if (overflow.length) note('P1', `Possível texto cortado: ${overflow.join(' | ')}`);
  else note('OK', 'Sem overflow óbvio em headings/botões');

  await context.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await auditMobile(browser);
    await auditDesktop(browser);
  } finally {
    await browser.close();
  }

  const report = path.join(OUT, 'report.json');
  fs.writeFileSync(report, JSON.stringify({ findings, at: new Date().toISOString() }, null, 2));
  console.log(`REPORT ${report}`);
  const p0 = findings.filter((f) => f.level === 'P0');
  if (p0.length) {
    console.error(`FAIL ${p0.length} P0`);
    process.exitCode = 1;
  } else {
    console.log('PASS sem P0');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
