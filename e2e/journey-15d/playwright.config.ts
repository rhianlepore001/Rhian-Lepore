import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mockBaseUrl } from './helpers/journeySafety';
import { journeyOutputDir } from './helpers/journeyLedger';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baseURL = mockBaseUrl();
if (!process.env.TEST_WORKER_INDEX) process.env.JOURNEY_RUN_ID = `${Date.now()}-${randomUUID()}`;

export default defineConfig({
  testDir: '.',
  testMatch: 'journey-15d.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  outputDir: path.join(journeyOutputDir(), 'test-results'),
  reporter: [
    ['list'],
    ['./reporters/journeyMarkdownReporter.ts'],
  ],
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    browserName: 'chromium',
    serviceWorkers: 'block',
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
        browserName: 'chromium',
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
    command: `npx vite --config e2e/journey-15d/vite.config.ts --host ${new URL(baseURL).hostname} --port ${new URL(baseURL).port || '80'}`,
    env: {
      VITE_SUPABASE_URL: `${baseURL}/__journey_supabase_mock`,
      VITE_SUPABASE_ANON_KEY: 'e2e-fake-anon-key',
      VITE_META_PIXEL_ID: '',
      VITE_OPENROUTER_API_KEY: '',
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    cwd: root,
  },
});
