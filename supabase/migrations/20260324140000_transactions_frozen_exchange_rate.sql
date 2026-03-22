-- Bloc F : taux gelé sur la transaction (affichage client FROZEN)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS exchange_rate_at_time numeric(24, 10),
  ADD COLUMN IF NOT EXISTS exchange_rate_id uuid REFERENCES public.exchange_rates(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.transactions.exchange_rate_at_time IS 'Taux USD→CDF figé au moment du paiement (immuable côté client).';
COMMENT ON COLUMN public.transactions.exchange_rate_id IS 'Ligne exchange_rates correspondant au taux figé.';
