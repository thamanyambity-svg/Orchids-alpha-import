import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Ouverture d'une session de paiement Stripe.
 *
 * La route décide du montant que le client va payer. Deux familles de fautes
 * comptent ici : facturer la mauvaise somme, et facturer deux fois.
 *
 * Le séquencement 60/40 porte la seconde : un acompte déjà réglé ne doit pas
 * pouvoir l'être à nouveau, et le solde ne doit pas pouvoir passer avant
 * l'acompte — sinon la marchandise est engagée sans avance.
 *
 * Chaque cas vérifie aussi que Stripe n'est pas appelé quand la règle échoue :
 * une session créée puis abandonnée laisse une trace de paiement côté client.
 */

const requireUser = vi.fn()
const creerSession = vi.fn((_params?: any) =>
  Promise.resolve({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" })
)

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...args: any[]) => requireUser(...args) }
})
vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: (params: any) => creerSession(params) } } },
}))

const { POST } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const COMMANDE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

function setup({
  visible = true,
  depositPaid = false,
  balancePaid = false,
  depositAmount = 1908.6,
  balanceAmount = 1272.4,
} = {}) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "orders") {
      return visible
        ? {
            data: {
              id: COMMANDE,
              reference: "CMD-2026-001",
              total_amount: 3181,
              deposit_amount: depositAmount,
              balance_amount: balanceAmount,
              deposit_paid: depositPaid,
              balance_paid: balancePaid,
            },
          }
        : { data: null, error: { message: "not found" } }
    }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: ACHETEUR }, role: "BUYER", supabase: mock.client })
  return mock
}

function chargeStripe() {
  return creerSession.mock.calls[0]?.[0] as any
}

describe("POST /api/stripe/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("exige une session — personne ne paie anonymement", async () => {
    requireUser.mockRejectedValue(new ApiError(401, "Unauthorized"))

    const res = await POST(makeRequest({ orderId: COMMANDE, paymentType: "DEPOSIT_60" }) as any)

    expect(res.status).toBe(401)
    expect(creerSession).not.toHaveBeenCalled()
  })

  it("renvoie 404 pour une commande que l'appelant ne voit pas", async () => {
    // La portée vient de RLS : un acheteur ne voit que ses commandes.
    setup({ visible: false })

    const res = await POST(makeRequest({ orderId: COMMANDE, paymentType: "DEPOSIT_60" }) as any)

    expect(res.status).toBe(404)
    expect(creerSession).not.toHaveBeenCalled()
  })

  it("refuse un identifiant de commande qui n'est pas un UUID", async () => {
    const mock = setup()

    const res = await POST(makeRequest({ orderId: "commande-1", paymentType: "DEPOSIT_60" }) as any)

    expect(res.status).toBe(400)
    expect(mock.lastOp("orders")).toBeUndefined()
    expect(creerSession).not.toHaveBeenCalled()
  })

  it("refuse un type de paiement hors nomenclature", async () => {
    setup()

    const res = await POST(makeRequest({ orderId: COMMANDE, paymentType: "TOTALITE" }) as any)

    expect(res.status).toBe(400)
    expect(creerSession).not.toHaveBeenCalled()
  })

  it("refuse de faire payer deux fois l'acompte", async () => {
    setup({ depositPaid: true })

    const res = await POST(makeRequest({ orderId: COMMANDE, paymentType: "DEPOSIT_60" }) as any)

    expect(res.status).toBe(400)
    expect(creerSession).not.toHaveBeenCalled()
  })

  it("refuse de faire payer deux fois le solde", async () => {
    setup({ depositPaid: true, balancePaid: true })

    const res = await POST(makeRequest({ orderId: COMMANDE, paymentType: "BALANCE_40" }) as any)

    expect(res.status).toBe(400)
    expect(creerSession).not.toHaveBeenCalled()
  })

  it("refuse le solde tant que l'acompte n'est pas réglé", async () => {
    // Sinon la marchandise est engagée sans avance.
    setup({ depositPaid: false })

    const res = await POST(makeRequest({ orderId: COMMANDE, paymentType: "BALANCE_40" }) as any)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/deposit must be paid/i),
    })
    expect(creerSession).not.toHaveBeenCalled()
  })

  it("facture l'acompte au montant de l'acompte, pas au total", async () => {
    setup({ depositAmount: 1908.6, balanceAmount: 1272.4 })

    await POST(makeRequest({ orderId: COMMANDE, paymentType: "DEPOSIT_60" }) as any)

    expect(chargeStripe().line_items[0].price_data.unit_amount).toBe(190860)
  })

  it("facture le solde au montant du solde", async () => {
    setup({ depositPaid: true, depositAmount: 1908.6, balanceAmount: 1272.4 })

    await POST(makeRequest({ orderId: COMMANDE, paymentType: "BALANCE_40" }) as any)

    expect(chargeStripe().line_items[0].price_data.unit_amount).toBe(127240)
  })

  it("arrondit au centime au lieu de tronquer", async () => {
    // 1908.605 € tronqué ferait perdre un centime à chaque commande.
    setup({ depositAmount: 1908.605 })

    await POST(makeRequest({ orderId: COMMANDE, paymentType: "DEPOSIT_60" }) as any)

    expect(chargeStripe().line_items[0].price_data.unit_amount).toBe(190861)
  })

  it("refuse un montant nul ou négatif au lieu de créer une session vide", async () => {
    for (const montant of [0, -10]) {
      vi.clearAllMocks()
      setup({ depositAmount: montant })

      const res = await POST(makeRequest({ orderId: COMMANDE, paymentType: "DEPOSIT_60" }) as any)

      expect(res.status).toBe(400)
      expect(creerSession).not.toHaveBeenCalled()
    }
  })

  it("refuse un montant non numérique", async () => {
    setup({ depositAmount: NaN })

    const res = await POST(makeRequest({ orderId: COMMANDE, paymentType: "DEPOSIT_60" }) as any)

    expect(res.status).toBe(400)
    expect(creerSession).not.toHaveBeenCalled()
  })

  it("attache la commande et le type de paiement aux métadonnées", async () => {
    // C'est par ces métadonnées que le webhook rattache le paiement : sans
    // elles, l'argent arrive sans qu'on sache à quelle commande l'imputer.
    setup()

    await POST(makeRequest({ orderId: COMMANDE, paymentType: "DEPOSIT_60" }) as any)

    expect(chargeStripe().metadata).toMatchObject({
      orderId: COMMANDE,
      paymentType: "DEPOSIT_60",
      orderReference: "CMD-2026-001",
    })
  })

  it("renvoie l'adresse de paiement et l'identifiant de session", async () => {
    setup()

    const res = await POST(makeRequest({ orderId: COMMANDE, paymentType: "DEPOSIT_60" }) as any)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      url: "https://checkout.stripe.com/c/pay/cs_1",
      sessionId: "cs_1",
    })
  })

  it("ne maquille pas un échec Stripe en succès", async () => {
    setup()
    creerSession.mockRejectedValueOnce(new Error("Stripe indisponible"))

    const res = await POST(makeRequest({ orderId: COMMANDE, paymentType: "DEPOSIT_60" }) as any)

    expect(res.status).toBe(500)
  })
})
