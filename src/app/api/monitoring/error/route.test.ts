import { describe, it, expect, vi, beforeEach } from "vitest"
import { makeRequest } from "@/test-utils/supabase-mock"

/**
 * Remontée d'erreurs depuis le navigateur.
 *
 * C'est une entrée publique et non authentifiée — par nécessité : une erreur
 * survient souvent avant toute connexion, et c'est celle-là qu'on veut voir.
 * Elle doit donc être traitée comme n'importe quelle entrée hostile.
 *
 * Le point qui compte : ce que le navigateur envoie repasse par la rédaction
 * côté serveur. Sans cela, une page qui recopie l'URL courante dans son
 * message suffirait à écrire un jeton de session en clair dans la table des
 * incidents.
 */

const reportError = vi.fn((_erreur?: unknown, _contexte?: unknown) =>
  Promise.resolve({ enregistre: true, fingerprint: "f" })
)

vi.mock("@/lib/monitoring/report", () => ({
  reportError: (erreur: unknown, contexte?: unknown) => reportError(erreur, contexte),
}))

const { POST } = await import("./route")

function requete(corps: unknown, entetes: Record<string, string> = {}) {
  return makeRequest(corps, { headers: entetes }) as any
}

const VALIDE = { name: "TypeError", message: "impossible de lire 'status'" }

describe("POST /api/monitoring/error", () => {
  beforeEach(() => vi.clearAllMocks())

  it("accepte un incident recevable et répond 202", async () => {
    const res = await POST(requete(VALIDE))

    expect(res.status).toBe(202)
    expect(reportError).toHaveBeenCalledTimes(1)
  })

  it("marque la source comme navigateur, jamais comme serveur", async () => {
    // Confondre les deux rendrait le tableau de bord trompeur : on ne cherche
    // pas au même endroit selon l'origine.
    await POST(requete(VALIDE))

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ source: "client" })
    )
  })

  it("refuse une charge sans message", async () => {
    const res = await POST(requete({ name: "TypeError" }))

    expect(res.status).toBe(400)
    expect(reportError).not.toHaveBeenCalled()
  })

  it("refuse un corps qui n'est pas du JSON", async () => {
    const res = await POST({
      json: async () => {
        throw new SyntaxError("Unexpected token")
      },
      headers: { get: () => null },
    } as any)

    expect(res.status).toBe(400)
    expect(reportError).not.toHaveBeenCalled()
  })

  it("refuse un message démesuré au lieu de le tronquer en silence", async () => {
    const res = await POST(requete({ message: "a".repeat(5000) }))

    expect(res.status).toBe(400)
    expect(reportError).not.toHaveBeenCalled()
  })

  it("refuse une pile démesurée", async () => {
    const res = await POST(requete({ message: "x", stack: "a".repeat(20000) }))

    expect(res.status).toBe(400)
    expect(reportError).not.toHaveBeenCalled()
  })

  it("refuse un type inattendu à la place d'une chaîne", async () => {
    for (const charge of [{ message: 42 }, { message: null }, { message: { a: 1 } }, null, []]) {
      expect((await POST(requete(charge))).status).toBe(400)
    }
    expect(reportError).not.toHaveBeenCalled()
  })

  it("distingue une erreur fatale d'une erreur de page", async () => {
    await POST(requete({ ...VALIDE, fatal: true }))

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ level: "fatal" })
    )
  })

  it("traite une erreur ordinaire comme non fatale par défaut", async () => {
    await POST(requete(VALIDE))

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ level: "error" })
    )
  })

  it("conserve le digest, seul lien entre le signalement d'un utilisateur et l'incident", async () => {
    await POST(requete({ ...VALIDE, digest: "3641827394" }))

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ digest: "3641827394" })
    )
  })

  it("reconstruit une véritable Error, pour que message et pile soient rédigés", async () => {
    // C'est ce passage par redactError qui empêche un jeton envoyé par le
    // client d'atteindre la base.
    await POST(requete({ name: "RangeError", message: "hors bornes", stack: "RangeError: x" }))

    const [erreur] = reportError.mock.calls[0] as [Error, unknown]
    expect(erreur).toBeInstanceOf(Error)
    expect(erreur.name).toBe("RangeError")
    expect(erreur.stack).toBe("RangeError: x")
  })

  it("borne l'agent utilisateur transmis", async () => {
    await POST(requete(VALIDE, { "user-agent": "M".repeat(1000) }))

    const contexte = reportError.mock.calls[0]?.[1] as any
    expect(contexte.extra.userAgent.length).toBeLessThanOrEqual(300)
  })
})
