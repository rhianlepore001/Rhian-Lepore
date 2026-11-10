import { defineConfig, devices } from '@playwright/test';

/**
 * WhatsApp no iPhone, emulado no WebKit do Playwright (motor do Safari).
 * Local: `npx playwright install webkit` e depois
 *   npx playwright test --config e2e/whatsapp-ios.config.ts
 * Limite: WebKit do Playwright não é um iPhone real (não bloqueia pop-up como o
 * Safari do iOS e não tem o app do WhatsApp). Por isso a suíte também mede se
 * cada abertura acontece dentro do toque, que é a regra do Safari.
 */
process.env.AGENDIX_WHATSAPP_E2E = '1';

export default defineConfig({
  testDir: '.',
  testMatch: 'whatsapp-ios.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: 'list',
  use: {
    ...devices['iPhone 13'],
    browserName: 'webkit',
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'iphone-webkit' }],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 3100 --strictPort',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://whatsapp-e2e.supabase.co', VITE_SUPABASE_ANON_KEY: 'local-e2e-anon-key' },
  },
});
