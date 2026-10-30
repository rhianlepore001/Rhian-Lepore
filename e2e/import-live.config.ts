import { defineConfig } from '@playwright/test';

const local = process.env.VITE_SUPABASE_URL;
if (!local || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(local)) throw new Error('O teste exige uma URL Supabase local explícita.');
if (!process.env.VITE_SUPABASE_ANON_KEY || !process.env.IMPORT_TEST_EMAIL || !process.env.IMPORT_TEST_OTHER_EMAIL || !process.env.IMPORT_TEST_PASSWORD) throw new Error('Faltam os dados temporários do ambiente local.');
export default defineConfig({
  testDir: '.', testMatch: 'import-live.spec.ts', workers: 1, timeout: 90000,
  use: { baseURL:'http://127.0.0.1:3182', browserName:'chromium', launchOptions:{ executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium' } },
  webServer: { command:'npm run dev -- --port 3182', url:'http://127.0.0.1:3182', reuseExistingServer:false, timeout:120000 },
});
