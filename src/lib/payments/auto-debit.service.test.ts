import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Confirmation d'un mandat de prélèvement SEPA.
 *
 * L'étape attache un moyen de paiement — donc un compte bancaire — à un profil.
 * Elle ne vérifiait que le statut du SetupIntent, jamais son appartenance :
 * quiconque obtenait l'identifiant d'un SetupIntent d'autrui pouvait rattacher
 * le compte bancaire d'un tiers au sien, puis se faire prélever dessus.
 *
 * Ces tests verrouillent le lien entre le SetupIntent et le client Stripe du
 * compte, et vérifient surtout qu'aucune écriture n'a lieu quand il est rompu.
 */

const retrieveSetupIntent = vi.fn()
const retrievePaymentMethod = vi.fn()
const updateProfil = vi.fn((_payload?: any) => ({ eq: () => Promise.resolve({ error: null }) }))
const selectProfil = vi.fn()

vi.mock("stripe", () => ({
  default: class {
    setupIntents = { retrieve: (...a: any[]) => retrieveSetupIntent(...a) }
    paymentMethods = { retrieve: (...a: any[]) => retrievePaymentMethod(...a) }
    customers = { create: vi.fn() }
  },
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => selectProfil() }),
      }),
      update: (payload: any) => updateProfil(payload),
    }),
  }),
}))

process.env.STRIPE_SECRET_KEY = "sk_test"

const { confirmDirectDebitMandate } = await import("./auto-debit.service")

const UTILISATEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const CLIENT_STRIPE = "cus_legitime"
const SETUP_INTENT = "seti_123"

function stripeRepond({
  status = "succeeded",
  customer = CLIENT_STRIPE as string | null,
} = {}) {
  retrieveSetupIntent.mockResolvedValue({
    id: SETUP_INTENT,
    status,
    customer,
    payment_method: "pm_1",
    mandate: "mandate_1",
  })
  retrievePaymentMethod.mockResolvedValue({
    id: "pm_1",
    sepa_debit: { last4: "3000", bank_code: "DEUTDEFF" },
  })
}

describe("confirmDirectDebitMandate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectProfil.mockResolvedValue({ data: { stripe_customer_id: CLIENT_STRIPE }, error: null })
    updateProfil.mockReturnValue({ eq: () => Promise.resolve({ error: null }) })
  })

  it("refuse un SetupIntent appartenant à un autre client Stripe", async () => {
    stripeRepond({ customer: "cus_victime" })

    await expect(confirmDirectDebitMandate(UTILISATEUR, SETUP_INTENT)).rejects.toThrow(
      /does not belong/i
    )
    expect(updateProfil).not.toHaveBeenCalled()
  })

  it("refuse un SetupIntent sans client rattaché", async () => {
    stripeRepond({ customer: null })

    await expect(confirmDirectDebitMandate(UTILISATEUR, SETUP_INTENT)).rejects.toThrow(
      /does not belong/i
    )
    expect(updateProfil).not.toHaveBeenCalled()
  })

  it("refuse un compte sans client Stripe, plutôt que d'en inventer un", async () => {
    stripeRepond()
    selectProfil.mockResolvedValue({ data: { stripe_customer_id: null }, error: null })

    await expect(confirmDirectDebitMandate(UTILISATEUR, SETUP_INTENT)).rejects.toThrow(
      /No Stripe customer/i
    )
    expect(updateProfil).not.toHaveBeenCalled()
  })

  it("refuse un SetupIntent non confirmé, avant toute lecture de profil", async () => {
    stripeRepond({ status: "requires_action" })

    await expect(confirmDirectDebitMandate(UTILISATEUR, SETUP_INTENT)).rejects.toThrow(
      /not confirmed/i
    )
    expect(updateProfil).not.toHaveBeenCalled()
  })

  it("attache le mandat quand le SetupIntent appartient bien au compte", async () => {
    stripeRepond()

    const resultat = await confirmDirectDebitMandate(UTILISATEUR, SETUP_INTENT)

    expect(resultat).toMatchObject({
      success: true,
      paymentMethodId: "pm_1",
      mandateId: "mandate_1",
      lastFour: "3000",
    })
    expect(updateProfil).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_payment_method_id: "pm_1",
        stripe_mandate_id: "mandate_1",
        mandate_activated: true,
        iban_last4: "3000",
      })
    )
  })

  it("n'enregistre jamais l'IBAN complet, seulement ses quatre derniers chiffres", async () => {
    stripeRepond()

    await confirmDirectDebitMandate(UTILISATEUR, SETUP_INTENT)

    const charge = (updateProfil.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>
    const valeurs = JSON.stringify(charge)
    expect(valeurs).toContain("3000")
    expect(Object.keys(charge)).not.toContain("iban")
  })
})
