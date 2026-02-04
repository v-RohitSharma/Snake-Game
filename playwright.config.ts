import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  use: {
    headless: true,
    viewport: { width: 360, height: 640 },
    actionTimeout: 5000,
    baseURL: 'http://localhost:5174',
  },
  webServer: {
    command: 'npm run dev',
    port: 5174,
    reuseExistingServer: true,
  },
});
