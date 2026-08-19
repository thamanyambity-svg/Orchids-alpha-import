import { test, expect } from "@playwright/test"

test.describe("Candidature partenaire", () => {
  test("le formulaire public de candidature se charge", async ({ page }) => {
    await page.goto("/partner-request")
    await expect(page.locator("h1, h2").first()).toBeVisible()
  })

  test("l'espace admin des partenaires exige une session", async ({ page }) => {
    const response = await page.goto("/admin/partners")
    // Non authentifié : le middleware redirige vers la connexion. On vérifie
    // qu'on n'atterrit pas sur la page admin.
    expect(page.url()).not.toContain("/admin/partners")
    expect(response?.status()).toBeLessThan(500)
  })
})
