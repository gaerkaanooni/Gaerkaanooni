import { defineConfig } from '@playwright/test'

const dbUrl = process.env.DATABASE_URL_TEST ?? 'postgresql://anmoldureha@localhost:5432/pil_promax_test'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: dbUrl,
      AUTH_SECRET: process.env.AUTH_SECRET ?? 'test-only-secret-not-for-production',
      AUTH_TRUST_HOST: 'true',
    },
  },
})
