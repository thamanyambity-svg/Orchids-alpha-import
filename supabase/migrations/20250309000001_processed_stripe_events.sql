-- =============================================================================
-- Idempotence des webhooks Stripe
-- Migration: 20250309000001
-- Description: Empêche le double-traitement d'un même événement Stripe (retries).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  event_id text PRIMARY KEY,        -- id de l'événement Stripe (evt_...)
  type text,                        -- type d'événement (ex: checkout.session.completed)
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- RLS activé sans policy : table réservée au service role (webhook).
-- Tout accès via client anon/authentifié est ainsi refusé.
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;
