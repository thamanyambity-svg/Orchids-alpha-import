-- =============================================================================
-- Bloc J — Système de facturation douanière
-- Dépendances : customs_files, customs_tax_lines, customs_declarations,
--               profiles, exchange_rates
-- =============================================================================

-- ─── Enum : statuts de facture ────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'DRAFT',
    'SENT',
    'PAID',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Enum : nature d'une ligne de facture ─────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE invoice_item_type AS ENUM (
    'DISBURSEMENT',
    'SERVICE_FEE',
    'FILE_FEE',
    'TRANSPORT_FEE',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Table : customs_invoices (avant la fonction qui la référence) ────────────

CREATE TABLE IF NOT EXISTS public.customs_invoices (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  customs_file_id  UUID         NOT NULL
                   REFERENCES public.customs_files(id)
                   ON DELETE RESTRICT,

  invoice_number   TEXT         UNIQUE NOT NULL,
  status           invoice_status NOT NULL DEFAULT 'DRAFT',

  billed_to_user_id UUID        NOT NULL
                    REFERENCES public.profiles(id)
                    ON DELETE RESTRICT,

  subtotal_disbursements_usd  NUMERIC(14,4) NOT NULL DEFAULT 0
    CONSTRAINT chk_subtotal_disb_positive CHECK (subtotal_disbursements_usd >= 0),

  subtotal_fees_usd           NUMERIC(14,4) NOT NULL DEFAULT 0
    CONSTRAINT chk_subtotal_fees_positive CHECK (subtotal_fees_usd >= 0),

  total_usd                   NUMERIC(14,4) NOT NULL DEFAULT 0
    CONSTRAINT chk_total_positive CHECK (total_usd >= 0),

  exchange_rate_id            UUID
                              REFERENCES public.exchange_rates(id)
                              ON DELETE RESTRICT,
  total_local                 NUMERIC(18,2),
  currency_local              TEXT         DEFAULT 'CDF',

  issued_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  due_date    TIMESTAMPTZ  NOT NULL
    CONSTRAINT chk_due_after_issued CHECK (due_date >= issued_at),
  paid_at     TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  generated_by  UUID  REFERENCES public.profiles(id),
  notes         TEXT,

  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_one_active_invoice_per_file
    EXCLUDE USING btree (customs_file_id WITH =)
    WHERE (status IS DISTINCT FROM 'CANCELLED'::invoice_status)
);

CREATE INDEX IF NOT EXISTS idx_invoices_customs_file
  ON public.customs_invoices(customs_file_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON public.customs_invoices(status);

CREATE INDEX IF NOT EXISTS idx_invoices_billed_to
  ON public.customs_invoices(billed_to_user_id);

CREATE INDEX IF NOT EXISTS idx_invoices_issued_at
  ON public.customs_invoices(issued_at DESC);

-- ─── Numéro de facture INV-YYYY-NNNN (comptage annuel, non séquentiel verrouillé) ─

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year  TEXT := TO_CHAR(NOW(), 'YYYY');
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) + 1
    INTO v_count
    FROM public.customs_invoices
   WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  RETURN 'INV-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO service_role;

-- ─── Table : invoice_items ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID    NOT NULL
               REFERENCES public.customs_invoices(id)
               ON DELETE CASCADE,

  item_type    invoice_item_type NOT NULL,

  label        TEXT    NOT NULL,

  tax_line_id  UUID
               REFERENCES public.customs_tax_lines(id)
               ON DELETE SET NULL,

  quantity     NUMERIC(10,4) NOT NULL DEFAULT 1
    CONSTRAINT chk_qty_positive CHECK (quantity > 0),

  unit_price_usd NUMERIC(14,4) NOT NULL
    CONSTRAINT chk_unit_price_not_negative CHECK (unit_price_usd >= 0),

  line_total_usd NUMERIC(14,4) NOT NULL
    CONSTRAINT chk_line_total_not_negative CHECK (line_total_usd >= 0),

  line_total_display NUMERIC(14,2)
    GENERATED ALWAYS AS (ROUND(line_total_usd, 2)) STORED,

  notes        TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice
  ON public.invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_items_tax_line
  ON public.invoice_items(tax_line_id)
  WHERE tax_line_id IS NOT NULL;

-- ─── Trigger : updated_at sur customs_invoices ────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_invoices_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.customs_invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.customs_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_invoices_updated_at();

-- ─── Trigger : immuabilité des factures PAID ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_protect_paid_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'PAID'::invoice_status THEN
    IF NEW.status = 'CANCELLED'::invoice_status
      AND NEW.invoice_number IS NOT DISTINCT FROM OLD.invoice_number
      AND NEW.customs_file_id IS NOT DISTINCT FROM OLD.customs_file_id
      AND NEW.billed_to_user_id IS NOT DISTINCT FROM OLD.billed_to_user_id
      AND NEW.total_usd IS NOT DISTINCT FROM OLD.total_usd
    THEN
      NEW.cancelled_at := COALESCE(NEW.cancelled_at, NOW());
      RETURN NEW;
    END IF;

    RAISE EXCEPTION
      'La facture % est réglée (PAID) et ne peut plus être modifiée. '
      'Émettez un avoir (CANCELLED) pour la corriger.',
      OLD.invoice_number
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.status = 'SENT'::invoice_status AND OLD.status = 'DRAFT'::invoice_status THEN
    NEW.sent_at := COALESCE(NEW.sent_at, NOW());
  END IF;

  IF NEW.status = 'PAID'::invoice_status AND OLD.status IS DISTINCT FROM 'PAID'::invoice_status THEN
    NEW.paid_at := COALESCE(NEW.paid_at, NOW());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_paid_invoice ON public.customs_invoices;
CREATE TRIGGER trg_protect_paid_invoice
  BEFORE UPDATE ON public.customs_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_protect_paid_invoice();

-- ─── Trigger : cohérence des totaux depuis invoice_items ─────────────────────

CREATE OR REPLACE FUNCTION public.trg_recalc_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id     UUID;
  v_disb_total     NUMERIC(14,4);
  v_fees_total     NUMERIC(14,4);
  v_invoice_status invoice_status;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT status INTO v_invoice_status
    FROM public.customs_invoices
   WHERE id = v_invoice_id;

  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_invoice_status = 'PAID'::invoice_status THEN
    RAISE EXCEPTION
      'Impossible de modifier les lignes d''une facture réglée (PAID).'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT
    COALESCE(SUM(line_total_usd) FILTER (WHERE item_type = 'DISBURSEMENT'::invoice_item_type), 0),
    COALESCE(SUM(line_total_usd) FILTER (WHERE item_type IS DISTINCT FROM 'DISBURSEMENT'::invoice_item_type), 0)
  INTO v_disb_total, v_fees_total
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id;

  UPDATE public.customs_invoices
     SET subtotal_disbursements_usd = v_disb_total,
         subtotal_fees_usd          = v_fees_total,
         total_usd                  = v_disb_total + v_fees_total
   WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_invoice_totals_insert ON public.invoice_items;
CREATE TRIGGER trg_recalc_invoice_totals_insert
  AFTER INSERT ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalc_invoice_totals();

DROP TRIGGER IF EXISTS trg_recalc_invoice_totals_update ON public.invoice_items;
CREATE TRIGGER trg_recalc_invoice_totals_update
  AFTER UPDATE OF line_total_usd, item_type, quantity, unit_price_usd ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalc_invoice_totals();

DROP TRIGGER IF EXISTS trg_recalc_invoice_totals_delete ON public.invoice_items;
CREATE TRIGGER trg_recalc_invoice_totals_delete
  AFTER DELETE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalc_invoice_totals();

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.customs_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_admin_all" ON public.customs_invoices;
CREATE POLICY "invoices_admin_all"
  ON public.customs_invoices FOR ALL
  USING (public.get_user_role() = 'ADMIN')
  WITH CHECK (public.get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "invoice_items_admin_all" ON public.invoice_items;
CREATE POLICY "invoice_items_admin_all"
  ON public.invoice_items FOR ALL
  USING (public.get_user_role() = 'ADMIN')
  WITH CHECK (public.get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "invoices_buyer_read" ON public.customs_invoices;
CREATE POLICY "invoices_buyer_read"
  ON public.customs_invoices FOR SELECT
  USING (
    billed_to_user_id = auth.uid()
    AND status IN ('SENT'::invoice_status, 'PAID'::invoice_status)
  );

DROP POLICY IF EXISTS "invoice_items_buyer_read" ON public.invoice_items;
CREATE POLICY "invoice_items_buyer_read"
  ON public.invoice_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM public.customs_invoices
       WHERE billed_to_user_id = auth.uid()
         AND status IN ('SENT'::invoice_status, 'PAID'::invoice_status)
    )
  );

DROP POLICY IF EXISTS "invoices_partner_read" ON public.customs_invoices;
CREATE POLICY "invoices_partner_read"
  ON public.customs_invoices FOR SELECT
  USING (
    customs_file_id IN (
      SELECT cf.id
        FROM public.customs_files cf
        JOIN public.partner_profiles pp
          ON pp.id = cf.assigned_partner_id
       WHERE pp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "invoice_items_partner_read" ON public.invoice_items;
CREATE POLICY "invoice_items_partner_read"
  ON public.invoice_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT ci.id
        FROM public.customs_invoices ci
        JOIN public.customs_files cf ON cf.id = ci.customs_file_id
        JOIN public.partner_profiles pp ON pp.id = cf.assigned_partner_id
       WHERE pp.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.customs_invoices IS 'Facturation douanière Bloc J — une facture active (non CANCELLED) par dossier.';
COMMENT ON TABLE public.invoice_items IS 'Lignes de facture (débours liés aux taxes, honoraires, frais).';
