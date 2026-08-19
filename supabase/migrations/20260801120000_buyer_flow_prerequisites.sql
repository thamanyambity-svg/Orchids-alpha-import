-- =============================================================================
-- Prérequis du flux acheteur (devis → bon de commande)
-- =============================================================================
--
-- 20260720000001_buyer_flow_restructure.sql s'appuie sur trois choses qui
-- n'existent pas : deux fonctions et une valeur de statut. Sans ce fichier, la
-- migration crée bien les tables mais le flux casse dès la première acceptation
-- de devis.
--
--   1. `handle_updated_at()` est appelée par cinq déclencheurs de la migration.
--      Elle est définie dans 20260717000000_initial_schema.sql, qui n'est pas
--      encore joué sur cette base. Reprise ici en CREATE OR REPLACE : jouer les
--      deux fichiers dans n'importe quel ordre donne le même résultat.
--
--   2. `log_audit()` est appelée par `create_po_from_accepted_quote()` et
--      `request_po_cancellation()` — et n'est définie NULLE PART : ni dans les
--      migrations, ni dans le code, ni en base. Les deux fonctions échouaient
--      donc sur "function public.log_audit does not exist". Définie ici d'après
--      son usage et la structure d'audit_logs.
--
--   3. `import_requests.status` n'accepte pas 'QUOTE_ACCEPTED'. Or l'application
--      pose cette valeur (src/app/api/quotes/accept/route.ts) et l'affiche
--      (src/app/dashboard/requests/[id]/page.tsx), et le déclencheur
--      `create_po_from_accepted_quote()` la pose aussi. C'est bien la contrainte
--      qui est en retard sur le workflow, pas l'inverse : on l'élargit.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- handle_updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- log_audit
--
-- Signature déduite des deux appels existants :
--   PERFORM public.log_audit(actor, action, target_type, target_id, details)
-- `actor_id` est nullable côté table : le déclencheur de génération du PO passe
-- NULL, l'action étant automatique et non imputable à un utilisateur.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit(
    p_actor_id UUID,
    p_action TEXT,
    p_target_type TEXT,
    p_target_id UUID,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
    VALUES (p_actor_id, p_action, p_target_type, p_target_id, COALESCE(p_details, '{}'::jsonb))
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- import_requests.status : ajout de QUOTE_ACCEPTED
--
-- La colonne est TEXT + CHECK sur cette base (elle est typée `request_status`
-- dans le repo — divergence documentée dans 20260801111630). On retrouve la
-- contrainte par son rôle plutôt que par un nom supposé, et on la remplace.
-- Sur une base où la colonne est un enum, le bloc ne trouve rien et ajoute la
-- valeur à l'enum à la place.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_conname TEXT;
BEGIN
    SELECT conname INTO v_conname
    FROM pg_constraint
    WHERE conrelid = 'public.import_requests'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
    LIMIT 1;

    IF v_conname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.import_requests DROP CONSTRAINT %I', v_conname);
        ALTER TABLE public.import_requests
          ADD CONSTRAINT import_requests_status_check
          CHECK (status IN (
            'PENDING', 'DRAFT', 'ANALYSIS', 'VALIDATED', 'REJECTED',
            'QUOTE_ACCEPTED',
            'AWAITING_DEPOSIT', 'AWAITING_BALANCE', 'EXECUTING',
            'SHIPPED', 'DELIVERED', 'INCIDENT', 'CLOSED'
          ));
    ELSIF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'request_status'
    ) THEN
        -- Colonne typée enum : on ajoute la valeur si elle manque.
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'request_status' AND e.enumlabel = 'QUOTE_ACCEPTED'
        ) THEN
            ALTER TYPE public.request_status ADD VALUE 'QUOTE_ACCEPTED' AFTER 'VALIDATED';
        END IF;
    END IF;
END $$;
