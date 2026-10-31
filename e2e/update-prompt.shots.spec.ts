import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { buildApp, startPublishServer } from './helpers/publishServer';

/**
 * Gera os prints (390x844) do aviso "Nova versão disponível" nos dois temas (barbearia e salão)
 * e nos dois modos (escuro e claro). Só roda com UPDATE_PROMPT_SHOTS=<pasta de saída>.
 */
const outDir = process.env.UPDATE_PROMPT_SHOTS;
test.skip(!outDir, 'defina UPDATE_PROMPT_SHOTS=<pasta> para gerar os prints');
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

const themes = [
  { theme: 'barber', label: 'barbearia' },
  { theme: 'beauty', label: 'salao' },
] as const;
const modes = [
  { mode: 'dark', label: 'escuro' },
  { mode: 'light', label: 'claro' },
] as const;

test('prints do aviso de atualização', async ({ page }) => {
  test.setTimeout(240_000);
  fs.mkdirSync(outDir!, { recursive: true });
  const dirA = buildApp('build-A', 'shots-a');
  const dirB = buildApp('build-B', 'shots-b');
  const server = await startPublishServer(dirA);
  try {
    await page.route('https://example.supabase.co/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );
    await page.route(/fonts\.(googleapis|gstatic)\.com|images\.unsplash\.com|connect\.facebook\.net/, (route) => route.abort());
    await page.addInitScript(() => localStorage.setItem('agendix_cookie_consent', 'dismissed'));

    await page.goto(`${server.origin}/#/dashboard-cockpit-demo`);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, { timeout: 30_000 });
    server.publish(dirB);
    await page.waitForTimeout(3_300);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    const aviso = page.getByRole('status').filter({ hasText: 'Nova versão disponível' });
    await expect(aviso).toBeVisible({ timeout: 20_000 });

    for (const { theme, label } of themes) {
      for (const { mode, label: modeLabel } of modes) {
        await page.evaluate(([t, m]) => {
          document.documentElement.setAttribute('data-theme', t);
          document.documentElement.setAttribute('data-mode', m);
        }, [theme, mode]);
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(outDir!, `aviso-${label}-${modeLabel}.png`) });
      }
    }
  } finally {
    await server.close();
  }
});
