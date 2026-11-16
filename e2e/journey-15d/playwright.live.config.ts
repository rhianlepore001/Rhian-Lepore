import { defineConfig, devices } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { assertLiveTarget } from './helpers/journeySafety';
import { journeyOutputDir } from './helpers/journeyLedger';

assertLiveTarget();
if (!process.env.TEST_WORKER_INDEX) process.env.JOURNEY_RUN_ID = `${Date.now()}-${randomUUID()}`;

export default defineConfig({
  testDir: '.',
  testMatch: 'journey-live-15d.spec.ts',
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: path.join(journeyOutputDir(), 'test-results'),
  reporter: [['list'], ['./reporters/journeyMarkdownReporter.ts', { expectedScenarios: 3 }]],
  use: {
    baseURL: process.env.E2E_BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    browserName: 'chromium',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'live-desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'live-iphone', use: { ...devices['iPhone 13'], browserName: 'chromium', viewport: { width: 390, height: 844 } } },
    { name: 'live-android', use: { ...devices['Pixel 5'], browserName: 'chromium' } },
  ],
});
