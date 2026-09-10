-- ============================================================================
-- Réparation du partenaire de Dubaï — Achignon Bilongo
-- ============================================================================
-- Lors de sa création depuis Admin → Partenaires, la mise à jour de son profil
-- a touché zéro ligne sans erreur (droits RLS de la session admin). Résultat :
-- rôle resté BUYER, société / téléphone / ville perdus. La fiche partenaire,
-- elle, a bien été créée.
--
-- Ce script ne remplit QUE les champs vides et bascule le rôle. Il n'écrase
-- rien de ce qui a été saisi. Le numéro WhatsApp n'est pas touché.
-- ============================================================================

UPDATE public.profiles
SET
  role         = 'PARTNER',
  company_name = COALESCE(NULLIF(company_name, ''), 'MAARMALA SARL'),
  phone        = COALESCE(NULLIF(phone, ''), '+971501201719'),
  city         = COALESCE(NULLIF(city, ''), 'Dubaï'),
  country_id   = COALESCE(country_id, (SELECT id FROM public.countries WHERE code = 'AE')),
  updated_at   = NOW()
WHERE email = 'achignon.pdg.maarmala.uae@aonosekehouseinvestmentdrc.site';

-- Contrôle : doit afficher une ligne, rôle PARTNER.
SELECT full_name, role, company_name, phone, city
FROM public.profiles
WHERE email = 'achignon.pdg.maarmala.uae@aonosekehouseinvestmentdrc.site';
