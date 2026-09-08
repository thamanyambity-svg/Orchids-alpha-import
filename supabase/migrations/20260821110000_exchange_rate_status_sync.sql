-- =============================================================================
-- Le remplacement d'un taux de change doit aussi mettre à jour son statut
-- =============================================================================
--
-- `fn_supersede_exchange_rate` posait `superseded_at` sur les taux remplacés mais
-- laissait `status` à 'ACTIVE'. La table portait donc deux signaux contradictoires
-- pour la même réalité, et toute lecture filtrant sur `status = 'ACTIVE'`
-- retournait plusieurs taux pour une même paire de devises — un taux de change
-- ambigu fausse silencieusement des montants facturés.
--
-- Le statut suit désormais la date de remplacement. La reprise en fin de fichier
-- corrige les lignes déjà écrites.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_supersede_exchange_rate()
  RETURNS trigger LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.exchange_rates er
  SET superseded_at = now(),
      status = 'SUPERSEDED'
  WHERE er.id IS DISTINCT FROM NEW.id
    AND er.from_currency = NEW.from_currency
    AND er.to_currency = NEW.to_currency
    AND er.superseded_at IS NULL;
  RETURN NEW;
END;
$function$;

UPDATE public.exchange_rates
SET status = 'SUPERSEDED'
WHERE superseded_at IS NOT NULL
  AND status <> 'SUPERSEDED';
