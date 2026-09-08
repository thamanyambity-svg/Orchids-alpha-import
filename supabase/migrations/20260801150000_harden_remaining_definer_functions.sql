-- =============================================================================
-- Durcissement des fonctions SECURITY DEFINER restantes
-- =============================================================================
--
-- Suite de 20260801140000, qui ne traitait que les fonctions du flux acheteur.
-- Le même défaut existait sur le sous-système douanes/finance hérité de mars :
-- PostgREST publie toute fonction du schéma public sur /rest/v1/rpc/<nom>, et
-- PostgreSQL accorde EXECUTE à PUBLIC par défaut.
--
-- Trois cas :
--   - fonctions de déclencheur, jamais appelées directement : EXECUTE retiré ;
--   - fonctions de lecture appelées par l'application : réservées aux comptes
--     connectés, fermées aux visiteurs anonymes ;
--   - get_user_role() et custom_is_admin() : laissées ouvertes, les policies RLS
--     les évaluent sous le rôle de l'appelant et leur retirer EXECUTE couperait
--     l'accès à toutes les tables qui s'appuient dessus.
--
-- Le second volet fige search_path sur les fonctions qui ne le faisaient pas.
-- Sans cela, une fonction SECURITY DEFINER résout ses objets selon le
-- search_path de l'appelant, qui peut l'orienter vers ses propres tables.
--
-- -----------------------------------------------------------------------------
-- POURQUOI CHAQUE ORDRE EST CONDITIONNEL
--
-- Cette migration a été écrite contre la base héritée de mars, où le
-- sous-système douanes portait des noms sans préfixe : protect_validated_tax_line,
-- supersede_old_exchange_rate, generate_invoice_number, update_modified_column…
-- Le dépôt, lui, crée ces mêmes déclencheurs sous des noms préfixés
-- (fn_protect_tax_lines_when_fiscal_locked, fn_supersede_exchange_rate…).
--
-- Sur une base construite depuis le dépôt, dix de ces fonctions n'existent donc
-- pas et chaque REVOKE échouait en 42883, rendant le schéma inconstructible.
--
-- to_regprocedure() renvoie NULL au lieu de lever une erreur quand la signature
-- est inconnue : on ne durcit que ce qui est présent. Le résultat est identique
-- sur la base héritée, et l'installation neuve ne casse plus.
-- =============================================================================

-- Fonctions de déclencheur : aucun appel direct légitime.
DO $$
DECLARE cible text;
BEGIN
  FOREACH cible IN ARRAY ARRAY[
    'public.log_customs_status_change()',
    'public.protect_validated_declaration()',
    'public.protect_validated_tax_line()',
    'public.supersede_old_exchange_rate()',
    'public.supersede_rejected_proof()',
    'public.generate_invoice_number()'
  ] LOOP
    IF to_regprocedure(cible) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', cible);
    END IF;
  END LOOP;
END $$;

-- Fonctions de lecture : réservées aux comptes connectés.
DO $$
DECLARE cible text;
BEGIN
  FOREACH cible IN ARRAY ARRAY[
    'public.cfm_user_can_access_file(uuid)',
    'public.get_active_exchange_rate(character varying, character varying)',
    'public.get_customs_file_unread_count(uuid)',
    'public.get_customs_unread_counts_for_files(uuid[])',
    'public.mark_customs_messages_read(uuid, timestamptz)'
  ] LOOP
    IF to_regprocedure(cible) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', cible);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', cible);
    END IF;
  END LOOP;
END $$;

-- search_path figé : une fonction SECURITY DEFINER ne doit pas résoudre ses
-- objets selon le search_path de son appelant.
DO $$
DECLARE cible text;
BEGIN
  FOREACH cible IN ARRAY ARRAY[
    'public.handle_updated_at()',
    'public.generate_po_number()',
    'public.update_updated_at_column()',
    'public.update_modified_column()',
    'public.trg_invoices_updated_at()',
    'public.trg_protect_paid_invoice()',
    'public.trg_recalc_invoice_totals()',
    'public.touch_payment_proofs_updated_at()',
    'public.touch_customs_files_updated_at()',
    'public.touch_customs_declarations_updated_at()',
    'public.fn_supersede_exchange_rate()',
    'public.fn_supersede_rejected_proof()',
    'public.fn_protect_tax_lines_when_fiscal_locked()'
  ] LOOP
    IF to_regprocedure(cible) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', cible);
    END IF;
  END LOOP;
END $$;
