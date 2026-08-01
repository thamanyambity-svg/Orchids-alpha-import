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
// On échoue au démarrage plutôt qu'en caisse. La vérification ne s'applique
// qu'aux environnements réels — au build, STRIPE_SECRET_KEY est absente et le
// placeholder ci-dessus prend le relais.
const secretMode = keyMode(process.env.STRIPE_SECRET_KEY)
const publishableMode = keyMode(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

if (secretMode && publishableMode && secretMode !== publishableMode) {
  throw new Error(
    `Stripe keys are in different modes: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is ${publishableMode}, ` +
      `STRIPE_SECRET_KEY is ${secretMode}. Every payment would fail. ` +
      `Use a matching pair from the same Stripe environment.`
  )
}

export const stripe = new Stripe(apiKey, {
  apiVersion: '2026-02-25.clover' as any,
  typescript: true,
})
