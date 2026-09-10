-- ============================================================================
-- Colonnes manquantes de import_requests
-- ============================================================================
-- Le formulaire de demande envoie le nom du produit, le pays de l'acheteur et
-- le mode d'expédition ; les pages admin, expédition et détail de demande les
-- lisent. Aucune migration ne les avait jamais créées : chaque soumission de
-- demande échouait (« Internal Server Error »).
-- ============================================================================

ALTER TABLE public.import_requests
  ADD COLUMN IF NOT EXISTS product_name   TEXT,
  ADD COLUMN IF NOT EXISTS buyer_country  TEXT,
  ADD COLUMN IF NOT EXISTS transport_mode TEXT;

ALTER TABLE public.import_requests
  DROP CONSTRAINT IF EXISTS import_requests_transport_mode_check;
ALTER TABLE public.import_requests
  ADD CONSTRAINT import_requests_transport_mode_check
  CHECK (transport_mode IS NULL OR transport_mode IN ('SEA', 'AIR', 'LAND'));

-- L'API REST relit son schéma : sans cela, les colonnes restent invisibles
-- quelques minutes.
NOTIFY pgrst, 'reload schema';
