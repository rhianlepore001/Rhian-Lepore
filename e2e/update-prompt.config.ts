import { defineConfig } from '@playwright/test';

// Sem webServer: o spec compila dois builds (A e B) e publica um servidor próprio.
export default defineConfig({
  testDir: '.',
  testMatch: /update-prompt\.(spec|shots\.spec)\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: [['list']],
  use: { browserName: 'chromium' },
});
