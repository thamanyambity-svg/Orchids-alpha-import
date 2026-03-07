import Stripe from 'stripe'

// Fallback to a placeholder during build/static analysis if env var is missing
// This prevents "Neither apiKey nor config.authenticator provided" errors
const apiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_build'

export const stripe = new Stripe(apiKey, {
  // @ts-ignore
  apiVersion: '2025-12-15.clover' || '2026-02-25.clover',
  typescript: true,
})
