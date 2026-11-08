import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'chair-hour.spec.ts', workers: 1, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:3182', browserName: 'chromium', launchOptions: process.env.CHAIR_BROWSER_PATH ? { executablePath: process.env.CHAIR_BROWSER_PATH } : {} },
  webServer: { command: 'VITE_SUPABASE_URL=https://example.invalid VITE_SUPABASE_ANON_KEY=ficticia npm run dev -- --port 3182', url: 'http://127.0.0.1:3182', reuseExistingServer: false, timeout: 120000 },
});
