import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'client-dependents.spec.ts', workers: 1, retries: 0,
  timeout: 45_000, reporter: 'list',
  use: { baseURL: 'http://localhost:3000', browserName: 'chromium',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1', url: 'http://localhost:3000', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://dependents-e2e.supabase.co', VITE_SUPABASE_ANON_KEY: 'fictional-e2e-key' } },
});
