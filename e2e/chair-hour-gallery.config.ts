import { defineConfig } from '@playwright/test';

// Galeria de capturas fictícias (antes/depois). Não substitui os 16 cenários de chair-hour.spec.ts.
export default defineConfig({
  testDir: '.', testMatch: 'chair-hour-gallery.spec.ts', workers: 1, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:3183', browserName: 'chromium', launchOptions: process.env.CHAIR_BROWSER_PATH ? { executablePath: process.env.CHAIR_BROWSER_PATH } : {} },
  webServer: { command: 'VITE_SUPABASE_URL=https://example.invalid VITE_SUPABASE_ANON_KEY=ficticia npm run dev -- --port 3183', url: 'http://127.0.0.1:3183', reuseExistingServer: false, timeout: 120000 },
});
