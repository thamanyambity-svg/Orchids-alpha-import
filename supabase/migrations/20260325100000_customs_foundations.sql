-- Sprint 1 — Fondations douanières (tables + RLS)
-- Les écritures sensibles passent par service role côté Server Actions ;
-- les SELECT cookie servent aux guards (verifyCustomsFileAccess).

-- -----------------------------------------------------------------------------
-- Types de taxes (référentiel)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customs_tax_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Dossiers douaniers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customs_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.import_requests(id) ON DELETE CASCADE,
  country_code text NOT NULL DEFAULT 'CD',
  transport_mode text NOT NULL CHECK (transport_mode IN ('AIR', 'SEA', 'LAND')),
  transport_ref text,
  vessel_flight_name text,
  container_number text,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'PRE_ADVICE', 'IN_CUSTOMS', 'LIQUIDATED', 'PAID', 'RELEASED', 'BLOCKED'
  )),
  assigned_partner_id uuid REFERENCES public.partner_profiles(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customs_files_order_id ON public.customs_files (order_id);
CREATE INDEX IF NOT EXISTS idx_customs_files_request_id ON public.customs_files (request_id);
CREATE INDEX IF NOT EXISTS idx_customs_files_status ON public.customs_files (status);
CREATE INDEX IF NOT EXISTS idx_customs_files_updated_at ON public.customs_files (updated_at DESC);

-- -----------------------------------------------------------------------------
-- Déclarations DGDA (1 par dossier)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customs_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customs_file_id uuid NOT NULL REFERENCES public.customs_files(id) ON DELETE CASCADE,
  declaration_number text,
  declared_value_usd numeric(18, 2) NOT NULL DEFAULT 0,
  is_fiscal_validated boolean NOT NULL DEFAULT false,
  fiscal_validated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  fiscal_validated_at timestamptz,
  is_accounting_validated boolean NOT NULL DEFAULT false,
  accounting_validated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accounting_validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customs_declarations_one_per_file UNIQUE (customs_file_id)
);

-- -----------------------------------------------------------------------------
-- Lignes de taxes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customs_tax_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id uuid NOT NULL REFERENCES public.customs_declarations(id) ON DELETE CASCADE,
  tax_type_id uuid NOT NULL REFERENCES public.customs_tax_types(id) ON DELETE RESTRICT,
  base_amount_usd numeric(18, 2) NOT NULL,
  rate_percent numeric(10, 4),
  computed_amount_usd numeric(18, 2) NOT NULL,
  final_amount_usd numeric(18, 2) NOT NULL,
  override_reason text,
  set_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customs_tax_lines_declaration ON public.customs_tax_lines (declaration_id);

-- -----------------------------------------------------------------------------
-- Historique des statuts (rempli par les Server Actions — service role)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customs_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customs_file_id uuid NOT NULL REFERENCES public.customs_files(id) ON DELETE CASCADE,
  status_from text,
  status_to text NOT NULL,
  changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text
);

CREATE INDEX IF NOT EXISTS idx_customs_status_history_file ON public.customs_status_history (customs_file_id, changed_at DESC);

-- -----------------------------------------------------------------------------
-- updated_at automatique sur customs_files
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_customs_files_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customs_files_updated_at ON public.customs_files;
CREATE TRIGGER trg_customs_files_updated_at
  BEFORE UPDATE ON public.customs_files
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_customs_files_updated_at();

-- -----------------------------------------------------------------------------
-- RLS — lecture pour guards ; écritures via service role (bypass RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.customs_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_tax_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_tax_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customs_tax_types_customs_read" ON public.customs_tax_types;
CREATE POLICY "customs_tax_types_customs_read" ON public.customs_tax_types
  FOR SELECT USING (
    public.get_user_role() = 'ADMIN'
    OR public.get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY', 'FISCAL_CONSULTANT', 'ACCOUNTANT')
  );

DROP POLICY IF EXISTS "customs_files_admin_all" ON public.customs_files;
CREATE POLICY "customs_files_admin_all" ON public.customs_files
  FOR ALL USING (public.get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "customs_files_partner_select" ON public.customs_files;
CREATE POLICY "customs_files_partner_select" ON public.customs_files
  FOR SELECT USING (
    public.get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
    AND assigned_partner_id IN (
      SELECT id FROM public.partner_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "customs_files_fiscal_accountant_select" ON public.customs_files;
CREATE POLICY "customs_files_fiscal_accountant_select" ON public.customs_files
  FOR SELECT USING (
    public.get_user_role() IN ('FISCAL_CONSULTANT', 'ACCOUNTANT')
  );

DROP POLICY IF EXISTS "customs_declarations_admin_all" ON public.customs_declarations;
CREATE POLICY "customs_declarations_admin_all" ON public.customs_declarations
  FOR ALL USING (public.get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "customs_declarations_via_file_partner" ON public.customs_declarations;
CREATE POLICY "customs_declarations_via_file_partner" ON public.customs_declarations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customs_files cf
      WHERE cf.id = customs_declarations.customs_file_id
        AND public.get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
        AND cf.assigned_partner_id IN (
          SELECT id FROM public.partner_profiles WHERE user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "customs_declarations_via_file_fiscal" ON public.customs_declarations;
CREATE POLICY "customs_declarations_via_file_fiscal" ON public.customs_declarations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customs_files cf
      WHERE cf.id = customs_declarations.customs_file_id
        AND public.get_user_role() IN ('FISCAL_CONSULTANT', 'ACCOUNTANT')
    )
  );

DROP POLICY IF EXISTS "customs_tax_lines_admin_all" ON public.customs_tax_lines;
CREATE POLICY "customs_tax_lines_admin_all" ON public.customs_tax_lines
  FOR ALL USING (public.get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "customs_tax_lines_via_declaration" ON public.customs_tax_lines;
CREATE POLICY "customs_tax_lines_via_declaration" ON public.customs_tax_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customs_declarations d
      JOIN public.customs_files cf ON cf.id = d.customs_file_id
      WHERE d.id = customs_tax_lines.declaration_id
        AND (
          (
            public.get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
            AND cf.assigned_partner_id IN (
              SELECT id FROM public.partner_profiles WHERE user_id = auth.uid()
            )
          )
          OR public.get_user_role() IN ('FISCAL_CONSULTANT', 'ACCOUNTANT')
        )
    )
  );

DROP POLICY IF EXISTS "customs_status_history_admin_all" ON public.customs_status_history;
CREATE POLICY "customs_status_history_admin_all" ON public.customs_status_history
  FOR ALL USING (public.get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "customs_status_history_via_file" ON public.customs_status_history;
CREATE POLICY "customs_status_history_via_file" ON public.customs_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customs_files cf
      WHERE cf.id = customs_status_history.customs_file_id
        AND (
          (
            public.get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
            AND cf.assigned_partner_id IN (
              SELECT id FROM public.partner_profiles WHERE user_id = auth.uid()
            )
          )
          OR public.get_user_role() IN ('FISCAL_CONSULTANT', 'ACCOUNTANT')
        )
    )
  );

COMMENT ON TABLE public.customs_files IS 'Dossier douanier par commande (Sprint douanes).';
COMMENT ON TABLE public.customs_status_history IS 'Historique des changements de statut (insertion côté app / service role).';
