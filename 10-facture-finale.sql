-- ============================================================================
-- Facture finale détaillée
-- ============================================================================
-- La facture finale reprend la pro forma acceptée et y ajoute droits et taxes
-- RDC, dédouanement, transport jusqu'à destination et commission. Chaque poste
-- est une ligne ; le client valide la facture (ce qui vaut signature du bon de
-- commande) ou la conteste, avant tout paiement.
-- ============================================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES public.purchase_orders(id),
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contest_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_request_type ON public.invoices (request_id, type);

-- Le client ne lit une facture qu'une fois émise : un brouillon peut encore changer.
DROP POLICY IF EXISTS "invoices_buyer" ON public.invoices;
CREATE POLICY "invoices_buyer" ON public.invoices
  FOR SELECT USING (
    status <> 'DRAFT'
    AND order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.import_requests ir ON o.request_id = ir.id
      WHERE ir.buyer_id = auth.uid()
    )
  );

-- La facture finale (qui porte la commission Alpha Import) relève de la seule
-- relation entre Alpha Import et son client : le partenaire ne la lit pas.
DROP POLICY IF EXISTS "invoices_partner" ON public.invoices;
CREATE POLICY "invoices_partner" ON public.invoices
  FOR SELECT USING (
    type <> 'FINAL'
    AND order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.import_requests ir ON o.request_id = ir.id
      WHERE ir.assigned_partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
    )
  );

NOTIFY pgrst, 'reload schema';

-- Contrôle 1 : 5 lignes (contest_reason, currency, lines, purchase_order_id, validated_at).
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invoices'
  AND column_name IN ('lines', 'currency', 'purchase_order_id', 'validated_at', 'contest_reason')
ORDER BY column_name;

-- Contrôle 2 : les deux règles, avec leur nouvelle condition.
SELECT policyname, qual FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname IN ('invoices_buyer', 'invoices_partner');
