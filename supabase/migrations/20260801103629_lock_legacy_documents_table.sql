-- =============================================================================
-- Fermeture de la table héritée public.documents
-- =============================================================================
--
-- public.documents vient de l'ancien schéma (polymorphe linked_type/linked_id).
-- Elle était SANS RLS : toute personne détenant la clé anon — publique par
-- construction, elle est dans le bundle client — pouvait lire et modifier
-- toutes ses lignes. La table est censée porter des documents KYC et des
-- factures.
--
-- Vérifié avant d'agir : la table contient 0 ligne et 0 policy, l'application
-- écrit exclusivement dans request_documents, et les `.from('documents')` du
-- code visent le bucket storage homonyme, pas cette table. Aucun lecteur
-- légitime, donc activer RLS sans policy ne casse rien : anon et authenticated
-- perdent tout accès, service_role continue de passer.
--
-- Si la table est confirmée morte, la supprimer sera le correctif définitif.
-- =============================================================================

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
