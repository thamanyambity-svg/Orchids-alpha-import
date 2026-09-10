-- ============================================================================
-- Espaces de stockage des fichiers
-- ============================================================================
-- Le projet n'avait AUCUN espace de stockage : chaque envoi — pièce KYC,
-- photo de profil, document de demande, preuve de paiement, facture, dossier
-- de candidature partenaire — échouait avec « Bucket not found ».
--
-- Seules les photos de profil sont publiques. Tout le reste est privé : les
-- fichiers ne s'ouvrent que par /api/files, qui vérifie à chaque ouverture que
-- l'appelant y a droit, puis délivre un lien signé valable deux minutes.
--
-- Les dépôts KYC et les factures passent par le serveur (clé de service) : ils
-- n'ont besoin d'aucune règle ici. Les règles ci-dessous ne concernent que les
-- dépôts faits directement depuis le navigateur.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('invoices', 'invoices', false, 10485760,
    ARRAY['application/pdf']),
  ('compliance-documents', 'compliance-documents', false, 10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Rejouable sans erreur.
DROP POLICY IF EXISTS "avatars_depot_propre_dossier"      ON storage.objects;
DROP POLICY IF EXISTS "avatars_modif_proprietaire"        ON storage.objects;
DROP POLICY IF EXISTS "avatars_suppr_proprietaire"        ON storage.objects;
DROP POLICY IF EXISTS "documents_depot_connecte"          ON storage.objects;
DROP POLICY IF EXISTS "documents_suppr_proprietaire"      ON storage.objects;
DROP POLICY IF EXISTS "candidatures_depot_public"         ON storage.objects;

-- Photos de profil : chacun dépose dans son propre dossier <compte>/…
CREATE POLICY "avatars_depot_propre_dossier" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_modif_proprietaire" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text);

CREATE POLICY "avatars_suppr_proprietaire" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text);

-- Documents de demande et preuves de paiement : dépôt par un compte connecté,
-- uniquement dans ces deux dossiers. Le dossier kyc/ est réservé au serveur.
-- Aucune règle de lecture : la lecture passe exclusivement par /api/files.
CREATE POLICY "documents_depot_connecte" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN ('payment-proofs', 'requests')
  );

CREATE POLICY "documents_suppr_proprietaire" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND owner_id = auth.uid()::text);

-- Candidatures partenaires : le formulaire public dépose sans compte, dans le
-- seul dossier partner-applications/. Lecture réservée à l'administration.
CREATE POLICY "candidatures_depot_public" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(name))[1] = 'partner-applications'
  );

-- Contrôle : doit afficher 4 lignes (avatars public, les 3 autres privés).
SELECT id, public, file_size_limit FROM storage.buckets ORDER BY id;
