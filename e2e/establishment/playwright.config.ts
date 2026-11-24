import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /site\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 15000 },
  reporter: 'list',
  outputDir: '../../artifacts/establishment-test-results',
  use: { baseURL: 'http://localhost:3001', browserName: 'chromium', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop-1280', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: { command: 'npm run dev -- --port 3001 --strictPort', url: 'http://localhost:3001', reuseExistingServer: false, timeout: 120000, env: { VITE_SUPABASE_URL: 'https://presence-e2e.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_presence_e2e_not_a_real_key' } },
});
