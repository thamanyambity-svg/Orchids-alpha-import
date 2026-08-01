-- =============================================================================
-- Champs opérationnels du partenaire
-- =============================================================================
--
-- L'identité (nom, société, email, téléphone) reste sur `profiles` ;
-- `partner_profiles` porte le rôle commercial. C'est la répartition consolidée
-- en corrigeant les trois routes API qui interrogeaient à tort
-- `partner_profiles.full_name`.
--
-- Ces colonnes manquaient entièrement : le numéro WhatsApp n'existait que codé
-- en dur dans `mockPartners`, côté acheteur.
-- =============================================================================

ALTER TABLE public.partner_profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS address_line    TEXT,
  ADD COLUMN IF NOT EXISTS postal_code     TEXT,
  ADD COLUMN IF NOT EXISTS timezone        TEXT,
  ADD COLUMN IF NOT EXISTS languages       TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pro_email       TEXT,
  ADD COLUMN IF NOT EXISTS application_id  UUID REFERENCES public.partner_applications(id) ON DELETE SET NULL;

-- Le numéro est une clé de contact métier : il ne doit pas pouvoir entrer sous
-- une forme non normalisée, sinon les liens wa.me et les envois futurs échouent
-- silencieusement. E.164 : '+', indicatif sans zéro initial, 8 à 15 chiffres.
DO $$
BEGIN
  ALTER TABLE public.partner_profiles
    ADD CONSTRAINT partner_profiles_whatsapp_e164
    CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^\+[1-9][0-9]{7,14}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_profiles_application
  ON public.partner_profiles(application_id);

COMMENT ON COLUMN public.partner_profiles.pro_email IS
  'Adresse professionnelle du partenaire. Vide tant que le provisionnement par alias n''est pas en place.';
COMMENT ON COLUMN public.partner_profiles.application_id IS
  'Candidature d''origine — traçabilité conformité entre le partenaire actif et son dossier.';
