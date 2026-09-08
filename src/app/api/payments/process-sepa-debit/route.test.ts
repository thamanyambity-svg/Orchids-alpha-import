import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Prélèvement SEPA — la route qui sort réellement l'argent du compte bancaire.
 *
 * Elle ne vérifiait que la présence d'une session, puis passait l'orderId reçu
 * à un service qui lit la commande avec la clé de service, par identifiant
 * seul, et débite le moyen de paiement enregistré de son acheteur. Un compte
 * authentifié quelconque pouvait donc débiter le compte d'un autre.
 *
 * Ces tests verrouillent la correction : personne ne débite une commande qui
 * n'est pas la sienne, et le service n'est jamais atteint quand l'autorisation
 * échoue — c'est ce dernier point qui compte, puisque c'est lui qui appelle
 * Stripe.
 */

const requireUser = vi.fn()
const processAutomaticDebit = vi.fn((..._args: any[]) =>
  Promise.resolve({ paymentIntentId: "pi_1", status: "succeeded", amount: 190800 })
)

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...args: any[]) => requireUser(...args) }
})
vi.mock("@/lib/payments/auto-debit.service", () => ({
  processAutomaticDebit: (...args: any[]) => processAutomaticDebit(...args),
}))

const { POST } = await import("./route")

const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const INTRUS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const COMMANDE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

function setup({
  buyerId = ACHETEUR,
  utilisateur = ACHETEUR,
  role = "BUYER",
  commandeVisible = true,
} = {}) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "orders") {
      return commandeVisible
        ? { data: { id: COMMANDE, request: { buyer_id: buyerId } } }
        : { data: null }
    }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: utilisateur }, role, supabase: mock.client })
  return mock
}

const charge = { orderId: COMMANDE, paymentType: "DEPOSIT_60" }

describe("POST /api/payments/process-sepa-debit", () => {
  beforeEach(() => vi.clearAllMocks())

  it("refuse de débiter la commande d'un autre acheteur", async () => {
    setup({ buyerId: ACHETEUR, utilisateur: INTRUS })

    const res = await POST(makeRequest(charge) as any)

    expect(res.status).toBe(403)
    expect(processAutomaticDebit).not.toHaveBeenCalled()
  })

  it("renvoie 404 sans distinguer commande absente et commande d'autrui", async () => {
    // Distinguer les deux ferait de la réponse un moyen d'énumérer les
    // commandes existantes.
    setup({ commandeVisible: false })

    const res = await POST(makeRequest(charge) as any)

    expect(res.status).toBe(404)
    expect(processAutomaticDebit).not.toHaveBeenCalled()
  })

  it("refuse un identifiant de commande qui n'est pas un UUID", async () => {
    const mock = setup()

    const res = await POST(makeRequest({ ...charge, orderId: "commande-1" }) as any)

    expect(res.status).toBe(400)
    expect(mock.lastOp("orders")).toBeUndefined()
    expect(processAutomaticDebit).not.toHaveBeenCalled()
  })

  it("refuse un type de paiement hors nomenclature", async () => {
    // Sans cette garde, tout ce qui n'était pas DEPOSIT_60 tombait sur 40 %.
    setup()

    const res = await POST(makeRequest({ orderId: COMMANDE, paymentType: "TOTALITE" }) as any)

    expect(res.status).toBe(400)
    expect(processAutomaticDebit).not.toHaveBeenCalled()
  })

  it("refuse une charge vide", async () => {
    setup()

    const res = await POST(makeRequest({}) as any)

    expect(res.status).toBe(400)
    expect(processAutomaticDebit).not.toHaveBeenCalled()
  })

  it("débite l'acompte à 60 % pour l'acheteur de la commande", async () => {
    setup()

    const res = await POST(makeRequest(charge) as any)

    expect(res.status).toBe(200)
    expect(processAutomaticDebit).toHaveBeenCalledWith(COMMANDE, 0.6)
    await expect(res.json()).resolves.toMatchObject({ success: true, status: "succeeded" })
  })

  it("débite le solde à 40 % et non 60", async () => {
    setup()

    await POST(makeRequest({ orderId: COMMANDE, paymentType: "BALANCE_40" }) as any)

    expect(processAutomaticDebit).toHaveBeenCalledWith(COMMANDE, 0.4)
  })

  it("laisse un administrateur débiter pour une relance manuelle", async () => {
    setup({ buyerId: ACHETEUR, utilisateur: INTRUS, role: "ADMIN" })

    const res = await POST(makeRequest(charge) as any)

    expect(res.status).toBe(200)
    expect(processAutomaticDebit).toHaveBeenCalled()
  })

  it("ne déclare pas un succès quand Stripe laisse le paiement en attente", async () => {
    setup()
    processAutomaticDebit.mockResolvedValueOnce({
      paymentIntentId: "pi_2",
      status: "processing",
      amount: 190800,
    })

    const res = await POST(makeRequest(charge) as any)

    await expect(res.json()).resolves.toMatchObject({ success: false, status: "processing" })
  })
})
