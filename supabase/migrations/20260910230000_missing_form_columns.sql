-- ============================================================================
-- Colonnes écrites par le code mais absentes de la base
-- ============================================================================
-- Chaque écriture ci-dessous échouait en production :
-- - formulaire de contact public : `phone` et `type` → aucun message reçu ;
-- - candidature partenaire : `company_details` et `agreements`, lus par la
--   fiche de candidature admin → aucune candidature enregistrée ;
-- - relances automatiques : `last_reminded_at` → la route de relance échouait
--   dès sa première requête.
-- ============================================================================

ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS type  TEXT;

ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS company_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS agreements      JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.import_requests
  ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
