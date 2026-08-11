import { defineConfig, devices } from '@playwright/test';

/**
 * Levels 1 and 2 of the testing hierarchy in docs/TESTING.md: smoke and
 * functional. Both run against a real browser, on a phone-sized viewport,
 * because that is where this app actually gets used.
 */
const PORT = Number(process.env.PORT ?? 3100);
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'phone',
      use: {
        ...devices['Pixel 7'],
        // Some CI images ship their own Chromium. Point at it with
        // PLAYWRIGHT_CHROMIUM_PATH instead of downloading a second copy.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],

  // Skipped when BASE_URL points at a deployed environment.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `npx next start --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
