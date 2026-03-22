-- Sprint 3 — Module fiscal (déclarations, totaux, types de taxes, verrou)

-- -----------------------------------------------------------------------------
-- customs_tax_types : métadonnées + filtre actif
-- -----------------------------------------------------------------------------
ALTER TABLE public.customs_tax_types
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS default_rate_percent numeric(10, 4),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.customs_tax_types SET is_active = true WHERE is_active IS NULL;

-- -----------------------------------------------------------------------------
-- customs_declarations : notes, total taxes persisté, updated_at
-- -----------------------------------------------------------------------------
ALTER TABLE public.customs_declarations
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS total_taxes_usd numeric(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill total depuis les lignes existantes
UPDATE public.customs_declarations d
SET total_taxes_usd = COALESCE((
  SELECT ROUND(SUM(l.final_amount_usd)::numeric, 2)
  FROM public.customs_tax_lines l
  WHERE l.declaration_id = d.id
), 0);

-- -----------------------------------------------------------------------------
-- customs_tax_lines : notes ligne (distinct de override_reason métier)
-- -----------------------------------------------------------------------------
ALTER TABLE public.customs_tax_lines
  ADD COLUMN IF NOT EXISTS notes text;

-- -----------------------------------------------------------------------------
-- Touch updated_at sur customs_declarations
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_customs_declarations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customs_declarations_updated_at ON public.customs_declarations;
CREATE TRIGGER trg_customs_declarations_updated_at
  BEFORE UPDATE ON public.customs_declarations
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_customs_declarations_updated_at();

-- -----------------------------------------------------------------------------
-- Verrou DB : pas de modification des montants de ligne si validation fiscale
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_protect_tax_lines_when_fiscal_locked()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  locked boolean;
  decl_id uuid;
BEGIN
  decl_id := COALESCE(NEW.declaration_id, OLD.declaration_id);
  SELECT d.is_fiscal_validated INTO locked
  FROM public.customs_declarations d
  WHERE d.id = decl_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'customs_tax_lines_bad_declaration: déclaration introuvable.';
  END IF;

  IF locked IS TRUE THEN
    RAISE EXCEPTION 'customs_tax_lines_locked: déclaration validée fiscalement — modification interdite.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_tax_line_amounts ON public.customs_tax_lines;
CREATE TRIGGER trg_protect_tax_line_amounts
  BEFORE INSERT OR UPDATE OR DELETE ON public.customs_tax_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_protect_tax_lines_when_fiscal_locked();

-- Note : INSERT avant validation est autorisé ; le trigger vérifie is_fiscal_validated sur la déclaration parente.

-- -----------------------------------------------------------------------------
-- RLS — écritures FISCAL_CONSULTANT + PARTNER sur déclarations / lignes
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "customs_declarations_fiscal_all" ON public.customs_declarations;
CREATE POLICY "customs_declarations_fiscal_all" ON public.customs_declarations
  FOR ALL USING (public.get_user_role() = 'FISCAL_CONSULTANT');

DROP POLICY IF EXISTS "customs_declarations_partner_write" ON public.customs_declarations;
CREATE POLICY "customs_declarations_partner_write" ON public.customs_declarations
  FOR ALL USING (
    public.get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
    AND EXISTS (
      SELECT 1 FROM public.customs_files cf
      WHERE cf.id = customs_declarations.customs_file_id
        AND cf.assigned_partner_id IN (
          SELECT id FROM public.partner_profiles WHERE user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "customs_tax_lines_fiscal_all" ON public.customs_tax_lines;
CREATE POLICY "customs_tax_lines_fiscal_all" ON public.customs_tax_lines
  FOR ALL USING (public.get_user_role() = 'FISCAL_CONSULTANT');

DROP POLICY IF EXISTS "customs_tax_lines_partner_write" ON public.customs_tax_lines;
CREATE POLICY "customs_tax_lines_partner_write" ON public.customs_tax_lines
  FOR ALL USING (
    public.get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
    AND EXISTS (
      SELECT 1 FROM public.customs_declarations d
      JOIN public.customs_files cf ON cf.id = d.customs_file_id
      WHERE d.id = customs_tax_lines.declaration_id
        AND cf.assigned_partner_id IN (
          SELECT id FROM public.partner_profiles WHERE user_id = auth.uid()
        )
    )
  );

COMMENT ON TRIGGER trg_protect_tax_line_amounts ON public.customs_tax_lines IS
  'Sprint 3 — bloque INSERT/UPDATE/DELETE sur lignes si is_fiscal_validated sur la déclaration.';
