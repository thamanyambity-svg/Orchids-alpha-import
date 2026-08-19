import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  // La première visite d'une route compile la page côté serveur dev : compter
  // large, sinon les tests échouent sur la compilation et non sur l'application.
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Le chromium livré par Playwright ne tourne pas sur macOS 13 : y poser
        // PLAYWRIGHT_CHANNEL=chrome pour utiliser le Chrome installé.
        channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
      },
    },
  ],
})
