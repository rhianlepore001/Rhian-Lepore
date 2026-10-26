import { defineConfig } from '@playwright/test';

process.env.AGENDIX_WHATSAPP_E2E = '1';

export default defineConfig({
  testDir: '.',
  testMatch: 'whatsapp-templates.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://whatsapp-e2e.supabase.co', VITE_SUPABASE_ANON_KEY: 'local-e2e-anon-key' },
  },
});
