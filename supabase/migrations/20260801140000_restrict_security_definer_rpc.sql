-- =============================================================================
-- Restreindre les fonctions SECURITY DEFINER exposées en RPC
-- =============================================================================
--
-- PostgREST publie toute fonction du schéma public sur /rest/v1/rpc/<nom>, et
-- PostgreSQL accorde EXECUTE à PUBLIC par défaut. Combiné à SECURITY DEFINER,
-- qui contourne RLS, cela ouvrait plusieurs appels au rôle `anon` :
--
--   - `request_po_cancellation(po_id, requested_by, reason)` annulait n'importe
--     quel bon de commande à partir de son seul identifiant, en l'imputant à
--     l'utilisateur passé en paramètre. Aucune vérification de l'appelant.
--   - `auto_confirm_po()` confirmait en masse les bons de commande et créait les
--     commandes correspondantes.
--   - `log_audit()` permettait de forger des entrées dans le journal d'audit.
--   - `create_po_from_accepted_quote()` et `handle_new_user()` sont des
--     fonctions de déclencheur, jamais destinées à un appel direct.
--
-- Deux mesures : retirer EXECUTE là où l'appel direct n'a aucun sens, et
-- durcir la seule fonction que le client doit pouvoir appeler.
--
-- `get_user_role()` et `custom_is_admin()` ne sont pas touchées : les policies
-- RLS les évaluent sous le rôle de l'appelant, leur retirer EXECUTE couperait
-- l'accès à toutes les tables qui s'appuient dessus.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Aucun appel direct légitime
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.auto_confirm_po() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_po_from_accepted_quote() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit(UUID, TEXT, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- request_po_cancellation : appelée par l'acheteur depuis le navigateur
-- (src/app/dashboard/requests/[id]/page.tsx), donc `authenticated` la garde.
--
-- Le paramètre p_requested_by était jusqu'ici cru sur parole. Il est désormais
-- confronté à auth.uid(), et l'appelant doit être l'acheteur du bon de commande
-- ou un administrateur. La signature ne change pas : le code client reste
-- valable.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_po_cancellation(
    p_po_id UUID,
    p_requested_by UUID,
    p_reason TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_po RECORD;
    v_caller UUID := auth.uid();
    v_is_admin BOOLEAN := public.get_user_role() = 'ADMIN';
    v_can_cancel BOOLEAN := FALSE;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- On n'annule pas au nom d'autrui, sauf administrateur.
    IF p_requested_by IS DISTINCT FROM v_caller AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Cannot request cancellation on behalf of another user';
    END IF;

    SELECT * INTO v_po FROM public.purchase_orders WHERE id = p_po_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PO not found';
    END IF;

    IF v_po.buyer_id IS DISTINCT FROM v_caller AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Only the buyer can cancel this PO';
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
        RAISE EXCEPTION 'A cancellation reason of at least 5 characters is required';
    END IF;

    IF v_po.cgv_accepted_at IS NOT NULL
       AND (v_po.cgv_accepted_at + interval '48 hours') > NOW()
       AND v_po.status IN ('GENERATED', 'PENDING_SIGNATURE', 'SIGNED') THEN
        v_can_cancel := TRUE;
    END IF;

    IF NOT v_can_cancel THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.po_cancellation_requests (po_id, requested_by, reason)
    VALUES (p_po_id, v_caller, p_reason);

    UPDATE public.purchase_orders
    SET status = 'CANCELLED',
        cancellation_requested_at = NOW(),
        cancellation_reason = p_reason,
        cancellation_confirmed_at = NOW(),
        cancellation_confirmed_by = v_caller,
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_po_id;

    UPDATE public.orders
    SET status = 'CANCELLED', updated_at = NOW()
    WHERE reference = v_po.po_number;

    PERFORM public.log_audit(
        v_caller, 'PO_CANCELLED', 'purchase_orders', p_po_id,
        jsonb_build_object('reason', p_reason, 'within_48h', TRUE)
    );

    RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_po_cancellation(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_po_cancellation(UUID, UUID, TEXT) TO authenticated;
