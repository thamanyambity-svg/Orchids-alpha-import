-- Reporting & Audit — Alpha Import Exchange
-- Module : Traçabilité Opérations & Clients
-- Table  : alpha_transactions

-- ──────────────────────────────────────────────────────────────────────────────
-- Table principale
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.alpha_transactions (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Bloc 1 : Identification & Traçabilité
  uid               text         NOT NULL UNIQUE
                                 CONSTRAINT alpha_tx_uid_format
                                   CHECK (uid ~ '^AI-[0-9]{4}-TR-[0-9]{3}$'),
  client_reference  text         NOT NULL CHECK (char_length(client_reference) BETWEEN 2 AND 100),
  -- Link to the authenticated user owning this transaction (optional — may be null for legacy data)
  client_user_id    uuid         REFERENCES public.profiles(id) ON DELETE SET NULL,
  iso_timestamp     timestamptz  NOT NULL,

  -- Bloc 2 : Origine & Destination
  pol               text         NOT NULL CHECK (char_length(pol) >= 3),
  pod               text         NOT NULL CHECK (char_length(pod) >= 3),
  incoterm          text         NOT NULL CHECK (incoterm IN ('FOB','CIF','EXW','DDP','DAP','CFR')),

  -- Bloc 3 : Financier
  value_fob         numeric(18,2) NOT NULL CHECK (value_fob > 0),
  alpha_commission  numeric(18,2) NOT NULL CHECK (alpha_commission >= 0),
  total_value       numeric(18,2) NOT NULL GENERATED ALWAYS AS (value_fob + alpha_commission) STORED,
  deposit60         numeric(18,2) NOT NULL GENERATED ALWAYS AS ((value_fob + alpha_commission) * 0.60) STORED,
  balance40         numeric(18,2) NOT NULL GENERATED ALWAYS AS ((value_fob + alpha_commission) * 0.40) STORED,
  currency          text         NOT NULL DEFAULT 'USD'
                                 CHECK (currency IN ('USD','EUR','AED','CNY','CDF')),
  deposit_status    text         NOT NULL DEFAULT 'En attente'
                                 CHECK (deposit_status IN ('Payé','En attente','Partiellement payé','Annulé')),
  balance_status    text         NOT NULL DEFAULT 'En attente'
                                 CHECK (balance_status IN ('Payé','En attente','Partiellement payé','Annulé')),

  -- Bloc 4 : Opérationnel
  current_step      text         NOT NULL DEFAULT 'Assignation'
                                 CHECK (current_step IN ('Assignation','Validation','Exécution','En transit','Dédouanement','Livraison','Clôturé')),
  responsible_agent text         NOT NULL CHECK (char_length(responsible_agent) >= 2),
  tracking_number   text         NOT NULL DEFAULT '',

  -- Bloc 5 : Risques & Alertes
  priority          text         NOT NULL DEFAULT 'Normal'
                                 CHECK (priority IN ('Normal','Urgent','Critique')),
  incident_log      text         NOT NULL DEFAULT 'RAS'
                                 CHECK (char_length(incident_log) <= 500),

  -- Méta
  client_visible    boolean      NOT NULL DEFAULT false,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alpha_tx_uid           ON public.alpha_transactions (uid);
CREATE INDEX IF NOT EXISTS idx_alpha_tx_client_ref    ON public.alpha_transactions (client_reference);
CREATE INDEX IF NOT EXISTS idx_alpha_tx_client_user   ON public.alpha_transactions (client_user_id);
CREATE INDEX IF NOT EXISTS idx_alpha_tx_step          ON public.alpha_transactions (current_step);
CREATE INDEX IF NOT EXISTS idx_alpha_tx_priority      ON public.alpha_transactions (priority);
CREATE INDEX IF NOT EXISTS idx_alpha_tx_visible       ON public.alpha_transactions (client_visible);
CREATE INDEX IF NOT EXISTS idx_alpha_tx_created       ON public.alpha_transactions (created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_alpha_tx_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alpha_tx_updated_at ON public.alpha_transactions;
CREATE TRIGGER trg_alpha_tx_updated_at
  BEFORE UPDATE ON public.alpha_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_alpha_tx_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.alpha_transactions ENABLE ROW LEVEL SECURITY;

-- ADMIN : full access
DROP POLICY IF EXISTS "alpha_tx_admin_all" ON public.alpha_transactions;
CREATE POLICY "alpha_tx_admin_all" ON public.alpha_transactions
  FOR ALL
  USING (public.get_user_role() = 'ADMIN');

-- CLIENT : read own visible transactions only
DROP POLICY IF EXISTS "alpha_tx_client_select" ON public.alpha_transactions;
CREATE POLICY "alpha_tx_client_select" ON public.alpha_transactions
  FOR SELECT
  USING (
    client_visible = true
    AND client_user_id = auth.uid()
  );
