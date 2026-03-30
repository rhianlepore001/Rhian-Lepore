import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for EPIC-004 E2E Tests
 *
 * Tests the complete onboarding flow including:
 * - SetupCopilot with 6 setup steps
 * - Event dispatching (setup-step-completed, system-activated)
 * - Animations and accessibility
 * - First appointment creation
 */

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Sequential for onboarding flow
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  timeout: 60000,
});
