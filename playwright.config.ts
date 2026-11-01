import { defineConfig, devices } from '@playwright/test';

const MAIN_PORT = 4173;
const ALT_PORT = 4174;
const STARTUP_TIMEOUT_MS = 120000;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${MAIN_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `npx vite build && npx vite preview --host 127.0.0.1 --port ${MAIN_PORT} --strictPort`,
      url: `http://127.0.0.1:${MAIN_PORT}`,
      reuseExistingServer: false,
      timeout: STARTUP_TIMEOUT_MS,
    },
    {
      command: `npx vite build --mode altdata --outDir dist-alt && npx vite preview --outDir dist-alt --host 127.0.0.1 --port ${ALT_PORT} --strictPort`,
      url: `http://127.0.0.1:${ALT_PORT}`,
      reuseExistingServer: false,
      timeout: STARTUP_TIMEOUT_MS,
    },
  ],
});
