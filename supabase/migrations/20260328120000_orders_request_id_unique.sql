-- Un seul ordre commercial par demande d'import (évite doublons si double VALIDATE ou race).
-- Avant déploiement : vérifier l'absence de doublons, ex. :
--   SELECT request_id, COUNT(*) FROM public.orders GROUP BY request_id HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS orders_request_id_unique
  ON public.orders (request_id);
