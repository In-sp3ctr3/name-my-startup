import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/playwright",
  timeout: 45_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure"
  },
  webServer: {
    command:
      "DATABASE_URL= ALLOW_IN_MEMORY_STORE=true ENABLE_DEV_PAYMENT_FIXTURE=true ANON_SESSION_SECRET=playwright-anon-session-secret OPENAI_API_KEY= NEXT_PUBLIC_E2E_DISABLE_CLERK=true NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= CLERK_SECRET_KEY= NEXT_PUBLIC_CLERK_SIGN_IN_URL= NEXT_PUBLIC_CLERK_SIGN_UP_URL= npx pnpm@10.18.3 dev --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] }
    }
  ]
});
