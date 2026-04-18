import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:     './e2e/tests',
  timeout:     60_000,
  retries:     process.env['CI'] ? 2 : 0,
  workers:     1,
  globalSetup:    './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL:    'http://localhost:5173',
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command:             'npm run dev',
      cwd:                 './frontend',
      url:                 'http://localhost:5173',
      reuseExistingServer: !process.env['CI'],
    },
    {
      command:             'npm run dev',
      cwd:                 './backend',
      url:                 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env['CI'],
    },
  ],
});
