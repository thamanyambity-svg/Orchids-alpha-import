import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Webhook Stripe — la seule source de vérité financière.
 *
 * Deux propriétés comptent ici, et une seule des deux se voit à l'œil nu :
 *
 *   1. une signature absente ou invalide ne doit rien écrire — sinon n'importe
 *      qui peut déclarer un paiement reçu ;
 *   2. un même événement rejoué ne doit pas être traité deux fois — Stripe
 *      réémet en cas de timeout, et un double traitement crée une seconde
 *      transaction pour un seul encaissement.
 *
 * La seconde est invisible en usage normal : elle ne se manifeste qu'au moment
 * d'un incident réseau, c'est-à-dire au pire moment.
 */

const constructEvent = vi.fn()
const insertProcessed = vi.fn()
const executeTransition = vi.fn((..._args: any[]) => Promise.resolve({ ok: true }))
const sendToN8N = vi.fn((..._args: any[]) => Promise.resolve())
let entetes: Record<string, string> = {}

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve({ get: (n: string) => entetes[n] ?? null }),
}))

vi.mock("stripe", () => ({
  default: class {
    webhooks = { constructEvent: (...a: any[]) => constructEvent(...a) }
  },
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        update: () => builder,
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (r: any) => Promise.resolve({ data: null, error: null }).then(r),
        insert: (payload: any) =>
          table === "processed_stripe_events"
            ? insertProcessed(payload)
            : Promise.resolve({ data: null, error: null }),
      }
      return builder
    },
  }),
}))

vi.mock("@/lib/workflow", () => ({ executeTransition: (...a: any[]) => executeTransition(...a) }))
vi.mock("@/lib/webhooks", () => ({ sendToN8N: (...a: any[]) => sendToN8N(...a) }))

process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
process.env.STRIPE_SECRET_KEY = "sk_test"

const { POST } = await import("./route")

function requete(corps = "{}") {
  return { text: () => Promise.resolve(corps) } as unknown as Request
}

const EVENEMENT = {
  id: "evt_test_1",
  type: "checkout.session.completed",
  data: { object: { metadata: {}, amount_total: 25000, currency: "usd" } },
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    entetes = { "stripe-signature": "sig_valide" }
    insertProcessed.mockResolvedValue({ error: null })
    constructEvent.mockReturnValue(EVENEMENT)
  })

  it("refuse une requête sans signature, sans rien écrire", async () => {
    entetes = {}

    const res = await POST(requete())

    expect(res.status).toBe(400)
    expect(insertProcessed).not.toHaveBeenCalled()
    expect(executeTransition).not.toHaveBeenCalled()
  })

  it("refuse une signature invalide, sans rien écrire", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature")
    })

    const res = await POST(requete())

    expect(res.status).toBe(400)
    expect(insertProcessed).not.toHaveBeenCalled()
    expect(executeTransition).not.toHaveBeenCalled()
  })

  it("réclame l'événement avant tout traitement", async () => {
    await POST(requete())

    // L'écriture d'idempotence doit précéder le traitement, sinon deux
    // exécutions concurrentes passent toutes les deux.
    expect(insertProcessed).toHaveBeenCalledWith(
      expect.objectContaining({ event_id: "evt_test_1", type: "checkout.session.completed" })
    )
  })

  it("acquitte sans retraiter un événement déjà vu", async () => {
    // 23505 = violation d'unicité : Stripe rejoue un événement déjà traité.
    insertProcessed.mockResolvedValue({ error: { code: "23505" } })

    const res = await POST(requete())

    expect(res.status).toBe(200)
    expect(executeTransition).not.toHaveBeenCalled()
    expect(sendToN8N).not.toHaveBeenCalled()
  })

  it("échoue bruyamment si le registre d'idempotence est en panne", async () => {
    // Ne surtout pas traiter « au cas où » : sans registre, on ne peut plus
    // garantir l'unicité. Un 500 fait rejouer Stripe plus tard.
    insertProcessed.mockResolvedValue({ error: { code: "08006", message: "connection failure" } })

    const res = await POST(requete())

    expect(res.status).toBe(500)
    expect(executeTransition).not.toHaveBeenCalled()
  })

  it("acquitte un paiement sans identifiant de commande au lieu de boucler", async () => {
    // Sans orderId il n'y a rien à rattacher. Renvoyer une erreur ferait
    // rejouer Stripe indéfiniment sur un événement qui ne passera jamais.
    constructEvent.mockReturnValue({
      ...EVENEMENT,
      id: "evt_sans_commande",
      data: { object: { metadata: {}, amount_total: 1000, currency: "usd" } },
    })

    const res = await POST(requete())

    expect(res.status).toBe(200)
    expect(executeTransition).not.toHaveBeenCalled()
  })
})
