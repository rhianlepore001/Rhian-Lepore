/**
 * Auditoria UI visual em producao (agente 01).
 *
 * Loga em https://rhian-lepore.vercel.app com a conta de teste,
 * navega pelas principais telas e tira screenshots em desktop + mobile.
 * Os screenshots sao salvos em agendix-e2e-test/03-testes/e2e-jornada/screenshots/
 * para analise do agente/orquestrador.
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://rhian-lepore.vercel.app';
const TEST_EMAIL = process.env.AGENDIX_TEST_EMAIL ?? '';
const TEST_PASSWORD = process.env.AGENDIX_TEST_PASSWORD ?? '';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, '../agendix-e2e-test/03-testes/e2e-jornada/screenshots');

const ROUTES = [
  { name: 'dashboard', path: '#/' },
  { name: 'agenda', path: '#/agenda' },
  { name: 'fila-digital', path: '#/fila' },
  { name: 'clientes-crm', path: '#/clientes' },
  { name: 'produtos', path: '#/produtos' },
  { name: 'financeiro', path: '#/financeiro' },
  { name: 'insights', path: '#/insights' },
  { name: 'ajustes-geral', path: '#/configuracoes/geral' },
  { name: 'ajustes-equipe', path: '#/configuracoes/equipe' },
  { name: 'ajustes-servicos', path: '#/configuracoes/servicos' },
  { name: 'public-booking', path: '#/book/barbearia-bob' },
];

async function login(page: Page) {
  await page.goto(`${BASE_URL}/#/login`);
  await page.waitForSelector('button[data-testid="category-barber"]', { timeout: 15000 });
  await page.click('button[data-testid="category-barber"]');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.waitForTimeout(300);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL(/#\/(dashboard|agenda|onboarding-wizard)?$/, { timeout: 30000 });
}

async function screenshot(page: Page, name: string, viewport: 'desktop' | 'mobile') {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const fileName = `${name}-${viewport}.png`;
  const filePath = path.join(OUT_DIR, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function captureRoute(page: Page, route: { name: string; path: string }, viewport: 'desktop' | 'mobile') {
  await page.goto(`${BASE_URL}/${route.path}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  const hasFatal = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes('uncaught') || text.includes('application error') || text.includes('something went wrong');
  });
  const filePath = await screenshot(page, route.name, viewport);
  return { route: route.name, viewport, filePath, hasFatal };
}

for (const viewport of ['desktop', 'mobile'] as const) {
  test.describe(`UI Audit - ${viewport}`, () => {
    test.use({
      viewport: viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 },
      userAgent: viewport === 'mobile'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
        : undefined,
    });

    test(`captura ${viewport}`, async ({ page }) => {
      test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Credenciais de teste nao configuradas');
      await login(page);

      const results = [];
      for (const route of ROUTES) {
        // Public booking nao precisa estar logado, mas reaproveitamos a sessao
        const result = await captureRoute(page, route, viewport);
        results.push(result);
        expect(result.hasFatal).toBeFalsy();
      }

      // Salva metadados
      const metaPath = path.join(OUT_DIR, `metadata-${viewport}.json`);
      fs.writeFileSync(metaPath, JSON.stringify(results, null, 2));
    });
  });
}
