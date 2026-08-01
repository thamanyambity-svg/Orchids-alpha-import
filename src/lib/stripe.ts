import Stripe from 'stripe'

// Fallback to a placeholder during build/static analysis if env var is missing
// This prevents "Neither apiKey nor config.authenticator provided" errors
const apiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_build'

/** 'live' | 'test' | null si la clé est absente ou d'un format inattendu. */
function keyMode(key: string | undefined): 'live' | 'test' | null {
  if (!key) return null
  if (key.includes('_live_')) return 'live'
  if (key.includes('_test_')) return 'test'
  return null
}

// Une clé publique live avec une clé secrète test (ou l'inverse) est silencieuse
// jusqu'au premier paiement : le navigateur crée l'intent dans un mode, le
// serveur le cherche dans l'autre, et Stripe répond "No such payment_intent".
// On préfère une erreur explicite.
//
// La vérification est différée au premier usage réel, pas faite à l'import :
// `next build` importe chaque route pour collecter les données de page, et une
// exception au chargement du module ferait échouer la compilation entière —
// y compris pour des routes qui ne touchent pas aux paiements.
function assertConsistentKeys() {
  const secretMode = keyMode(process.env.STRIPE_SECRET_KEY)
  const publishableMode = keyMode(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

  if (secretMode && publishableMode && secretMode !== publishableMode) {
    throw new Error(
      `Stripe keys are in different modes: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is ${publishableMode}, ` +
        `STRIPE_SECRET_KEY is ${secretMode}. Every payment would fail. ` +
        `Use a matching pair from the same Stripe environment.`
    )
  }
}

let client: Stripe | null = null

function getStripe(): Stripe {
  if (!client) {
    assertConsistentKeys()
    client = new Stripe(apiKey, {
      apiVersion: '2026-02-25.clover' as any,
      typescript: true,
    })
  }
  return client
}

// Proxy paresseux : les appels existants (`stripe.checkout.sessions.create`)
// restent inchangés, mais rien n'est construit ni vérifié tant qu'on n'y touche pas.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver)
  },
})
