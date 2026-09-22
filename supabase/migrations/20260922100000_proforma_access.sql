-- ============================================================================
-- Pro formas : qui lit quoi, qui écrit quoi
-- ============================================================================
-- Circuit : le partenaire prépare (brouillon) → Alpha Import valide → le
-- client accepte ou demande une révision. Toutes les écritures passent par
-- les routes serveur, qui vérifient chaque étape.
--
-- Deux règles d'accès contredisaient ce circuit :
--  - le client lisait TOUS les devis de ses demandes, brouillons compris,
--    avant toute vérification par Alpha Import ;
--  - le partenaire pouvait MODIFIER ses devis directement depuis le
--    navigateur, donc se transmettre lui-même un devis au client sans
--    validation, ou changer un montant après validation.
-- ============================================================================

DROP POLICY IF EXISTS "quotes_buyer_select" ON public.quotes;
CREATE POLICY "quotes_buyer_select" ON public.quotes
  FOR SELECT USING (
    submitted_at IS NOT NULL
    AND request_id IN (SELECT id FROM public.import_requests WHERE buyer_id = auth.uid())
  );

DROP POLICY IF EXISTS "quotes_partner_all" ON public.quotes;
DROP POLICY IF EXISTS "quotes_partner_select" ON public.quotes;
CREATE POLICY "quotes_partner_select" ON public.quotes
  FOR SELECT USING (
    partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
  );
