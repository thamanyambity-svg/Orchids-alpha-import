-- =============================================================================
-- Le déclencheur d'inscription conserve tous les champs saisis
-- =============================================================================
--
-- handle_new_user() n'enregistrait que l'identifiant, l'adresse électronique,
-- le nom complet, le rôle et le statut. Le téléphone, la société et le type
-- d'activité étaient perdus.
--
-- La page d'inscription tentait de les écrire elle-même, côté client, juste
-- après signUp. Cela ne pouvait pas fonctionner : la confirmation d'e-mail
-- étant exigée, signUp ne renvoie aucune session, donc l'insertion partait
-- en anonyme et le RLS la refusait en 42501. L'erreur était avalée par un
-- console.error et l'utilisateur voyait « Compte créé avec succès ».
--
-- Vérifié sur un compte réel : phone, company_name et activity_type vides.
--
-- Le déclencheur est SECURITY DEFINER, il s'exécute donc au moment où la
-- ligne auth.users est créée, sans dépendre d'une session. C'est le seul
-- endroit correct pour cette écriture.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, company_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'company_name', ''),
    'BUYER',
    'PENDING'
  );

  INSERT INTO public.buyer_profiles (user_id, activity_type)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data->>'activity_type', '')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
