import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'import-flow.spec.ts', workers: 1, timeout: 60000,
  use: { baseURL:'http://127.0.0.1:3181', browserName:'chromium', launchOptions:{ executablePath:'/usr/bin/chromium' } },
  webServer: { command:'VITE_SUPABASE_URL=https://example.invalid VITE_SUPABASE_ANON_KEY=ficticia npm run dev -- --port 3181', url:'http://127.0.0.1:3181', reuseExistingServer:false, timeout:120000 },
});
