import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, actionTimeout: 15_000, navigationTimeout: 30_000, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: `npx tsx scripts/e2e-reset.ts && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/search?q=hanoi`,
    timeout: 600_000,
    reuseExistingServer: !!process.env.E2E_REUSE,
    env: { DATABASE_PATH: "data/e2e.db", UPLOADS_DIR: "data/e2e-uploads", NEXT_DIST_DIR: ".next-e2e", NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`, INSECURE_COOKIES: "1" },
  },
});
