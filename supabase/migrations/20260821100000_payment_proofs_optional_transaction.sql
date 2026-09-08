-- =============================================================================
-- payment_proofs.transaction_id devient optionnel
-- =============================================================================
--
-- La colonne a été créée NOT NULL en reprenant un schéma où chaque paiement
-- ouvrait d'abord une ligne dans public.transactions. Ce n'est plus le cas : le
-- flux acheteur actuel s'appuie sur orders et payments, et l'application n'écrit
-- jamais dans transactions. En l'état, aucun acheteur ne peut déposer un
-- justificatif — l'insertion échoue sur la contrainte.
--
-- On rend donc la référence optionnelle. Elle reste utile quand une transaction
-- existe (rapprochement comptable), mais elle ne conditionne plus le dépôt.
-- =============================================================================

ALTER TABLE public.payment_proofs
  ALTER COLUMN transaction_id DROP NOT NULL;

COMMENT ON COLUMN public.payment_proofs.transaction_id IS
  'Transaction rapprochée, si elle existe. Optionnelle : le flux acheteur actuel identifie le paiement par order_id.';
