import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Conversion d'une erreur en réponse, et signalement à la supervision.
 *
 * Le point sensible est le tri. Une plateforme refuse des requêtes en
 * permanence — identifiant inconnu, droit manquant, saisie invalide — et ces
 * refus sont le fonctionnement normal, pas des incidents. Les rapporter
 * noierait les vraies défaillances sous des milliers de lignes de bruit, et la
 * supervision cesserait d'être lue.
 */

const reportError = vi.fn((_erreur?: unknown, _contexte?: unknown) =>
  Promise.resolve({ enregistre: true, fingerprint: "f" })
)

vi.mock("@/lib/monitoring/report", () => ({
  reportError: (erreur: unknown, contexte?: unknown) => reportError(erreur, contexte),
}))

const { handleApiError, ApiError } = await import("./auth-guard")

// `after` refuse hors contexte de requête : le repli synchrone doit prendre le
// relais, c'est ce chemin qui est éprouvé ici.
async function laisserPasserLeRapport() {
  await new Promise((r) => setTimeout(r, 0))
}

describe("handleApiError", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("ne rapporte pas un refus d'autorisation — c'est un fonctionnement normal", async () => {
    const res = handleApiError(new ApiError(403, "Forbidden"))
    await laisserPasserLeRapport()

    expect(res.status).toBe(403)
    expect(reportError).not.toHaveBeenCalled()
  })

  it("ne rapporte ni un 400, ni un 401, ni un 404", async () => {
    for (const status of [400, 401, 404, 409, 429]) {
      handleApiError(new ApiError(status, "refus"))
    }
    await laisserPasserLeRapport()

    expect(reportError).not.toHaveBeenCalled()
  })

  it("rapporte une erreur inattendue et répond 500 sans divulguer le détail", async () => {
    const res = handleApiError(new TypeError("lecture de undefined"))
    await laisserPasserLeRapport()

    expect(res.status).toBe(500)
    // Le message interne ne doit pas atteindre l'appelant.
    await expect(res.json()).resolves.toEqual({ error: "Internal Server Error" })
    expect(reportError).toHaveBeenCalledTimes(1)
  })

  it("rapporte une ApiError en 5xx — une panne annoncée reste une panne", async () => {
    handleApiError(new ApiError(503, "Service indisponible"))
    await laisserPasserLeRapport()

    expect(reportError).toHaveBeenCalledTimes(1)
  })

  it("transmet la route et la méthode quand l'appelant les fournit", async () => {
    handleApiError(new Error("échec"), { route: "/api/payments/process-sepa-debit", method: "POST" })
    await laisserPasserLeRapport()

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: "api",
        status: 500,
        route: "/api/payments/process-sepa-debit",
        method: "POST",
      })
    )
  })

  it("répond même si la supervision échoue — elle ne doit jamais casser la réponse", async () => {
    reportError.mockRejectedValueOnce(new Error("supervision hors service") as never)

    const res = handleApiError(new Error("échec"))
    await laisserPasserLeRapport()

    expect(res.status).toBe(500)
  })

  it("préserve le statut et le message métier d'une ApiError", async () => {
    const res = handleApiError(new ApiError(404, "Commande introuvable"))
    await expect(res.json()).resolves.toEqual({ error: "Commande introuvable" })
  })
})
