-- =============================================================================
-- Alpha Import Exchange - Migration: Buyer Flow Restructure
-- Migration: 20260720000001_buyer_flow_restructure
-- Description: Restructuration complète flux acheteur par catégorie
--              Proforma → PO auto → 48h annulation → Workflow sectoriel
-- Exécuter APRÈS 20260717000000_initial_schema.sql
-- =============================================================================

-- 1. NOUVEAUX ENUMS

-- Catégories de demande (remplace le champ category libre)
CREATE TYPE request_category AS ENUM (
    'TEXTILE',
    'VEHICULE',
    'ELECTRONIQUE',
    'MACHINERIE',
    'COSMETIQUE',
    'ALIMENTAIRE',
    'CONSTRUCTION',
    'AUTRE'
);

-- Incoterms 2020 officiels
CREATE TYPE incoterm AS ENUM (
    'EXW',  -- Ex Works
    'FCA',  -- Free Carrier
    'FAS',  -- Free Alongside Ship
    'FOB',  -- Free On Board
    'CFR',  -- Cost and Freight
    'CIF',  -- Cost, Insurance and Freight
    'CPT',  -- Carriage Paid To
    'CIP',  -- Carriage and Insurance Paid To
    'DAP',  -- Delivered At Place
    'DPU',  -- Delivered At Place Unloaded
    'DDP'   -- Delivered Duty Paid
);

-- Statut Proforma/Devis
CREATE TYPE quote_status AS ENUM (
    'DRAFT',          -- Brouillon partenaire
    'SUBMITTED',      -- Envoyé à l'acheteur
    'ACCEPTED',       -- Accepté par acheteur
    'REJECTED',       -- Rejeté par acheteur
    'EXPIRED',        -- Expiré (délai dépassé)
    'REVISED'         -- Révisé (nouvelle version)
);

-- Statut Bon de Commande
CREATE TYPE po_status AS ENUM (
    'GENERATED',      -- Généré auto après acceptation quote
    'PENDING_SIGNATURE', -- En attente signature acheteur (CGV)
    'SIGNED',         -- Signé (CGV acceptées)
    'CONFIRMED',      -- Confirmé (délai 48h passé)
    'CANCELLED',      -- Annulé dans les 48h
    'EXPIRED'         -- Non signé dans les délais
);

-- Type de véhicule (pour catégorie VEHICULE)
CREATE TYPE vehicle_type AS ENUM (
    'NEUF',
    'OCCASION',
    'PIECES_DETACHEES'
);

-- État véhicule
CREATE TYPE vehicle_condition AS ENUM (
    'NEUF',
    'TRES_BON',
    'BON',
    'MOYEN',
    'EPARGNE'
);

-- 2. NOUVELLES TABLES

-- Devis / Proforma (soumis par partenaire/admin)
CREATE TABLE public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.import_requests(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    status quote_status NOT NULL DEFAULT 'DRAFT',
    
    -- Prix détaillé
    unit_price_usd NUMERIC(14,2) NOT NULL,
    quantity INTEGER NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    subtotal_usd NUMERIC(14,2) GENERATED ALWAYS AS (unit_price_usd * quantity) STORED,
    
    -- Frais détaillés (tout inclus)
    freight_cost_usd NUMERIC(14,2) DEFAULT 0,
    insurance_cost_usd NUMERIC(14,2) DEFAULT 0,
    customs_duty_estimate_usd NUMERIC(14,2) DEFAULT 0,
    inspection_cost_usd NUMERIC(14,2) DEFAULT 0,
    handling_fees_usd NUMERIC(14,2) DEFAULT 0,
    other_fees_usd NUMERIC(14,2) DEFAULT 0,
    total_fees_usd NUMERIC(14,2) GENERATED ALWAYS AS (
        freight_cost_usd + insurance_cost_usd + customs_duty_estimate_usd + 
        inspection_cost_usd + handling_fees_usd + other_fees_usd
    ) STORED,
    
    -- Total final (calculé directement depuis les colonnes de base)
    grand_total_usd NUMERIC(14,2) GENERATED ALWAYS AS (
        unit_price_usd * quantity + 
        freight_cost_usd + insurance_cost_usd + customs_duty_estimate_usd + 
        inspection_cost_usd + handling_fees_usd + other_fees_usd
    ) STORED,
    
    -- Incoterm & Logistique
    incoterm incoterm NOT NULL DEFAULT 'FOB',
    port_loading TEXT,
    port_discharge TEXT,
    estimated_transit_days INTEGER,
    estimated_departure_date DATE,
    estimated_arrival_date DATE,
    
    -- Conditions
    payment_terms TEXT DEFAULT '60% deposit, 40% against documents',
    validity_days INTEGER DEFAULT 30,
    valid_until DATE, -- Calculé côté application / trigger
    
    -- Documents joints
    proforma_pdf_url TEXT,
    specifications_json JSONB DEFAULT '{}'::jsonb,
    
    -- Métadonnées
    notes TEXT,
    rejected_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ
);

-- Bon de Commande (généré auto après acceptation quote)
CREATE TABLE public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL UNIQUE REFERENCES public.quotes(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.import_requests(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL, -- Lien vers order existant
    
    -- Références
    po_number TEXT NOT NULL UNIQUE, -- PO-YYYYMMDD-XXXX
    quote_reference TEXT NOT NULL,
    
    -- Parties
    buyer_id UUID NOT NULL REFERENCES public.profiles(id),
    partner_id UUID NOT NULL REFERENCES public.partner_profiles(id),
    supplier_id UUID REFERENCES public.suppliers(id),
    
    -- Montants (repris du quote)
    grand_total_usd NUMERIC(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    deposit_percent INTEGER NOT NULL DEFAULT 60,
    balance_percent INTEGER NOT NULL DEFAULT 40,
    deposit_amount_usd NUMERIC(14,2) GENERATED ALWAYS AS (grand_total_usd * deposit_percent / 100) STORED,
    balance_amount_usd NUMERIC(14,2) GENERATED ALWAYS AS (grand_total_usd * balance_percent / 100) STORED,
    
    -- Statut PO
    status po_status NOT NULL DEFAULT 'GENERATED',
    
    -- CGV / Conditions
    cgv_version TEXT NOT NULL DEFAULT '1.0',
    cgv_accepted_at TIMESTAMPTZ,
    cgv_accepted_ip INET,
    cgv_accepted_user_agent TEXT,
    
    -- Annulation 48h
    cancellation_requested_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancellation_confirmed_at TIMESTAMPTZ,
    cancellation_confirmed_by UUID REFERENCES public.profiles(id),
    
    -- Documents générés
    po_pdf_url TEXT,
    signed_po_pdf_url TEXT,
    
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- Demandes d'annulation (traçabilité)
CREATE TABLE public.po_cancellation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.profiles(id),
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'AUTO_CONFIRMED')),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spécifications Textile (détail par ligne)
CREATE TABLE public.textile_specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.import_requests(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    
    -- Article
    product_name TEXT NOT NULL,
    category TEXT NOT NULL, -- T-shirt, Pantalon, Robe, Tissu, etc.
    composition TEXT, -- 100% Coton, 65% Polyester/35% Coton, etc.
    weight_gsm INTEGER, -- Grammage
    color_pantone TEXT, -- Code Pantone
    sizes JSONB DEFAULT '[]'::jsonb, -- ["S","M","L","XL"] avec qté par taille
    total_quantity INTEGER NOT NULL,
    unit TEXT DEFAULT 'pcs',
    
    -- Qualité & Conformité
    quality_standard TEXT, -- Oeko-Tex, GOTS, ISO, etc.
    labeling_requirements TEXT, -- Etiquettes, composition, origine
    packaging_type TEXT, -- Polybag, Carton, Suspendu
    packing_per_carton INTEGER,
    
    -- Budget
    target_price_usd NUMERIC(10,2),
    budget_min_usd NUMERIC(10,2),
    budget_max_usd NUMERIC(10,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spécifications Véhicule (détail par ligne)
CREATE TABLE public.vehicle_specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.import_requests(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    
    -- Identification
    vehicle_type vehicle_type NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    vin_prefix TEXT, -- Premiers caractères VIN si connu
    
    -- Technique
    engine_type TEXT, -- Essence, Diesel, Hybride, Electrique
    engine_displacement_cc INTEGER,
    transmission TEXT, -- Manuelle, Automatique, CVT
    drivetrain TEXT, -- FWD, RWD, AWD, 4x4
    fuel_type TEXT,
    power_kw INTEGER,
    power_hp INTEGER,
    
    -- État & Kilométrage
    condition vehicle_condition,
    mileage_km BIGINT,
    first_registration_date DATE,
    country_origin TEXT,
    
    -- Équipements & Options
    equipment_json JSONB DEFAULT '[]'::jsonb,
    color_exterior TEXT,
    color_interior TEXT,
    
    -- Documents requis
    required_documents JSONB DEFAULT '["certificate_of_conformity","registration_certificate","export_certificate"]'::jsonb,
    
    -- Quantité & Budget
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'unit',
    target_price_usd NUMERIC(14,2),
    budget_min_usd NUMERIC(14,2),
    budget_max_usd NUMERIC(14,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spécifications Générales (autres catégories)
CREATE TABLE public.general_specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.import_requests(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    specifications_json JSONB DEFAULT '{}'::jsonb, -- Flexible par catégorie
    
    -- Standards & Certifications
    required_certifications JSONB DEFAULT '[]'::jsonb, -- CE, FDA, RoHS, etc.
    hs_code TEXT, -- Code douanier (6-10 chiffres)
    
    -- Emballage & Logistique
    packaging_type TEXT,
    units_per_carton INTEGER,
    carton_dimensions_cm JSONB, -- {"L": 50, "W": 40, "H": 30}
    carton_weight_kg NUMERIC(8,2),
    
    -- Quantités & Prix
    quantity NUMERIC(14,2) NOT NULL,
    unit TEXT NOT NULL,
    target_price_usd NUMERIC(14,2),
    budget_min_usd NUMERIC(14,2),
    budget_max_usd NUMERIC(14,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MODIFICATIONS TABLES EXISTANTES

-- import_requests : ajout catégorie structurée + lien specs
ALTER TABLE public.import_requests
ADD COLUMN IF NOT EXISTS request_category request_category,
ADD COLUMN IF NOT EXISTS incoterm_preference incoterm,
ADD COLUMN IF NOT EXISTS hs_code_estimate TEXT,
ADD COLUMN IF NOT EXISTS requires_inspection BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS inspection_type TEXT DEFAULT 'PRE_SHIPMENT',
ADD COLUMN IF NOT EXISTS special_requirements TEXT;

-- quotes : index
CREATE INDEX IF NOT EXISTS idx_quotes_request_id ON public.quotes(request_id);
CREATE INDEX IF NOT EXISTS idx_quotes_partner_id ON public.quotes(partner_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON public.quotes(valid_until);

-- purchase_orders : index
CREATE INDEX IF NOT EXISTS idx_purchase_orders_quote_id ON public.purchase_orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_request_id ON public.purchase_orders(request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_buyer_id ON public.purchase_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_cgv_accepted ON public.purchase_orders(cgv_accepted_at) WHERE status IN ('GENERATED', 'PENDING_SIGNATURE', 'SIGNED');

-- textile_specifications
CREATE INDEX IF NOT EXISTS idx_textile_specs_request ON public.textile_specifications(request_id);

-- vehicle_specifications
CREATE INDEX IF NOT EXISTS idx_vehicle_specs_request ON public.vehicle_specifications(request_id);

-- general_specifications
CREATE INDEX IF NOT EXISTS idx_general_specs_request ON public.general_specifications(request_id);

-- 4. TRIGGERS updated_at

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_textile_specs_updated_at BEFORE UPDATE ON public.textile_specifications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_vehicle_specs_updated_at BEFORE UPDATE ON public.vehicle_specifications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_general_specs_updated_at BEFORE UPDATE ON public.general_specifications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. FONCTIONS MÉTIER

-- Générer numéro PO unique
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TEXT AS $$
DECLARE
    v_date TEXT := to_char(NOW(), 'YYYYMMDD');
    v_random TEXT;
    v_po_num TEXT;
BEGIN
    LOOP
        v_random := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        v_po_num := 'PO-' || v_date || '-' || v_random;
        IF NOT EXISTS (SELECT 1 FROM public.purchase_orders WHERE po_number = v_po_num) THEN
            RETURN v_po_num;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Auto-créer PO à l'acceptation d'un quote
CREATE OR REPLACE FUNCTION public.create_po_from_accepted_quote()
RETURNS TRIGGER AS $$
DECLARE
    v_request RECORD;
    v_buyer_id UUID;
    v_po_id UUID;
BEGIN
    -- Seulement si quote passe à ACCEPTED
    IF NEW.status = 'ACCEPTED' AND (OLD.status IS DISTINCT FROM 'ACCEPTED') THEN
        -- Récupérer la request
        SELECT * INTO v_request FROM public.import_requests WHERE id = NEW.request_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Request not found: %', NEW.request_id;
        END IF;
        v_buyer_id := v_request.buyer_id;
        
        -- Créer le PO
        INSERT INTO public.purchase_orders (
            quote_id,
            request_id,
            po_number,
            quote_reference,
            buyer_id,
            partner_id,
            grand_total_usd,
            currency,
            deposit_percent,
            balance_percent,
            status
        ) VALUES (
            NEW.id,
            NEW.request_id,
            public.generate_po_number(),
            'QUOTE-' || NEW.id::TEXT,
            v_buyer_id,
            NEW.partner_id,
            NEW.grand_total_usd,
            NEW.currency,
            60,
            40,
            'GENERATED'
        ) RETURNING id INTO v_po_id;
        
        -- Mettre à jour la request
        UPDATE public.import_requests 
        SET status = 'QUOTE_ACCEPTED', updated_at = NOW()
        WHERE id = NEW.request_id;
        
        -- Notifier (via n8n ou notification interne)
        PERFORM public.log_audit(
            NULL, 'PO_AUTO_GENERATED', 'purchase_orders', v_po_id,
            jsonb_build_object('quote_id', NEW.id, 'request_id', NEW.request_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_po_from_quote
    AFTER UPDATE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.create_po_from_accepted_quote();

-- Auto-confirmer PO après 48h (cron job ou trigger sur lecture)
CREATE OR REPLACE FUNCTION public.auto_confirm_po()
RETURNS VOID AS $$
BEGIN
    UPDATE public.purchase_orders
    SET status = 'CONFIRMED', confirmed_at = NOW(), updated_at = NOW()
    WHERE status IN ('GENERATED', 'PENDING_SIGNATURE', 'SIGNED')
      AND cgv_accepted_at IS NOT NULL
      AND (cgv_accepted_at + interval '48 hours') <= NOW();
    
    -- Créer l'order correspondant si pas encore fait
    INSERT INTO public.orders (
        request_id,
        reference,
        total_amount,
        alpha_commission,
        partner_payout,
        status,
        validated_by_admin,
        deposit_amount,
        balance_amount,
        deposit_paid,
        balance_paid,
        escrow_activated
    )
    SELECT 
        po.request_id,
        po.po_number,
        po.grand_total_usd,
        po.grand_total_usd * 0.10,
        po.grand_total_usd * 0.90,
        'AWAITING_DEPOSIT',
        TRUE,
        po.grand_total_usd * po.deposit_percent / 100,
        po.grand_total_usd * po.balance_percent / 100,
        FALSE,
        FALSE,
        TRUE
    FROM public.purchase_orders po
    WHERE po.status = 'CONFIRMED'
      AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.reference = po.po_number)
    ON CONFLICT (reference) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Demander annulation PO (dans les 48h)
CREATE OR REPLACE FUNCTION public.request_po_cancellation(
    p_po_id UUID,
    p_requested_by UUID,
    p_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_po RECORD;
    v_can_cancel BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_po FROM public.purchase_orders WHERE id = p_po_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PO not found';
    END IF;
    
    -- Vérifier délai 48h (calculé depuis cgv_accepted_at + 48h)
    IF v_po.cgv_accepted_at IS NOT NULL 
       AND (v_po.cgv_accepted_at + interval '48 hours') > NOW()
       AND v_po.status IN ('GENERATED', 'PENDING_SIGNATURE', 'SIGNED') THEN
        v_can_cancel := TRUE;
    END IF;
    
    IF NOT v_can_cancel THEN
        RETURN FALSE;
    END IF;
    
    -- Créer demande annulation
    INSERT INTO public.po_cancellation_requests (po_id, requested_by, reason)
    VALUES (p_po_id, p_requested_by, p_reason);
    
    -- Mettre à jour PO
    UPDATE public.purchase_orders
    SET status = 'CANCELLED',
        cancellation_requested_at = NOW(),
        cancellation_reason = p_reason,
        cancellation_confirmed_at = NOW(),
        cancellation_confirmed_by = p_requested_by,
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_po_id;
    
    -- Annuler l'order lié si existe
    UPDATE public.orders
    SET status = 'CANCELLED', updated_at = NOW()
    WHERE reference = v_po.po_number;
    
    -- Audit
    PERFORM public.log_audit(
        p_requested_by, 'PO_CANCELLED', 'purchase_orders', p_po_id,
        jsonb_build_object('reason', p_reason, 'within_48h', TRUE)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS POLICIES

-- Quotes
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Acheteur : voir les quotes de ses requests
DROP POLICY IF EXISTS "quotes_buyer_select" ON public.quotes;
CREATE POLICY "quotes_buyer_select" ON public.quotes
    FOR SELECT USING (
        request_id IN (SELECT id FROM public.import_requests WHERE buyer_id = auth.uid())
    );

-- Partenaire : voir/créer/modifier ses quotes
DROP POLICY IF EXISTS "quotes_partner_all" ON public.quotes;
CREATE POLICY "quotes_partner_all" ON public.quotes
    FOR ALL USING (
        partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
    );

-- Admin : tout
DROP POLICY IF EXISTS "quotes_admin_all" ON public.quotes;
CREATE POLICY "quotes_admin_all" ON public.quotes
    FOR ALL USING (public.get_user_role() = 'ADMIN');

-- Purchase Orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "po_buyer_select" ON public.purchase_orders;
CREATE POLICY "po_buyer_select" ON public.purchase_orders
    FOR SELECT USING (buyer_id = auth.uid());

DROP POLICY IF EXISTS "po_buyer_update_cgv" ON public.purchase_orders;
CREATE POLICY "po_buyer_update_cgv" ON public.purchase_orders
    FOR UPDATE USING (buyer_id = auth.uid())
    WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS "po_partner_select" ON public.purchase_orders;
CREATE POLICY "po_partner_select" ON public.purchase_orders
    FOR SELECT USING (
        partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "po_admin_all" ON public.purchase_orders;
CREATE POLICY "po_admin_all" ON public.purchase_orders
    FOR ALL USING (public.get_user_role() = 'ADMIN');

-- PO Cancellation Requests
ALTER TABLE public.po_cancellation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "po_cancel_buyer" ON public.po_cancellation_requests;
CREATE POLICY "po_cancel_buyer" ON public.po_cancellation_requests
    FOR ALL USING (
        po_id IN (SELECT id FROM public.purchase_orders WHERE buyer_id = auth.uid())
    );

DROP POLICY IF EXISTS "po_cancel_admin" ON public.po_cancellation_requests;
CREATE POLICY "po_cancel_admin" ON public.po_cancellation_requests
    FOR ALL USING (public.get_user_role() = 'ADMIN');

-- Specifications tables
ALTER TABLE public.textile_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_specifications ENABLE ROW LEVEL SECURITY;

-- Acheteur : ses specs
DROP POLICY IF EXISTS "textile_specs_buyer" ON public.textile_specifications;
CREATE POLICY "textile_specs_buyer" ON public.textile_specifications
    FOR ALL USING (
        request_id IN (SELECT id FROM public.import_requests WHERE buyer_id = auth.uid())
    );

DROP POLICY IF EXISTS "vehicle_specs_buyer" ON public.vehicle_specifications;
CREATE POLICY "vehicle_specs_buyer" ON public.vehicle_specifications
    FOR ALL USING (
        request_id IN (SELECT id FROM public.import_requests WHERE buyer_id = auth.uid())
    );

DROP POLICY IF EXISTS "general_specs_buyer" ON public.general_specifications;
CREATE POLICY "general_specs_buyer" ON public.general_specifications
    FOR ALL USING (
        request_id IN (SELECT id FROM public.import_requests WHERE buyer_id = auth.uid())
    );

-- Partenaire : specs de ses requests assignées
DROP POLICY IF EXISTS "textile_specs_partner" ON public.textile_specifications;
CREATE POLICY "textile_specs_partner" ON public.textile_specifications
    FOR SELECT USING (
        request_id IN (
            SELECT id FROM public.import_requests 
            WHERE assigned_partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "vehicle_specs_partner" ON public.vehicle_specifications;
CREATE POLICY "vehicle_specs_partner" ON public.vehicle_specifications
    FOR SELECT USING (
        request_id IN (
            SELECT id FROM public.import_requests 
            WHERE assigned_partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "general_specs_partner" ON public.general_specifications;
CREATE POLICY "general_specs_partner" ON public.general_specifications
    FOR SELECT USING (
        request_id IN (
            SELECT id FROM public.import_requests 
            WHERE assigned_partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
        )
    );

-- Admin : tout
DROP POLICY IF EXISTS "specs_admin" ON public.textile_specifications;
CREATE POLICY "specs_admin" ON public.textile_specifications FOR ALL USING (public.get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "specs_admin_v" ON public.vehicle_specifications;
CREATE POLICY "specs_admin_v" ON public.vehicle_specifications FOR ALL USING (public.get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "specs_admin_g" ON public.general_specifications;
CREATE POLICY "specs_admin_g" ON public.general_specifications FOR ALL USING (public.get_user_role() = 'ADMIN');

-- 7. SEED: Catégories par défaut (mapping ancien -> nouveau)
-- Les anciennes catégories textuelles sont mappées vers les enums