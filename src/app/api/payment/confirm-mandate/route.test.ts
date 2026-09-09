import { describe, it, expect, vi, beforeEach } from "vitest"
import { makeRequest } from "@/test-utils/supabase-mock"

/**
 * Confirmation d'un mandat de prélèvement SEPA.
 *
 * L'étape rattache un compte bancaire à un profil. Le compte destinataire vient
 * de la session ; l'identifiant du SetupIntent vient du client. C'est ce
 * croisement qui doit tenir : le service vérifie que le SetupIntent appartient
 * bien au client Stripe du compte connecté — sans quoi il suffisait de
 * connaître l'identifiant d'un SetupIntent d'autrui pour rattacher son compte
 * bancaire au sien, puis se faire prélever dessus.
 *
 * Ces tests verrouillent le côté route : le titulaire n'est jamais celui que
 * désigne le corps de la requête, et un refus du service ne devient jamais un
 * succès.
 */

const requireUser = vi.fn()
const confirmerMandat = vi.fn((..._a: unknown[]) =>
  Promise.resolve({ paymentMethodId: "pm_1", lastFour: "0189", bic: "BNPAFRPP", mandateId: "mandate_1" })
)

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...args: any[]) => requireUser(...args) }
})
vi.mock("@/lib/payments/auto-debit.service", () => ({
  confirmDirectDebitMandate: (...a: unknown[]) => confirmerMandat(...a),
}))

const { POST } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const TITULAIRE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const INTRUS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const SETUP_INTENT = "seti_1AbCdEfGhIjKlMn"

function setup() {
  requireUser.mockResolvedValue({ user: { id: TITULAIRE }, role: "BUYER", supabase: {} })
}

describe("POST /api/payment/confirm-mandate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("exige une session", async () => {
    requireUser.mockRejectedValue(new ApiError(401, "Unauthorized"))

    const res = await POST(makeRequest({ setupIntentId: SETUP_INTENT }) as any)

    expect(res.status).toBe(401)
    expect(confirmerMandat).not.toHaveBeenCalled()
  })

  it("rattache au compte de la session, même si le corps en désigne un autre", async () => {
    setup()

    await POST(makeRequest({ setupIntentId: SETUP_INTENT, userId: INTRUS }) as any)

    expect(confirmerMandat).toHaveBeenCalledWith(TITULAIRE, SETUP_INTENT)
  })

  it("refuse une demande sans identifiant de SetupIntent", async () => {
    setup()

    expect((await POST(makeRequest({}) as any)).status).toBe(400)
    expect(confirmerMandat).not.toHaveBeenCalled()
  })

  it("refuse un identifiant qui n'a pas la forme d'un SetupIntent", async () => {
    setup()

    for (const valeur of ["pm_1", "cus_1", "seti", "", "../../etc", 42, null, {}]) {
      vi.clearAllMocks()
      setup()
      const res = await POST(makeRequest({ setupIntentId: valeur }) as any)
      expect(res.status, String(valeur)).toBe(400)
      expect(confirmerMandat, String(valeur)).not.toHaveBeenCalled()
    }
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
    expect(confirmerMandat).not.toHaveBeenCalled()
  })

  it("ne déclare pas un succès quand le service refuse le rattachement", async () => {
    // Cas réel : SetupIntent appartenant à un autre client Stripe.
    setup()
    confirmerMandat.mockRejectedValueOnce(
      new Error("SetupIntent does not belong to this account")
    )

    const res = await POST(makeRequest({ setupIntentId: SETUP_INTENT }) as any)

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.not.toMatchObject({ success: true })
  })

  it("ne renvoie que les quatre derniers chiffres, jamais l'IBAN", async () => {
    setup()

    const res = await POST(makeRequest({ setupIntentId: SETUP_INTENT }) as any)
    const corps = await res.json()

    expect(res.status).toBe(200)
    expect(corps.paymentMethod).toEqual({ id: "pm_1", lastFour: "0189", bic: "BNPAFRPP" })
    expect(JSON.stringify(corps)).not.toContain("mandate_1")
  })
})
