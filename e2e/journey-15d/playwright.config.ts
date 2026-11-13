import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: '.',
  testMatch: /journey-15d\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 240_000,
  outputDir: path.join(root, 'artifacts', 'journey-15d', 'test-results'),
  reporter: [
    ['list'],
    ['./reporters/journeyMarkdownReporter.ts'],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    browserName: 'chromium',
  },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'iphone',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'android',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
    },
  ],
  webServer: {
    command:
      'VITE_SUPABASE_URL=http://127.0.0.1:59999 VITE_SUPABASE_ANON_KEY=e2e-fake-anon-key npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    cwd: root,
  },
});
