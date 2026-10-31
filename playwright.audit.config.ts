import { defineConfig, devices } from '@playwright/test';

/**
 * Auditoria de cadastro/onboarding em 3 navegadores. Usa SEMPRE o backend falso (e2e/helpers/mockBackend.ts):
 * nenhum teste fala com o Supabase real nem cria conta em produção.
 * Pré-requisito: app rodando em AUDIT_BASE_URL (padrão http://127.0.0.1:3418) com
 * VITE_SUPABASE_URL=http://127.0.0.1:59999 VITE_SUPABASE_ANON_KEY=fake npx vite --port 3418
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /onboarding-(audit|scenarios)\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  reporter: [['list']],
  use: { baseURL: process.env.AUDIT_BASE_URL ?? 'http://127.0.0.1:3418', trace: 'off' },
  projects: [
    { name: 'webkit-iphone', use: { ...devices['iPhone 14'], viewport: { width: 390, height: 844 } } },
    { name: 'chromium-android', use: { ...devices['Pixel 7'] } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
