-- Sprint Admin — Fondations financières
-- Tables: exchange_rates, payment_proofs, document_access_logs

-- -----------------------------------------------------------------------------
-- Taux de change (base USD obligatoire)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL DEFAULT 'USD',
  to_currency text NOT NULL,
  rate numeric(24, 10) NOT NULL CHECK (rate > 0),
  effective_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exchange_rates_from_usd CHECK (from_currency = 'USD')
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_to_created
  ON public.exchange_rates (to_currency, created_at DESC);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exchange_rates_admin_all" ON public.exchange_rates;
CREATE POLICY "exchange_rates_admin_all" ON public.exchange_rates
  FOR ALL USING (public.get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- Preuves de paiement (hors Stripe)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_bucket text NOT NULL DEFAULT 'documents',
  file_path text NOT NULL,
  file_name text,
  amount_claimed numeric(18, 2),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'PENDING_REVIEW'
    CHECK (status IN ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON public.payment_proofs (status);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_order ON public.payment_proofs (order_id);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_proofs_buyer_own" ON public.payment_proofs;
CREATE POLICY "payment_proofs_buyer_own" ON public.payment_proofs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "payment_proofs_buyer_insert" ON public.payment_proofs;
CREATE POLICY "payment_proofs_buyer_insert" ON public.payment_proofs
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "payment_proofs_admin_all" ON public.payment_proofs;
CREATE POLICY "payment_proofs_admin_all" ON public.payment_proofs
  FOR ALL USING (public.get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- Journal d'accès documents (immutable — pas de UPDATE/DELETE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  document_type text NOT NULL,
  document_id uuid NOT NULL,
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_access_logs_created ON public.document_access_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_admin ON public.document_access_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_doc ON public.document_access_logs (document_type, document_id);

ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_access_logs_admin_select" ON public.document_access_logs;
CREATE POLICY "document_access_logs_admin_select" ON public.document_access_logs
  FOR SELECT USING (public.get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "document_access_logs_admin_insert" ON public.document_access_logs;
CREATE POLICY "document_access_logs_admin_insert" ON public.document_access_logs
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'ADMIN'
    AND admin_id = auth.uid()
  );

COMMENT ON TABLE public.document_access_logs IS 'Immutable audit trail for sensitive document access (e.g. signed URLs). No UPDATE/DELETE policies.';

-- -----------------------------------------------------------------------------
-- Admin peut créer des notifications pour un autre utilisateur (preuves paiement)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_admin_insert" ON public.notifications;
CREATE POLICY "notifications_admin_insert" ON public.notifications
  FOR INSERT WITH CHECK (public.get_user_role() = 'ADMIN');
