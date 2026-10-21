import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'meta-pixel.spec.ts',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://localhost:3000', browserName: 'chromium' },
  reporter: [['list'], ['html', { outputFolder: 'work/meta-pixel-report', open: 'never' }]],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key-for-ci',
      VITE_META_PIXEL_ID: '123456789',
    },
  },
});
