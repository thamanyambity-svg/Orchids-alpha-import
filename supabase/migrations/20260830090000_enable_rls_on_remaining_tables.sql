-- =============================================================================
-- Row Level Security sur les deux tables qui en étaient dépourvues
-- =============================================================================
--
-- Un audit du schéma a relevé que 42 des 44 tables publiques activaient RLS.
-- Les deux restantes étaient donc entièrement lisibles et modifiables par
-- quiconque dispose de la clé anon, que PostgREST expose au navigateur :
--
--   newsletter_subscribers — la liste complète des adresses électroniques
--     collectées sur le site, exportable en une requête ;
--   sourcing_matches — les fournisseurs proposés par l'agent, leur score, la
--     justification de l'IA et le texte des demandes de cotation, y compris
--     les sessions d'autres partenaires.
--
-- Les politiques suivent le modèle déjà en place sur sourcing_sessions.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- newsletter_subscribers
--
-- L'inscription reste ouverte : la route publique /api/newsletter/subscribe
-- doit pouvoir insérer sans compte. La lecture, elle, est réservée aux
-- administrateurs — c'est un fichier de contacts.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_subscribe_public" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_subscribe_public"
    ON public.newsletter_subscribers FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "newsletter_admin_read" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_admin_read"
    ON public.newsletter_subscribers FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

DROP POLICY IF EXISTS "newsletter_admin_write" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_admin_write"
    ON public.newsletter_subscribers FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

DROP POLICY IF EXISTS "newsletter_admin_delete" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_admin_delete"
    ON public.newsletter_subscribers FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- sourcing_matches
--
-- Un match appartient à la session qui l'a produit : un partenaire ne voit que
-- les siens, exactement comme pour sourcing_sessions. L'écriture vient de
-- l'agent, qui opère avec la clé de service et n'est donc pas soumis au RLS ;
-- le partenaire peut seulement annoter et statuer sur ses propres matches.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.sourcing_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_sourcing_matches" ON public.sourcing_matches;
CREATE POLICY "admin_all_sourcing_matches"
    ON public.sourcing_matches FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

DROP POLICY IF EXISTS "partner_own_sourcing_matches" ON public.sourcing_matches;
CREATE POLICY "partner_own_sourcing_matches"
    ON public.sourcing_matches FOR SELECT
    USING (
        session_id IN (
            SELECT s.id FROM public.sourcing_sessions s
            WHERE s.partner_id IN (
                SELECT p.id FROM public.partner_profiles p WHERE p.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "partner_update_own_sourcing_matches" ON public.sourcing_matches;
CREATE POLICY "partner_update_own_sourcing_matches"
    ON public.sourcing_matches FOR UPDATE
    USING (
        session_id IN (
            SELECT s.id FROM public.sourcing_sessions s
            WHERE s.partner_id IN (
                SELECT p.id FROM public.partner_profiles p WHERE p.user_id = auth.uid()
            )
        )
    );
