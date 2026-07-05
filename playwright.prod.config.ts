import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /audit-ui-producao\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 120000,
  use: {
    baseURL: 'https://rhian-lepore.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    browserName: 'chromium',
  },
  projects: [
    {
      name: 'prod-audit-desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        storageState: '',
      },
    },
    {
      name: 'prod-audit-mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        storageState: '',
      },
    },
  ],
});
