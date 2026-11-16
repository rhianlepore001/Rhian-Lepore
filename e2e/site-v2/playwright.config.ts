import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: /site\.spec\.ts/, workers: 1, timeout: 45000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3000', browserName: 'chromium', viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure', serviceWorkers: 'block' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 3000', url: 'http://127.0.0.1:3000', reuseExistingServer: true, env: { VITE_SUPABASE_URL: 'https://offline.supabase.invalid', VITE_SUPABASE_ANON_KEY: 'local-simulation-key' } },
});
