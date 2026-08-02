/**
 * Smoke UX do booking público (mobile 390 + desktop 1280).
 * Uso: node scripts/audit-booking-ux.mjs [baseUrl] [slug]
 */
import { chromium, devices } from 'playwright';

const baseUrl = process.argv[2] || 'http://localhost:3000';
const slug = process.argv[3] || 'vanessa-lepore';

async function audit(page, label) {
  const issues = await page.evaluate(() => {
    const out = [];
    const root = document.getElementById('booking-root');
    if (!root) out.push('missing #booking-root');

    const sidebars = [...document.querySelectorAll('aside#sidebar-container, nav[aria-label="Navegação principal"]')]
      .filter((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0);
    if (sidebars.length) out.push('app chrome (sidebar/nav) visível na página pública');

    const atmosfera = [...document.querySelectorAll('*')].find((el) =>
      (el.textContent || '').includes('Atmosfera & Arte') && el.children.length < 8
    );
    if (atmosfera && getComputedStyle(atmosfera).display !== 'none') {
      const r = atmosfera.getBoundingClientRect();
      if (r.bottom > innerHeight - 80) out.push('Atmosfera & Arte sobrepondo rodapé');
    }

    const primaries = [...document.querySelectorAll('button')].filter((b) => {
      const t = (b.innerText || '').trim();
      return /Confirmar|Continuar/.test(t) && getComputedStyle(b).display !== 'none' && b.offsetParent !== null;
    });
    const labels = primaries.map((b) => (b.innerText || '').replace(/\s+/g, ' ').trim());
    if (labels.filter((l) => /Confirmar/.test(l)).length + labels.filter((l) => l === 'Continuar').length > 1) {
      // no confirm step, só um primário deve existir
      const contactHeading = [...document.querySelectorAll('h2')].some((h) =>
        (h.textContent || '').includes('Confirme')
      );
      if (contactHeading && labels.length > 1) {
        out.push(`CTAs duplicadas no confirm: ${labels.join(' | ')}`);
      }
    }

    return { issues: out, labels, vw: innerWidth };
  });
  console.log(`\n[${label}] vw=${issues.vw}`);
  console.log(`  CTAs: ${(issues.labels || []).join(' | ') || '(nenhuma)'}`);
  if (issues.issues.length === 0) console.log('  ok');
  else issues.issues.forEach((i) => console.log(`  ISSUE: ${i}`));
  return issues.issues;
}

const browser = await chromium.launch({ headless: true });
let failed = false;

// Mobile — só abre a landing (sem completar fluxo sem dados)
{
  const context = await browser.newContext({
    ...devices['iPhone 12'],
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/#/book/${slug}`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1000);
  const issues = await audit(page, 'mobile-landing');
  if (issues.length) failed = true;
  await context.close();
}

// Desktop
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/#/book/${slug}`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1000);
  const issues = await audit(page, 'desktop-landing');
  if (issues.length) failed = true;

  // tenta avançar até serviços selecionados → profissional (smoke)
  const firstService = page.locator('button, [role="button"]').filter({ hasText: /Pedicure|Corte|Serviço/i }).first();
  if (await firstService.count()) {
    await firstService.click().catch(() => {});
    const continuar = page.getByRole('button', { name: /Continuar/i });
    if (await continuar.isEnabled().catch(() => false)) {
      await continuar.click();
      await page.waitForTimeout(600);
    }
  }
  await context.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
