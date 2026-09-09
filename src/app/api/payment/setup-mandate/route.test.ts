import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Création d'un mandat de prélèvement SEPA.
 *
 * La règle qui prime : le compte auquel le mandat est rattaché vient de la
 * session, jamais du corps de la requête. Si l'appelant pouvait désigner le
 * titulaire, il rattacherait son propre IBAN au compte d'un tiers — ou celui
 * d'un tiers au sien.
 *
 * Ensuite vient la validation de l'IBAN. Elle est faite ici, avant Stripe, non
 * par méfiance envers Stripe mais parce qu'un IBAN mal formé accepté à ce stade
 * produit un mandat inutilisable qui n'échouera qu'au moment du prélèvement,
 * c'est-à-dire au pire moment.
 */

const requireUser = vi.fn()
const setupMandat = vi.fn((..._a: unknown[]) =>
  Promise.resolve({ clientSecret: "seti_1_secret_x", customerId: "cus_1" })
)

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...args: any[]) => requireUser(...args) }
})
vi.mock("@/lib/payments/auto-debit.service", () => ({
  setupDirectDebitMandate: (...a: unknown[]) => setupMandat(...a),
}))

const { POST } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const TITULAIRE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const IBAN = "FR7630006000011234567890189"
const BIC = "BNPAFRPP"

function setup({ profil = { email: "titulaire@exemple.fr", full_name: "Titulaire" } as any } = {}) {
  const mock = createSupabaseMock((op) =>
    op.table === "profiles" ? { data: profil } : { data: null }
  )
  requireUser.mockResolvedValue({
    user: { id: TITULAIRE, email: "session@exemple.fr" },
    role: "BUYER",
    supabase: mock.client,
  })
  return mock
}

function requete(corps: unknown, entetes: Record<string, string> = {}) {
  return makeRequest(corps, { headers: entetes }) as any
}

describe("POST /api/payment/setup-mandate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("exige une session", async () => {
    requireUser.mockRejectedValue(new ApiError(401, "Unauthorized"))

    const res = await POST(requete({ iban: IBAN, bic: BIC }))

    expect(res.status).toBe(401)
    expect(setupMandat).not.toHaveBeenCalled()
  })

  it("rattache le mandat au compte de la session, jamais à celui du corps", async () => {
    // Tentative explicite de désigner quelqu'un d'autre.
    setup()

    await POST(requete({ iban: IBAN, bic: BIC, userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }))

    expect(setupMandat.mock.calls[0]?.[0]).toBe(TITULAIRE)
  })

  it("refuse une demande sans IBAN", async () => {
    setup()

    expect((await POST(requete({ bic: BIC }))).status).toBe(400)
    expect(setupMandat).not.toHaveBeenCalled()
  })

  it("refuse une demande sans BIC", async () => {
    setup()

    expect((await POST(requete({ iban: IBAN }))).status).toBe(400)
    expect(setupMandat).not.toHaveBeenCalled()
  })

  it("refuse un IBAN dont la clé de contrôle est fausse", async () => {
    // MOD-97 : un chiffre changé doit suffire à le rejeter.
    setup()

    const res = await POST(requete({ iban: "FR7630006000011234567890188", bic: BIC }))

    expect(res.status).toBe(400)
    expect(setupMandat).not.toHaveBeenCalled()
  })

  it("refuse un IBAN trop court", async () => {
    setup()

    expect((await POST(requete({ iban: "FR76", bic: BIC }))).status).toBe(400)
    expect(setupMandat).not.toHaveBeenCalled()
  })

  it("refuse un BIC mal formé", async () => {
    // « PASUNBIC » serait accepté : 4 lettres + 2 lettres + 2 alphanumériques
    // est exactement la forme d'un BIC. Les cas ci-dessous ne le sont pas.
    setup()

    for (const bic of ["BNP", "BNPAFRP", "BNPA1RPP", "bnpafrpp!"]) {
      vi.clearAllMocks()
      setup()
      expect((await POST(requete({ iban: IBAN, bic }))).status, bic).toBe(400)
      expect(setupMandat, bic).not.toHaveBeenCalled()
    }
  })

  it("ne renvoie jamais l'IBAN dans le message d'erreur", async () => {
    // Le message part dans les journaux du navigateur et dans la supervision.
    setup()

    const res = await POST(requete({ iban: "FR7630006000011234567890188", bic: BIC }))
    const corps = JSON.stringify(await res.json())

    expect(corps).not.toContain("1234567890188")
  })

  it("refuse quand le profil est introuvable", async () => {
    setup({ profil: null })

    expect((await POST(requete({ iban: IBAN, bic: BIC }))).status).toBe(404)
    expect(setupMandat).not.toHaveBeenCalled()
  })

  it("retient la première adresse de la chaîne de relais pour le mandat", async () => {
    // L'adresse est une mention obligatoire du mandat SEPA : prendre un relais
    // interne à la place du client rendrait le mandat contestable.
    setup()

    await POST(requete({ iban: IBAN, bic: BIC }, { "x-forwarded-for": "203.0.113.8, 10.0.0.1" }))

    expect(setupMandat.mock.calls[0]?.[5]).toBe("203.0.113.8")
  })

  it("renvoie le secret client sans exposer autre chose du SetupIntent", async () => {
    setup()

    const res = await POST(requete({ iban: IBAN, bic: BIC }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      clientSecret: "seti_1_secret_x",
      customerId: "cus_1",
    })
  })

  it("répond 400 et non 500 sur un corps illisible", async () => {
    setup()

    const res = await POST({
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input")
      },
      headers: { get: () => null },
    } as any)

    expect(res.status).toBe(400)
    expect(setupMandat).not.toHaveBeenCalled()
  })

  it("ne maquille pas un échec Stripe en succès", async () => {
    setup()
    setupMandat.mockRejectedValueOnce(new Error("Stripe refuse l'IBAN"))

    expect((await POST(requete({ iban: IBAN, bic: BIC }))).status).toBe(500)
  })
})
