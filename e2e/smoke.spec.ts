import { test, expect } from "@playwright/test"

test.describe("Smoke tests", () => {
  test("homepage loads and shows header", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("h1").first()).toBeVisible()
  })

  test("login page loads", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test("legal page loads", async ({ page }) => {
    await page.goto("/legal")
    await expect(page.locator("h1")).toBeVisible()
  })

  test("privacy page loads", async ({ page }) => {
    await page.goto("/privacy")
    await expect(page.locator("h1")).toBeVisible()
  })

  test("CGV page loads", async ({ page }) => {
    await page.goto("/cgv")
    await expect(page.locator("h1")).toBeVisible()
  })

  test("404 shows error page", async ({ page }) => {
    await page.goto("/nonexistent-page")
    await expect(page.locator("text=404")).toBeVisible()
  })
})
