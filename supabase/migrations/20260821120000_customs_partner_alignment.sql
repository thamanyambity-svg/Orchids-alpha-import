-- =============================================================================
-- Douanes : aligner les policies sur les rôles qui existent réellement
-- =============================================================================
--
-- Les policies du module douanier ont été écrites pour un modèle à cinq rôles
-- (ADMIN, PARTNER_COUNTRY, FISCAL_CONSULTANT, ACCOUNTANT, BUYER). Ce produit
-- n'en a que trois : BUYER, PARTNER, ADMIN (`user_role`, src/lib/types.ts).
--
-- Conséquences concrètes en l'état :
--   - `customs_files_update` n'accorde le droit au partenaire que si son rôle
--     vaut 'PARTNER_COUNTRY' : aucun partenaire ne peut faire avancer un
--     dossier, la moitié partenaire du module est donc morte ;
--   - `customs_files_insert` n'autorise que ADMIN et PARTNER_COUNTRY ;
--   - les branches FISCAL_CONSULTANT / ACCOUNTANT ne peuvent jamais matcher.
--
-- Second problème, laissé explicitement en suspens par
-- 20260801130000_fix_assigned_partner_fk.sql : `customs_files.assigned_partner_id`
-- référence `profiles(id)`, alors que les policies le comparent tantôt à
-- `auth.uid()` (donc un profiles.id), tantôt à `partner_profiles.id`. Un
-- partenaire pouvait ainsi obtenir le droit d'écrire un dossier qu'il n'avait
-- pas le droit de lire.
--
-- On tranche ici dans le sens du reste du produit — `partner_profiles(id)`,
-- comme `import_requests.assigned_partner_id` — et on réécrit les policies pour
-- qu'elles s'appuient toutes sur la même définition. Les rôles fantômes sont
-- conservés dans les listes : ils ne matchent rien aujourd'hui et n'ouvrent donc
-- aucun accès, mais ils évitent d'avoir à réécrire ces policies si le modèle de
-- rôles s'enrichit.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. La clé étrangère suit la convention du produit.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
  FROM pg_constraint
  WHERE conrelid = 'public.customs_files'::regclass
    AND conname = 'customs_files_assigned_partner_id_fkey';

  IF v_def IS NULL OR v_def LIKE '%partner_profiles%' THEN
    RETURN; -- déjà correcte, ou contrainte absente
  END IF;

  IF EXISTS (SELECT 1 FROM public.customs_files WHERE assigned_partner_id IS NOT NULL) THEN
    RAISE EXCEPTION
      'customs_files.assigned_partner_id contient des valeurs : reprise manuelle requise '
      '(ce sont des profiles.id, à convertir en partner_profiles.id).';
  END IF;

  ALTER TABLE public.customs_files
    DROP CONSTRAINT customs_files_assigned_partner_id_fkey;

  ALTER TABLE public.customs_files
    ADD CONSTRAINT customs_files_assigned_partner_id_fkey
    FOREIGN KEY (assigned_partner_id)
    REFERENCES public.partner_profiles(id) ON DELETE SET NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Une seule définition de « le partenaire assigné », réutilisée partout.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_assigned_customs_partner(p_file_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.customs_files cf
    JOIN public.partner_profiles pp ON pp.id = cf.assigned_partner_id
    WHERE cf.id = p_file_id
      AND pp.user_id = auth.uid()
      AND public.get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
  );
$$;

REVOKE ALL ON FUNCTION public.is_assigned_customs_partner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_assigned_customs_partner(uuid) TO authenticated;

COMMENT ON FUNCTION public.is_assigned_customs_partner(uuid) IS
  'Vrai si l''utilisateur courant est le partenaire assigné au dossier douanier. Définition unique réutilisée par les policies du module.';

-- -----------------------------------------------------------------------------
-- 3. customs_files
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "customs_files_partner_select" ON public.customs_files;
CREATE POLICY "customs_files_partner_select" ON public.customs_files
  FOR SELECT TO authenticated
  USING (public.is_assigned_customs_partner(id));

DROP POLICY IF EXISTS "customs_files_assigned_partner" ON public.customs_files;

DROP POLICY IF EXISTS "customs_files_insert" ON public.customs_files;
CREATE POLICY "customs_files_insert" ON public.customs_files
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('ADMIN', 'PARTNER', 'PARTNER_COUNTRY'));

DROP POLICY IF EXISTS "customs_files_update" ON public.customs_files;
CREATE POLICY "customs_files_update" ON public.customs_files
  FOR UPDATE TO authenticated
  USING (
    public.custom_is_admin()
    OR public.is_assigned_customs_partner(id)
    OR public.get_user_role() = 'FISCAL_CONSULTANT'
  );

-- -----------------------------------------------------------------------------
-- 4. customs_declarations — le partenaire assigné écrit la déclaration
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "customs_declarations_partner_write" ON public.customs_declarations;
CREATE POLICY "customs_declarations_partner_write" ON public.customs_declarations
  FOR ALL TO authenticated
  USING (public.is_assigned_customs_partner(customs_file_id))
  WITH CHECK (public.is_assigned_customs_partner(customs_file_id));

-- -----------------------------------------------------------------------------
-- 5. customs_file_messages — mêmes règles, définition unique
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "cfm_partner_select" ON public.customs_file_messages;
CREATE POLICY "cfm_partner_select" ON public.customs_file_messages
  FOR SELECT TO authenticated
  USING (public.is_assigned_customs_partner(file_id));

DROP POLICY IF EXISTS "cfm_partner_insert" ON public.customs_file_messages;
CREATE POLICY "cfm_partner_insert" ON public.customs_file_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_assigned_customs_partner(file_id)
  );

-- -----------------------------------------------------------------------------
-- 6. customs_status_history — lecture partenaire alignée
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "customs_status_history_via_file" ON public.customs_status_history;
CREATE POLICY "customs_status_history_via_file" ON public.customs_status_history
  FOR SELECT TO authenticated
  USING (
    public.is_assigned_customs_partner(customs_file_id)
    OR public.get_user_role() IN ('FISCAL_CONSULTANT', 'ACCOUNTANT')
  );
