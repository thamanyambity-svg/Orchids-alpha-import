-- =============================================================================
-- Alpha Import Exchange — Agent de Sourcing IA
-- Migration: 20260720100000_sourcing_agent
-- Description: Tables sourcing_sessions, sourcing_matches + évolution suppliers
-- =============================================================================

-- ── 1. ENUM pour les statuts de sourcing ─────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE sourcing_session_status AS ENUM (
        'RUNNING',          -- agent en cours d'exécution
        'PENDING_REVIEW',   -- shortlist prête, en attente validation Partner
        'VALIDATED',        -- Partner a approuvé, en attente envoi Admin
        'SENT',             -- RFQ envoyés aux fournisseurs
        'FAILED',           -- erreur IA ou aucun match
        'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE sourcing_match_status AS ENUM (
        'PENDING',    -- en attente validation Partner
        'APPROVED',   -- Partner a approuvé ce match
        'REJECTED',   -- Partner a rejeté ce match
        'SENT'        -- email RFQ envoyé à ce fournisseur
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. ÉVOLUTION DE LA TABLE SUPPLIERS ───────────────────────────────────────
-- Nouveaux champs nécessaires pour le scoring IA

ALTER TABLE public.suppliers
    ADD COLUMN IF NOT EXISTS categories        TEXT[]          DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS product_tags      TEXT[]          DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS certifications    TEXT[]          DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS min_order_qty     INTEGER,
    ADD COLUMN IF NOT EXISTS lead_time_days    INTEGER,
    ADD COLUMN IF NOT EXISTS country_id        UUID            REFERENCES public.countries(id),
    ADD COLUMN IF NOT EXISTS language          TEXT            DEFAULT 'en',  -- langue principale du fournisseur
    ADD COLUMN IF NOT EXISTS website           TEXT,
    ADD COLUMN IF NOT EXISTS speciality        TEXT;           -- description courte du domaine

-- ── 3. TABLE sourcing_sessions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sourcing_sessions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id          UUID            NOT NULL REFERENCES public.import_requests(id) ON DELETE CASCADE,
    partner_id          UUID            NOT NULL REFERENCES public.partner_profiles(id),
    status              sourcing_session_status NOT NULL DEFAULT 'RUNNING',
    ai_reasoning        TEXT,                   -- explication globale de l'agent IA
    ai_model            TEXT DEFAULT 'gemini-2.0-flash',
    suppliers_evaluated INTEGER DEFAULT 0,      -- nombre de suppliers évalués
    matches_count       INTEGER DEFAULT 0,      -- nombre de matches retenus
    rfq_sent_at         TIMESTAMPTZ,
    validated_by        UUID            REFERENCES public.profiles(id),
    validated_at        TIMESTAMPTZ,
    partner_notes       TEXT,
    error_message       TEXT,                   -- si status = FAILED
    created_at          TIMESTAMPTZ     DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     DEFAULT NOW()
);

-- ── 4. TABLE sourcing_matches ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sourcing_matches (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID            NOT NULL REFERENCES public.sourcing_sessions(id) ON DELETE CASCADE,
    supplier_id         UUID            NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    score               NUMERIC(4,1)    NOT NULL,   -- score IA 0.0 à 10.0
    ai_reason           TEXT,                       -- pourquoi ce fournisseur
    rfq_message_en      TEXT,                       -- message RFQ en anglais
    rfq_message_local   TEXT,                       -- message RFQ en langue locale
    status              sourcing_match_status NOT NULL DEFAULT 'PENDING',
    partner_notes       TEXT,                       -- notes du partenaire sur ce match
    email_sent_at       TIMESTAMPTZ,
    email_message_id    TEXT,                       -- ID Resend pour traçabilité
    created_at          TIMESTAMPTZ     DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     DEFAULT NOW()
);

-- ── 5. INDEX DE PERFORMANCE ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sourcing_sessions_request_id   ON public.sourcing_sessions(request_id);
CREATE INDEX IF NOT EXISTS idx_sourcing_sessions_partner_id   ON public.sourcing_sessions(partner_id);
CREATE INDEX IF NOT EXISTS idx_sourcing_sessions_status       ON public.sourcing_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sourcing_matches_session_id    ON public.sourcing_matches(session_id);
CREATE INDEX IF NOT EXISTS idx_sourcing_matches_supplier_id   ON public.sourcing_matches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sourcing_matches_status        ON public.sourcing_matches(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_categories           ON public.suppliers USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_suppliers_country_id           ON public.suppliers(country_id);

-- ── 6. RLS POLICIES ─────────────────────────────────────────────────────────
ALTER TABLE public.sourcing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sourcing_matches  ENABLE ROW LEVEL SECURITY;

-- sourcing_sessions: ADMIN voit tout
CREATE POLICY "admin_all_sourcing_sessions"
    ON public.sourcing_sessions FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- sourcing_sessions: PARTNER voit ses sessions
CREATE POLICY "partner_own_sourcing_sessions"
    ON public.sourcing_sessions FOR SELECT
    USING (
        partner_id IN (
            SELECT id FROM public.partner_profiles WHERE user_id = auth.uid()
        )
    );

-- sourcing_sessions: PARTNER peut update ses sessions (valider/rejeter)
CREATE POLICY "partner_update_own_sourcing_sessions"
    ON public.sourcing_sessions FOR UPDATE
    USING (
        partner_id IN (
            SELECT id FROM public.partner_profiles WHERE user_id = auth.uid()
        )
    );

-- sourcing_matches: ADMIN voit tout
CREATE POLICY "admin_all_sourcing_matches"
    ON public.sourcing_matches FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- sourcing_matches: PARTNER voit les matches de ses sessions
CREATE POLICY "partner_own_sourcing_matches"
    ON public.sourcing_matches FOR SELECT
    USING (
        session_id IN (
            SELECT ss.id FROM public.sourcing_sessions ss
            JOIN public.partner_profiles pp ON pp.id = ss.partner_id
            WHERE pp.user_id = auth.uid()
        )
    );

-- sourcing_matches: PARTNER peut update (approuver/rejeter)
CREATE POLICY "partner_update_own_sourcing_matches"
    ON public.sourcing_matches FOR UPDATE
    USING (
        session_id IN (
            SELECT ss.id FROM public.sourcing_sessions ss
            JOIN public.partner_profiles pp ON pp.id = ss.partner_id
            WHERE pp.user_id = auth.uid()
        )
    );

-- ── 7. REALTIME: activer pour notifications temps réel ───────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.sourcing_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sourcing_matches;

-- ── 8. TRIGGER updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sourcing_sessions_updated_at
    BEFORE UPDATE ON public.sourcing_sessions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_sourcing_matches_updated_at
    BEFORE UPDATE ON public.sourcing_matches
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
