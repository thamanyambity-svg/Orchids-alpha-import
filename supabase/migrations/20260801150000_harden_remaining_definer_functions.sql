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
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.log_customs_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_validated_declaration() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_validated_tax_line() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.supersede_old_exchange_rate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.supersede_rejected_proof() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.cfm_user_can_access_file(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.cfm_user_can_access_file(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_active_exchange_rate(character varying, character varying) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_active_exchange_rate(character varying, character varying) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_customs_file_unread_count(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_customs_file_unread_count(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_customs_unread_counts_for_files(uuid[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_customs_unread_counts_for_files(uuid[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_customs_messages_read(uuid, timestamptz) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.mark_customs_messages_read(uuid, timestamptz) TO authenticated;

ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.generate_po_number() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_modified_column() SET search_path = public;
ALTER FUNCTION public.trg_invoices_updated_at() SET search_path = public;
ALTER FUNCTION public.trg_protect_paid_invoice() SET search_path = public;
ALTER FUNCTION public.trg_recalc_invoice_totals() SET search_path = public;
ALTER FUNCTION public.touch_payment_proofs_updated_at() SET search_path = public;
ALTER FUNCTION public.touch_customs_files_updated_at() SET search_path = public;
ALTER FUNCTION public.touch_customs_declarations_updated_at() SET search_path = public;
ALTER FUNCTION public.fn_supersede_exchange_rate() SET search_path = public;
ALTER FUNCTION public.fn_supersede_rejected_proof() SET search_path = public;
ALTER FUNCTION public.fn_protect_tax_lines_when_fiscal_locked() SET search_path = public;
