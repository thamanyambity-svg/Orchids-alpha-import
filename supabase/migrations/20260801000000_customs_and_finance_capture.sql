-- =============================================================================
-- Capture du sous-système douanes / finance présent en base mais absent du repo
-- =============================================================================
--
-- Contexte : le projet Supabase `edhijqtotsrefminalsp` porte 15 migrations
-- appliquées entre mars et juillet 2026 dont seules deux figurent dans
-- supabase/migrations/. Douze tables n'avaient donc aucun DDL versionné :
-- tout le bloc douanes, la facturation douanière, les taux de change, les
-- preuves de paiement, le journal d'accès aux documents et la table héritée
-- `documents`. Sans ce fichier, reconstruire la base depuis le repo perd ces
-- objets — et les écrans /admin/customs, /admin/finances et /admin/documents
-- avec eux.
--
-- Ce fichier est une capture par introspection, pas une migration écrite à la
-- main : il reproduit l'état observé le 2026-08-01. Il est idempotent
-- (IF NOT EXISTS, CREATE OR REPLACE, DROP ... IF EXISTS) et se place après
-- 20260717000000_initial_schema.sql, dont il référence les tables
-- (profiles, orders, import_requests, transactions, partner_profiles).
--
-- Sur le projet existant, où ces objets sont déjà là, marquer la migration
-- comme appliquée plutôt que de la rejouer :
--   supabase migration repair --status applied 20260801000000
--
-- Divergence connue, non corrigée ici pour rester fidèle à l'existant :
-- `customs_files.assigned_partner_id` a une FK vers profiles(id), mais les
-- policies l'utilisent tantôt comme un profiles.id (`= auth.uid()`), tantôt
-- comme un partner_profiles.id (`IN (SELECT id FROM partner_profiles ...)`).
-- Les deux lectures ne peuvent pas être vraies simultanément.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE public.document_access_action AS ENUM ('VIEW', 'DOWNLOAD', 'SIGNED_URL_GENERATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.document_type AS ENUM ('REQUEST_DOCUMENT', 'PAYMENT_PROOF');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.exchange_rate_status AS ENUM ('ACTIVE', 'SUPERSEDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.invoice_item_type AS ENUM ('DISBURSEMENT', 'SERVICE_FEE', 'FILE_FEE', 'TRANSPORT_FEE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.invoice_status AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.proof_status AS ENUM ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Fonctions d'autorisation partagées
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
  RETURNS text
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT role::text FROM public.profiles WHERE id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.custom_is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$function$;

-- -----------------------------------------------------------------------------
-- documents (héritée)
--
-- Table polymorphe de l'ancien schéma. L'application ne l'utilise plus : elle
-- écrit dans request_documents, et les `.from('documents')` du code visent le
-- bucket storage homonyme. Elle était SANS RLS, donc lisible et modifiable par
-- quiconque détient la clé anon — publique par construction. On active RLS
-- sans policy : aucun accès anon/authenticated, service_role passe toujours.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    linked_type text,
    linked_id uuid,
    name text NOT NULL,
    file_url text NOT NULL,
    file_type text,
    uploaded_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    CONSTRAINT documents_pkey PRIMARY KEY (id)
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- exchange_rates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    from_currency varchar(5) NOT NULL,
    to_currency varchar(5) NOT NULL,
    rate numeric NOT NULL,
    set_by uuid NOT NULL REFERENCES public.profiles(id),
    valid_from timestamptz NOT NULL DEFAULT now(),
    status public.exchange_rate_status NOT NULL DEFAULT 'ACTIVE',
    admin_note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    superseded_at timestamptz,
    effective_at timestamptz NOT NULL DEFAULT now(),
    notes text,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT exchange_rates_pkey PRIMARY KEY (id),
    CONSTRAINT exchange_rates_rate_check CHECK (rate > 0),
    CONSTRAINT chk_exchange_rate_distinct_currencies CHECK (from_currency <> to_currency),
    CONSTRAINT chk_exchange_rate_base_currency CHECK (
      from_currency IN ('USD', 'EUR') OR to_currency IN ('USD', 'EUR')
    )
);

-- -----------------------------------------------------------------------------
-- customs_tax_types
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customs_tax_types (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code varchar(20) NOT NULL,
    label text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    default_rate_percent numeric,
    CONSTRAINT customs_tax_types_pkey PRIMARY KEY (id),
    CONSTRAINT customs_tax_types_code_key UNIQUE (code)
);

-- -----------------------------------------------------------------------------
-- customs_files — dossier douanier par commande
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customs_files (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id),
    request_id uuid NOT NULL REFERENCES public.import_requests(id),
    country_code varchar(5) NOT NULL DEFAULT 'CD',
    transport_mode varchar(10),
    transport_ref varchar(100),
    vessel_flight_name varchar(100),
    container_number varchar(50),
    status varchar(50) NOT NULL DEFAULT 'DRAFT',
    assigned_partner_id uuid REFERENCES public.profiles(id),
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT customs_files_pkey PRIMARY KEY (id),
    CONSTRAINT customs_files_status_check CHECK (
      status IN ('DRAFT', 'PRE_ADVICE', 'IN_CUSTOMS', 'LIQUIDATED', 'PAID', 'RELEASED', 'BLOCKED')
    ),
    CONSTRAINT customs_files_transport_mode_check CHECK (
      transport_mode IN ('AIR', 'SEA', 'LAND')
    )
);

COMMENT ON TABLE public.customs_files IS 'Dossier douanier par commande (Sprint douanes).';

-- -----------------------------------------------------------------------------
-- customs_declarations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customs_declarations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    customs_file_id uuid NOT NULL REFERENCES public.customs_files(id),
    declaration_number varchar(100),
    declared_value_usd numeric NOT NULL DEFAULT 0,
    is_fiscal_validated boolean NOT NULL DEFAULT false,
    fiscal_validated_by uuid REFERENCES public.profiles(id),
    fiscal_validated_at timestamptz,
    is_accounting_validated boolean NOT NULL DEFAULT false,
    accounting_validated_by uuid REFERENCES public.profiles(id),
    accounting_validated_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    notes text,
    total_taxes_usd numeric NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT customs_declarations_pkey PRIMARY KEY (id),
    CONSTRAINT customs_declarations_declaration_number_key UNIQUE (declaration_number),
    CONSTRAINT customs_declarations_declared_value_usd_check CHECK (declared_value_usd >= 0)
);

-- -----------------------------------------------------------------------------
-- customs_tax_lines
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customs_tax_lines (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    declaration_id uuid NOT NULL REFERENCES public.customs_declarations(id),
    tax_type_id uuid NOT NULL REFERENCES public.customs_tax_types(id),
    base_amount_usd numeric NOT NULL,
    rate_percent numeric,
    computed_amount_usd numeric NOT NULL,
    final_amount_usd numeric NOT NULL,
    override_reason text,
    set_by uuid REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    notes text,
    CONSTRAINT customs_tax_lines_pkey PRIMARY KEY (id),
    CONSTRAINT customs_tax_lines_declaration_id_tax_type_id_key UNIQUE (declaration_id, tax_type_id),
    CONSTRAINT customs_tax_lines_base_amount_usd_check CHECK (base_amount_usd >= 0),
    CONSTRAINT customs_tax_lines_computed_amount_usd_check CHECK (computed_amount_usd >= 0),
    CONSTRAINT customs_tax_lines_final_amount_usd_check CHECK (final_amount_usd >= 0),
    -- Tout écart au montant calculé exige une justification d'au moins 10 caractères.
    CONSTRAINT chk_override_reason CHECK (
      final_amount_usd = computed_amount_usd
      OR (override_reason IS NOT NULL AND length(trim(override_reason)) >= 10)
    )
);

-- -----------------------------------------------------------------------------
-- customs_status_history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customs_status_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    customs_file_id uuid NOT NULL REFERENCES public.customs_files(id),
    status_from varchar(50),
    status_to varchar(50) NOT NULL,
    changed_by uuid NOT NULL REFERENCES public.profiles(id),
    changed_at timestamptz NOT NULL DEFAULT now(),
    ip_address inet,
    reason text,
    snapshot jsonb,
    CONSTRAINT customs_status_history_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.customs_status_history IS 'Historique des changements de statut (insertion côté app / service role).';

-- -----------------------------------------------------------------------------
-- customs_file_messages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customs_file_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    file_id uuid NOT NULL REFERENCES public.customs_files(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    content text NOT NULL,
    is_internal boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    read_by jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT customs_file_messages_pkey PRIMARY KEY (id),
    CONSTRAINT chk_cfm_content_not_blank CHECK (length(trim(content)) > 0)
);

COMMENT ON TABLE public.customs_file_messages IS 'Messagerie contextuelle par dossier douanier (immuabilité : pas UPDATE/DELETE).';

-- -----------------------------------------------------------------------------
-- customs_invoices
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customs_invoices (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    customs_file_id uuid NOT NULL REFERENCES public.customs_files(id) ON DELETE RESTRICT,
    invoice_number text NOT NULL,
    status public.invoice_status NOT NULL DEFAULT 'DRAFT',
    billed_to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    subtotal_disbursements_usd numeric NOT NULL DEFAULT 0,
    subtotal_fees_usd numeric NOT NULL DEFAULT 0,
    total_usd numeric NOT NULL DEFAULT 0,
    exchange_rate_id uuid REFERENCES public.exchange_rates(id) ON DELETE RESTRICT,
    total_local numeric,
    currency_local text DEFAULT 'CDF',
    issued_at timestamptz NOT NULL DEFAULT now(),
    due_date timestamptz NOT NULL,
    paid_at timestamptz,
    sent_at timestamptz,
    cancelled_at timestamptz,
    generated_by uuid REFERENCES public.profiles(id),
    notes text,
    snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT customs_invoices_pkey PRIMARY KEY (id),
    CONSTRAINT customs_invoices_invoice_number_key UNIQUE (invoice_number),
    CONSTRAINT chk_due_after_issued CHECK (due_date >= issued_at),
    CONSTRAINT chk_subtotal_disb_positive CHECK (subtotal_disbursements_usd >= 0),
    CONSTRAINT chk_subtotal_fees_positive CHECK (subtotal_fees_usd >= 0),
    CONSTRAINT chk_total_positive CHECK (total_usd >= 0),
    -- Une seule facture non annulée par dossier douanier.
    CONSTRAINT uq_one_active_invoice_per_file EXCLUDE USING btree (customs_file_id WITH =)
      WHERE (status IS DISTINCT FROM 'CANCELLED'::public.invoice_status)
);

COMMENT ON TABLE public.customs_invoices IS 'Facturation douanière Bloc J — une facture active (non CANCELLED) par dossier.';

-- -----------------------------------------------------------------------------
-- invoice_items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL REFERENCES public.customs_invoices(id) ON DELETE CASCADE,
    item_type public.invoice_item_type NOT NULL,
    label text NOT NULL,
    tax_line_id uuid REFERENCES public.customs_tax_lines(id) ON DELETE SET NULL,
    quantity numeric NOT NULL DEFAULT 1,
    unit_price_usd numeric NOT NULL,
    line_total_usd numeric NOT NULL,
    line_total_display numeric,
    notes text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT invoice_items_pkey PRIMARY KEY (id),
    CONSTRAINT chk_qty_positive CHECK (quantity > 0),
    CONSTRAINT chk_unit_price_not_negative CHECK (unit_price_usd >= 0),
    CONSTRAINT chk_line_total_not_negative CHECK (line_total_usd >= 0)
);

COMMENT ON TABLE public.invoice_items IS 'Lignes de facture (débours liés aux taxes, honoraires, frais).';

-- -----------------------------------------------------------------------------
-- document_access_logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_access_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_type public.document_type NOT NULL,
    document_id uuid NOT NULL,
    accessed_by uuid NOT NULL REFERENCES public.profiles(id),
    accessed_at timestamptz NOT NULL DEFAULT now(),
    ip_address inet,
    user_agent text,
    action public.document_access_action NOT NULL,
    admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT document_access_logs_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.document_access_logs IS 'Immutable audit trail for sensitive document access (e.g. signed URLs). No UPDATE/DELETE policies.';

-- -----------------------------------------------------------------------------
-- payment_proofs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_proofs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL REFERENCES public.transactions(id),
    order_id uuid NOT NULL REFERENCES public.orders(id),
    uploaded_by uuid NOT NULL REFERENCES public.profiles(id),
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    file_path text NOT NULL,
    file_name_original text,
    file_size_bytes bigint,
    file_mime_type text,
    status public.proof_status NOT NULL DEFAULT 'PENDING_REVIEW',
    reviewed_by uuid REFERENCES public.profiles(id),
    reviewed_at timestamptz,
    rejected_reason text,
    declared_amount numeric,
    declared_currency varchar(5),
    supersedes_proof_id uuid REFERENCES public.payment_proofs(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    superseded_at timestamptz,
    CONSTRAINT payment_proofs_pkey PRIMARY KEY (id),
    -- Un rejet doit être motivé sur au moins 10 caractères.
    CONSTRAINT chk_proof_rejection_reason CHECK (
      status <> 'REJECTED'::public.proof_status
      OR (rejected_reason IS NOT NULL AND length(trim(rejected_reason)) >= 10)
    )
);

-- -----------------------------------------------------------------------------
-- Index
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customs_files_order ON public.customs_files USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_customs_files_request ON public.customs_files USING btree (request_id);
CREATE INDEX IF NOT EXISTS idx_customs_files_status ON public.customs_files USING btree (status);
CREATE INDEX IF NOT EXISTS idx_customs_files_updated_at ON public.customs_files USING btree (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_customs_files_partner ON public.customs_files USING btree (assigned_partner_id) WHERE (assigned_partner_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_customs_declarations_file ON public.customs_declarations USING btree (customs_file_id);
CREATE INDEX IF NOT EXISTS idx_customs_tax_lines_declaration ON public.customs_tax_lines USING btree (declaration_id);
CREATE INDEX IF NOT EXISTS idx_customs_status_history_file ON public.customs_status_history USING btree (customs_file_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_cfm_author ON public.customs_file_messages USING btree (author_id);
CREATE INDEX IF NOT EXISTS idx_cfm_file_created ON public.customs_file_messages USING btree (file_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cfm_is_internal ON public.customs_file_messages USING btree (file_id, is_internal) WHERE (is_internal = false);
CREATE INDEX IF NOT EXISTS idx_cfm_read_by ON public.customs_file_messages USING gin (read_by);
CREATE INDEX IF NOT EXISTS idx_cfm_unread_empty_read_by ON public.customs_file_messages USING btree (file_id, created_at DESC) WHERE (read_by = '{}'::jsonb);

CREATE INDEX IF NOT EXISTS idx_invoices_billed_to ON public.customs_invoices USING btree (billed_to_user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customs_file ON public.customs_invoices USING btree (customs_file_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_at ON public.customs_invoices USING btree (issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.customs_invoices USING btree (status);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tax_line ON public.invoice_items USING btree (tax_line_id) WHERE (tax_line_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_doc_access_logs_accessor ON public.document_access_logs USING btree (accessed_by, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_access_logs_document ON public.document_access_logs USING btree (document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_logs_recent ON public.document_access_logs USING btree (accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_admin ON public.document_access_logs USING btree (admin_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_created ON public.document_access_logs USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_active ON public.exchange_rates USING btree (from_currency, to_currency, status) WHERE (status = 'ACTIVE'::public.exchange_rate_status);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair_history ON public.exchange_rates USING btree (from_currency, to_currency, valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_to_created ON public.exchange_rates USING btree (to_currency, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_order ON public.payment_proofs USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON public.payment_proofs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_supersedes ON public.payment_proofs USING btree (supersedes_proof_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_uploader ON public.payment_proofs USING btree (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_pending ON public.payment_proofs USING btree (status, created_at) WHERE (status = 'PENDING_REVIEW'::public.proof_status);

-- -----------------------------------------------------------------------------
-- Fonctions de déclencheur
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_customs_files_updated_at()
  RETURNS trigger LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.touch_customs_declarations_updated_at()
  RETURNS trigger LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.touch_payment_proofs_updated_at()
  RETURNS trigger LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_invoices_updated_at()
  RETURNS trigger LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_customs_status_change()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.customs_status_history (
      customs_file_id, status_from, status_to, changed_by, changed_at, ip_address, snapshot
    ) VALUES (
      NEW.id, OLD.status, NEW.status, COALESCE(auth.uid(), NEW.created_by), now(), NULL, to_jsonb(OLD)
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_validated_declaration()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.is_fiscal_validated = true THEN
    IF OLD.declared_value_usd IS DISTINCT FROM NEW.declared_value_usd THEN
      RAISE EXCEPTION
        'Modification interdite : la déclaration % est validée fiscalement. '
        'declared_value_usd ne peut plus être modifié.', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_protect_tax_lines_when_fiscal_locked()
  RETURNS trigger LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.trg_protect_paid_invoice()
  RETURNS trigger LANGUAGE plpgsql
AS $function$
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
      'Émettez un avoir (CANCELLED) pour la corriger.', OLD.invoice_number
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
$function$;

CREATE OR REPLACE FUNCTION public.trg_recalc_invoice_totals()
  RETURNS trigger LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_supersede_exchange_rate()
  RETURNS trigger LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.exchange_rates er
  SET superseded_at = now()
  WHERE er.id IS DISTINCT FROM NEW.id
    AND er.from_currency = NEW.from_currency
    AND er.to_currency = NEW.to_currency
    AND er.superseded_at IS NULL;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_supersede_rejected_proof()
  RETURNS trigger LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.supersedes_proof_id IS NOT NULL THEN
    UPDATE public.payment_proofs
    SET
      status = 'SUPERSEDED',
      superseded_at = COALESCE(superseded_at, now()),
      updated_at = now()
    WHERE id = NEW.supersedes_proof_id
      AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- -----------------------------------------------------------------------------
-- Déclencheurs
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_customs_files_updated_at ON public.customs_files;
CREATE TRIGGER trg_customs_files_updated_at
  BEFORE UPDATE ON public.customs_files
  FOR EACH ROW EXECUTE FUNCTION public.touch_customs_files_updated_at();

DROP TRIGGER IF EXISTS trg_customs_status_history ON public.customs_files;
CREATE TRIGGER trg_customs_status_history
  AFTER UPDATE OF status ON public.customs_files
  FOR EACH ROW EXECUTE FUNCTION public.log_customs_status_change();

DROP TRIGGER IF EXISTS trg_customs_declarations_updated_at ON public.customs_declarations;
CREATE TRIGGER trg_customs_declarations_updated_at
  BEFORE UPDATE ON public.customs_declarations
  FOR EACH ROW EXECUTE FUNCTION public.touch_customs_declarations_updated_at();

DROP TRIGGER IF EXISTS trg_protect_declaration_amounts ON public.customs_declarations;
CREATE TRIGGER trg_protect_declaration_amounts
  BEFORE UPDATE OF declared_value_usd ON public.customs_declarations
  FOR EACH ROW EXECUTE FUNCTION public.protect_validated_declaration();

DROP TRIGGER IF EXISTS trg_protect_tax_line_amounts ON public.customs_tax_lines;
CREATE TRIGGER trg_protect_tax_line_amounts
  BEFORE INSERT OR DELETE OR UPDATE ON public.customs_tax_lines
  FOR EACH ROW EXECUTE FUNCTION public.fn_protect_tax_lines_when_fiscal_locked();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.customs_invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.customs_invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_invoices_updated_at();

DROP TRIGGER IF EXISTS trg_protect_paid_invoice ON public.customs_invoices;
CREATE TRIGGER trg_protect_paid_invoice
  BEFORE UPDATE ON public.customs_invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_protect_paid_invoice();

DROP TRIGGER IF EXISTS trg_recalc_invoice_totals_insert ON public.invoice_items;
CREATE TRIGGER trg_recalc_invoice_totals_insert
  AFTER INSERT ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_invoice_totals();

DROP TRIGGER IF EXISTS trg_recalc_invoice_totals_update ON public.invoice_items;
CREATE TRIGGER trg_recalc_invoice_totals_update
  AFTER UPDATE OF line_total_usd, item_type, quantity, unit_price_usd ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_invoice_totals();

DROP TRIGGER IF EXISTS trg_recalc_invoice_totals_delete ON public.invoice_items;
CREATE TRIGGER trg_recalc_invoice_totals_delete
  AFTER DELETE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_invoice_totals();

DROP TRIGGER IF EXISTS trg_supersede_exchange_rate ON public.exchange_rates;
CREATE TRIGGER trg_supersede_exchange_rate
  AFTER INSERT ON public.exchange_rates
  FOR EACH ROW EXECUTE FUNCTION public.fn_supersede_exchange_rate();

DROP TRIGGER IF EXISTS trg_payment_proofs_updated_at ON public.payment_proofs;
CREATE TRIGGER trg_payment_proofs_updated_at
  BEFORE UPDATE ON public.payment_proofs
  FOR EACH ROW EXECUTE FUNCTION public.touch_payment_proofs_updated_at();

DROP TRIGGER IF EXISTS trg_supersede_rejected_proof ON public.payment_proofs;
CREATE TRIGGER trg_supersede_rejected_proof
  AFTER INSERT ON public.payment_proofs
  FOR EACH ROW EXECUTE FUNCTION public.fn_supersede_rejected_proof();

-- -----------------------------------------------------------------------------
-- RLS
--
-- Les policies ci-dessous sont reprises telles qu'observées en base. Elles se
-- recouvrent largement (deux générations de règles cohabitent : une série
-- `get_user_role()` et une série `custom_is_admin()` + sous-requête sur
-- profiles). Elles sont PERMISSIVE, donc leur union fait foi : un audit de
-- consolidation reste à faire, il n'est pas fait ici.
-- -----------------------------------------------------------------------------
ALTER TABLE public.customs_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_tax_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_file_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- customs_files
DROP POLICY IF EXISTS "customs_files_admin_all" ON public.customs_files;
CREATE POLICY "customs_files_admin_all" ON public.customs_files
  FOR ALL USING (get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "customs_files_privileged_roles" ON public.customs_files;
CREATE POLICY "customs_files_privileged_roles" ON public.customs_files
  FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'FISCAL_CONSULTANT', 'ACCOUNTANT'));

DROP POLICY IF EXISTS "customs_files_fiscal_accountant_select" ON public.customs_files;
CREATE POLICY "customs_files_fiscal_accountant_select" ON public.customs_files
  FOR SELECT USING (get_user_role() IN ('FISCAL_CONSULTANT', 'ACCOUNTANT'));

DROP POLICY IF EXISTS "customs_files_partner_select" ON public.customs_files;
CREATE POLICY "customs_files_partner_select" ON public.customs_files
  FOR SELECT USING (
    get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
    AND assigned_partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "customs_files_assigned_partner" ON public.customs_files;
CREATE POLICY "customs_files_assigned_partner" ON public.customs_files
  FOR SELECT TO authenticated
  USING (
    assigned_partner_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'PARTNER_COUNTRY'
  );

DROP POLICY IF EXISTS "customs_files_buyer_own" ON public.customs_files;
CREATE POLICY "customs_files_buyer_own" ON public.customs_files
  FOR SELECT TO authenticated
  USING (request_id IN (SELECT id FROM import_requests WHERE buyer_id = auth.uid()));

DROP POLICY IF EXISTS "customs_files_insert" ON public.customs_files;
CREATE POLICY "customs_files_insert" ON public.customs_files
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'PARTNER_COUNTRY'));

DROP POLICY IF EXISTS "customs_files_update" ON public.customs_files;
CREATE POLICY "customs_files_update" ON public.customs_files
  FOR UPDATE TO authenticated
  USING (
    custom_is_admin()
    OR (assigned_partner_id = auth.uid() AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'PARTNER_COUNTRY')
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'FISCAL_CONSULTANT'
  );

-- customs_declarations
DROP POLICY IF EXISTS "customs_declarations_admin_all" ON public.customs_declarations;
CREATE POLICY "customs_declarations_admin_all" ON public.customs_declarations
  FOR ALL USING (get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "customs_declarations_fiscal_all" ON public.customs_declarations;
CREATE POLICY "customs_declarations_fiscal_all" ON public.customs_declarations
  FOR ALL USING (get_user_role() = 'FISCAL_CONSULTANT');

DROP POLICY IF EXISTS "customs_declarations_partner_write" ON public.customs_declarations;
CREATE POLICY "customs_declarations_partner_write" ON public.customs_declarations
  FOR ALL USING (
    get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
    AND EXISTS (
      SELECT 1 FROM customs_files cf
      WHERE cf.id = customs_declarations.customs_file_id
        AND cf.assigned_partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "customs_declarations_read" ON public.customs_declarations;
CREATE POLICY "customs_declarations_read" ON public.customs_declarations
  FOR SELECT TO authenticated
  USING (
    custom_is_admin()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('FISCAL_CONSULTANT', 'ACCOUNTANT')
    OR customs_file_id IN (SELECT id FROM customs_files WHERE assigned_partner_id = auth.uid())
    OR customs_file_id IN (
      SELECT cf.id FROM customs_files cf
      JOIN import_requests ir ON cf.request_id = ir.id
      WHERE ir.buyer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "customs_declarations_via_file_fiscal" ON public.customs_declarations;
CREATE POLICY "customs_declarations_via_file_fiscal" ON public.customs_declarations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customs_files cf
      WHERE cf.id = customs_declarations.customs_file_id
        AND get_user_role() IN ('FISCAL_CONSULTANT', 'ACCOUNTANT')
    )
  );

DROP POLICY IF EXISTS "customs_declarations_via_file_partner" ON public.customs_declarations;
CREATE POLICY "customs_declarations_via_file_partner" ON public.customs_declarations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customs_files cf
      WHERE cf.id = customs_declarations.customs_file_id
        AND get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
        AND cf.assigned_partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "customs_declarations_write" ON public.customs_declarations;
CREATE POLICY "customs_declarations_write" ON public.customs_declarations
  FOR ALL TO authenticated
  USING (
    custom_is_admin()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('PARTNER_COUNTRY', 'FISCAL_CONSULTANT')
  )
  WITH CHECK (
    custom_is_admin()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('PARTNER_COUNTRY', 'FISCAL_CONSULTANT')
  );

-- customs_tax_lines
DROP POLICY IF EXISTS "customs_tax_lines_admin_all" ON public.customs_tax_lines;
CREATE POLICY "customs_tax_lines_admin_all" ON public.customs_tax_lines
  FOR ALL USING (get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "customs_tax_lines_fiscal_all" ON public.customs_tax_lines;
CREATE POLICY "customs_tax_lines_fiscal_all" ON public.customs_tax_lines
  FOR ALL USING (get_user_role() = 'FISCAL_CONSULTANT');

DROP POLICY IF EXISTS "customs_tax_lines_partner_write" ON public.customs_tax_lines;
CREATE POLICY "customs_tax_lines_partner_write" ON public.customs_tax_lines
  FOR ALL USING (
    get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
    AND EXISTS (
      SELECT 1 FROM customs_declarations d
      JOIN customs_files cf ON cf.id = d.customs_file_id
      WHERE d.id = customs_tax_lines.declaration_id
        AND cf.assigned_partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "customs_tax_lines_read" ON public.customs_tax_lines;
CREATE POLICY "customs_tax_lines_read" ON public.customs_tax_lines
  FOR SELECT TO authenticated
  USING (
    custom_is_admin()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('FISCAL_CONSULTANT', 'ACCOUNTANT')
    OR declaration_id IN (
      SELECT d.id FROM customs_declarations d
      JOIN customs_files cf ON d.customs_file_id = cf.id
      WHERE cf.assigned_partner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "customs_tax_lines_via_declaration" ON public.customs_tax_lines;
CREATE POLICY "customs_tax_lines_via_declaration" ON public.customs_tax_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customs_declarations d
      JOIN customs_files cf ON cf.id = d.customs_file_id
      WHERE d.id = customs_tax_lines.declaration_id
        AND (
          (get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
            AND cf.assigned_partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid()))
          OR get_user_role() IN ('FISCAL_CONSULTANT', 'ACCOUNTANT')
        )
    )
  );

DROP POLICY IF EXISTS "customs_tax_lines_write" ON public.customs_tax_lines;
CREATE POLICY "customs_tax_lines_write" ON public.customs_tax_lines
  FOR ALL TO authenticated
  USING (
    custom_is_admin()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('PARTNER_COUNTRY', 'FISCAL_CONSULTANT')
  )
  WITH CHECK (
    custom_is_admin()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('PARTNER_COUNTRY', 'FISCAL_CONSULTANT')
  );

-- customs_tax_types
DROP POLICY IF EXISTS "customs_tax_types_customs_read" ON public.customs_tax_types;
CREATE POLICY "customs_tax_types_customs_read" ON public.customs_tax_types
  FOR SELECT USING (
    get_user_role() = 'ADMIN'
    OR get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY', 'FISCAL_CONSULTANT', 'ACCOUNTANT')
  );

DROP POLICY IF EXISTS "tax_types_read_authenticated" ON public.customs_tax_types;
CREATE POLICY "tax_types_read_authenticated" ON public.customs_tax_types
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "tax_types_manage_admin" ON public.customs_tax_types;
CREATE POLICY "tax_types_manage_admin" ON public.customs_tax_types
  FOR ALL TO authenticated USING (custom_is_admin()) WITH CHECK (custom_is_admin());

-- customs_status_history
DROP POLICY IF EXISTS "customs_status_history_admin_all" ON public.customs_status_history;
CREATE POLICY "customs_status_history_admin_all" ON public.customs_status_history
  FOR ALL USING (get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "customs_history_read_privileged" ON public.customs_status_history;
CREATE POLICY "customs_history_read_privileged" ON public.customs_status_history
  FOR SELECT TO authenticated
  USING (
    custom_is_admin()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('FISCAL_CONSULTANT', 'ACCOUNTANT')
  );

DROP POLICY IF EXISTS "customs_status_history_via_file" ON public.customs_status_history;
CREATE POLICY "customs_status_history_via_file" ON public.customs_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customs_files cf
      WHERE cf.id = customs_status_history.customs_file_id
        AND (
          (get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
            AND cf.assigned_partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid()))
          OR get_user_role() IN ('FISCAL_CONSULTANT', 'ACCOUNTANT')
        )
    )
  );

-- customs_file_messages
DROP POLICY IF EXISTS "cfm_admin_select" ON public.customs_file_messages;
CREATE POLICY "cfm_admin_select" ON public.customs_file_messages
  FOR SELECT USING (get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "cfm_admin_insert" ON public.customs_file_messages;
CREATE POLICY "cfm_admin_insert" ON public.customs_file_messages
  FOR INSERT WITH CHECK (get_user_role() = 'ADMIN' AND author_id = auth.uid());

DROP POLICY IF EXISTS "cfm_partner_select" ON public.customs_file_messages;
CREATE POLICY "cfm_partner_select" ON public.customs_file_messages
  FOR SELECT USING (
    get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
    AND file_id IN (
      SELECT cf.id FROM customs_files cf
      JOIN partner_profiles pp ON pp.id = cf.assigned_partner_id
      WHERE pp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cfm_partner_insert" ON public.customs_file_messages;
CREATE POLICY "cfm_partner_insert" ON public.customs_file_messages
  FOR INSERT WITH CHECK (
    get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
    AND author_id = auth.uid()
    AND file_id IN (
      SELECT cf.id FROM customs_files cf
      JOIN partner_profiles pp ON pp.id = cf.assigned_partner_id
      WHERE pp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cfm_buyer_select" ON public.customs_file_messages;
CREATE POLICY "cfm_buyer_select" ON public.customs_file_messages
  FOR SELECT USING (
    is_internal = false
    AND get_user_role() = 'BUYER'
    AND file_id IN (
      SELECT cf.id FROM customs_files cf
      JOIN orders o ON o.id = cf.order_id
      JOIN import_requests ir ON ir.id = o.request_id
      WHERE ir.buyer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cfm_fiscal_accountant_select" ON public.customs_file_messages;
CREATE POLICY "cfm_fiscal_accountant_select" ON public.customs_file_messages
  FOR SELECT USING (
    get_user_role() IN ('FISCAL_CONSULTANT', 'ACCOUNTANT')
    AND EXISTS (SELECT 1 FROM customs_files cf WHERE cf.id = customs_file_messages.file_id)
  );

-- customs_invoices
DROP POLICY IF EXISTS "invoices_admin_all" ON public.customs_invoices;
CREATE POLICY "invoices_admin_all" ON public.customs_invoices
  FOR ALL USING (get_user_role() = 'ADMIN') WITH CHECK (get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "invoices_buyer_read" ON public.customs_invoices;
CREATE POLICY "invoices_buyer_read" ON public.customs_invoices
  FOR SELECT USING (
    billed_to_user_id = auth.uid()
    AND status IN ('SENT'::public.invoice_status, 'PAID'::public.invoice_status)
  );

DROP POLICY IF EXISTS "invoices_partner_read" ON public.customs_invoices;
CREATE POLICY "invoices_partner_read" ON public.customs_invoices
  FOR SELECT USING (
    customs_file_id IN (
      SELECT cf.id FROM customs_files cf
      JOIN partner_profiles pp ON pp.id = cf.assigned_partner_id
      WHERE pp.user_id = auth.uid()
    )
  );

-- invoice_items
DROP POLICY IF EXISTS "invoice_items_admin_all" ON public.invoice_items;
CREATE POLICY "invoice_items_admin_all" ON public.invoice_items
  FOR ALL USING (get_user_role() = 'ADMIN') WITH CHECK (get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "invoice_items_buyer_read" ON public.invoice_items;
CREATE POLICY "invoice_items_buyer_read" ON public.invoice_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM customs_invoices
      WHERE billed_to_user_id = auth.uid()
        AND status IN ('SENT'::public.invoice_status, 'PAID'::public.invoice_status)
    )
  );

DROP POLICY IF EXISTS "invoice_items_partner_read" ON public.invoice_items;
CREATE POLICY "invoice_items_partner_read" ON public.invoice_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT ci.id FROM customs_invoices ci
      JOIN customs_files cf ON cf.id = ci.customs_file_id
      JOIN partner_profiles pp ON pp.id = cf.assigned_partner_id
      WHERE pp.user_id = auth.uid()
    )
  );

-- document_access_logs (journal immuable : aucune policy UPDATE/DELETE)
DROP POLICY IF EXISTS "document_access_logs_admin_select" ON public.document_access_logs;
CREATE POLICY "document_access_logs_admin_select" ON public.document_access_logs
  FOR SELECT USING (get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "doc_access_logs_admin_read" ON public.document_access_logs;
CREATE POLICY "doc_access_logs_admin_read" ON public.document_access_logs
  FOR SELECT TO authenticated USING (custom_is_admin());

DROP POLICY IF EXISTS "document_access_logs_admin_insert" ON public.document_access_logs;
CREATE POLICY "document_access_logs_admin_insert" ON public.document_access_logs
  FOR INSERT WITH CHECK (get_user_role() = 'ADMIN' AND admin_id = auth.uid());

-- exchange_rates
DROP POLICY IF EXISTS "exchange_rates_admin_all" ON public.exchange_rates;
CREATE POLICY "exchange_rates_admin_all" ON public.exchange_rates
  FOR ALL USING (get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "exchange_rates_read_authenticated" ON public.exchange_rates;
CREATE POLICY "exchange_rates_read_authenticated" ON public.exchange_rates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "exchange_rates_insert_admin" ON public.exchange_rates;
CREATE POLICY "exchange_rates_insert_admin" ON public.exchange_rates
  FOR INSERT TO authenticated WITH CHECK (custom_is_admin());

DROP POLICY IF EXISTS "exchange_rates_update_admin" ON public.exchange_rates;
CREATE POLICY "exchange_rates_update_admin" ON public.exchange_rates
  FOR UPDATE TO authenticated USING (custom_is_admin()) WITH CHECK (custom_is_admin());

-- payment_proofs
DROP POLICY IF EXISTS "payment_proofs_admin_all" ON public.payment_proofs;
CREATE POLICY "payment_proofs_admin_all" ON public.payment_proofs
  FOR ALL USING (get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "payment_proofs_buyer_own" ON public.payment_proofs;
CREATE POLICY "payment_proofs_buyer_own" ON public.payment_proofs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "payment_proofs_buyer_insert" ON public.payment_proofs;
CREATE POLICY "payment_proofs_buyer_insert" ON public.payment_proofs
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "payment_proofs_select_own" ON public.payment_proofs;
CREATE POLICY "payment_proofs_select_own" ON public.payment_proofs
  FOR SELECT TO authenticated USING (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "payment_proofs_insert_own" ON public.payment_proofs;
CREATE POLICY "payment_proofs_insert_own" ON public.payment_proofs
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND order_id IN (
      SELECT o.id FROM orders o
      JOIN import_requests ir ON o.request_id = ir.id
      WHERE ir.buyer_id = auth.uid()
    )
  );
