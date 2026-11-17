import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'hourly-results.spec.ts',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:3184',
    browserName: 'chromium',
    launchOptions: process.env.CHAIR_BROWSER_PATH ? { executablePath: process.env.CHAIR_BROWSER_PATH } : {},
  },
  webServer: {
    command: 'VITE_SUPABASE_URL=https://example.invalid VITE_SUPABASE_ANON_KEY=ficticia npm run dev -- --port 3184',
    url: 'http://127.0.0.1:3184',
    reuseExistingServer: false,
    timeout: 120000,
  },
});