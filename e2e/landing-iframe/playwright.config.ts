import { defineConfig } from '@playwright/test';

// Build de produção servido com os headers do vercel.json.
// Rode antes: VITE_SUPABASE_URL=https://offline.supabase.invalid VITE_SUPABASE_ANON_KEY=x npm run build
export default defineConfig({
  testDir: '.',
  testMatch: /landing-iframe\.spec\.ts/,
  workers: 1,
  timeout: 45000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4310', browserName: 'chromium', serviceWorkers: 'block', trace: 'retain-on-failure' },
  webServer: {
    command: 'node e2e/landing-iframe/serve-with-vercel-headers.mjs',
    url: 'http://127.0.0.1:4310/version.json',
    reuseExistingServer: false,
    cwd: '../..',
  },
});
