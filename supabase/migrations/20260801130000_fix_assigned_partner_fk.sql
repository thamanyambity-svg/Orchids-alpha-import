-- =============================================================================
-- import_requests.assigned_partner_id : pointer vers partner_profiles
-- =============================================================================
--
-- Sur la base restaurée, la clé étrangère visait `profiles(id)`. Le repo la
-- déclare pourtant vers `partner_profiles(id)`
-- (20260717000000_initial_schema.sql), et tout le code la lit ainsi :
--
--   - src/app/api/quotes/route.ts compare `importRequest.assigned_partner_id`
--     à l'id d'une ligne partner_profiles ;
--   - `quotes.partner_id` et `purchase_orders.partner_id` référencent
--     partner_profiles(id) et sont alimentés depuis cette valeur.
--
-- Conséquence de la divergence : assigner une demande stockait un profiles.id,
-- que la comparaison côté API ne pouvait jamais faire correspondre — tout
-- partenaire recevait « Not assigned to this request » (403), et l'insertion du
-- devis aurait de toute façon violé la FK de quotes. Le flux devis → bon de
-- commande était donc inatteignable.
--
-- Aucune donnée à reprendre : la colonne est NULL sur toutes les lignes.
--
-- À noter, même motif non tranché ailleurs : `customs_files.assigned_partner_id`
-- référence profiles(id) tandis que ses policies le comparent tantôt à
-- auth.uid(), tantôt à partner_profiles.id. Ce fichier ne touche pas aux
-- douanes.
-- =============================================================================

DO $$
DECLARE
  v_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
  FROM pg_constraint
  WHERE conrelid = 'public.import_requests'::regclass
    AND conname = 'import_requests_assigned_partner_id_fkey';

  IF v_def IS NULL OR v_def LIKE '%partner_profiles%' THEN
    RETURN; -- déjà correcte, ou absente (base neuve créée depuis le repo)
  END IF;

  IF EXISTS (SELECT 1 FROM public.import_requests WHERE assigned_partner_id IS NOT NULL) THEN
    RAISE EXCEPTION
      'assigned_partner_id contient des valeurs : reprise manuelle requise '
      '(les ids actuels sont des profiles.id, il faut les convertir en partner_profiles.id).';
  END IF;

  ALTER TABLE public.import_requests
    DROP CONSTRAINT import_requests_assigned_partner_id_fkey;

  ALTER TABLE public.import_requests
    ADD CONSTRAINT import_requests_assigned_partner_id_fkey
    FOREIGN KEY (assigned_partner_id)
    REFERENCES public.partner_profiles(id) ON DELETE SET NULL;
END $$;
