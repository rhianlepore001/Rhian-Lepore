import { defineConfig } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
loadEnv({ path: path.join(root, '.env'), quiet: true });
loadEnv({ path: path.join(root, '.env.local'), quiet: true });

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

function isLocalUrl(raw: string): boolean {
  try {
    const { hostname } = new URL(raw);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  } catch {
    return true;
  }
}

const skipWebServer =
  process.env.VISUAL_CRITIQUE_SKIP_WEBSERVER === '1' || !isLocalUrl(baseURL);

export default defineConfig({
  testDir: '.',
  testMatch: /capture\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 180000,
  outputDir: path.join(root, 'artifacts/visual-critique/test-results'),
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    browserName: 'chromium',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    {
      name: 'critique-desktop',
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'critique-mobile',
      use: {
        viewport: { width: 390, height: 844 },
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      },
    },
  ],
  webServer: skipWebServer
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        cwd: root,
      },
});
