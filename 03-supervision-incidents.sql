-- ============================================================================
-- Supervision des erreurs
-- ============================================================================
-- Jusqu'ici une exception en production ne laissait aucune trace consultable :
-- les frontières d'erreur appelaient `console.error`, dont la sortie vit le
-- temps de rétention des journaux de l'hébergeur et n'est ni cherchable ni
-- comptable. Un paiement qui échoue n'était donc signalé à personne.
--
-- Deux partis pris structurent cette table.
--
-- 1. Le regroupement par empreinte. Une seule boucle fautive produit des
--    milliers d'occurrences de la même erreur. Les écrire une par une remplit
--    la base et enterre l'incident distinct qui compte. Les occurrences sont
--    donc comptées sur une ligne unique par empreinte.
--
-- 2. L'écriture réservée au rôle de service. Comme audit_logs, cette table n'a
--    aucune politique INSERT : une supervision falsifiable ne supervise rien.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.error_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Empreinte stable de l'erreur : type, message normalisé, origine.
    -- C'est la clé de regroupement, donc elle est unique.
    fingerprint TEXT NOT NULL UNIQUE,

    level TEXT NOT NULL DEFAULT 'error'
        CHECK (level IN ('warning', 'error', 'fatal')),
    -- D'où vient l'incident : rendu serveur, route d'API, navigateur, edge.
    source TEXT NOT NULL DEFAULT 'server'
        CHECK (source IN ('server', 'api', 'client', 'edge', 'job')),

    name TEXT NOT NULL,
    message TEXT NOT NULL,
    stack TEXT,

    route TEXT,
    method TEXT,
    status INTEGER,

    -- Identifiant que Next affiche à l'utilisateur sur la page 500. C'est le
    -- seul lien entre ce qu'il rapporte au support et ce qui est enregistré.
    digest TEXT,

    -- Acteur concerné, quand la session est connue. Pas de contrainte de clé
    -- étrangère : un incident ne doit jamais disparaître parce que le compte
    -- a été supprimé — c'est justement là qu'on veut relire l'historique.
    actor_id UUID,

    -- Version déployée (SHA de commit) et environnement, pour savoir si un
    -- incident est réapparu ou s'il date d'une version antérieure.
    -- Nommée `release_sha` et non `release` : ce dernier est un mot-clé
    -- Postgres, légal comme nom de colonne mais source d'ambiguïté inutile.
    release_sha TEXT,
    environment TEXT NOT NULL DEFAULT 'production',

    -- Contexte déjà rédigé côté application.
    context JSONB NOT NULL DEFAULT '{}'::jsonb,

    occurrences INTEGER NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Traitement : un incident acquitté sort de la vue courante sans être perdu.
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- La consultation se fait toujours « les plus récents d'abord, non résolus » :
-- l'index suit cet usage plutôt que la clé primaire.
CREATE INDEX IF NOT EXISTS error_events_last_seen_idx
    ON public.error_events (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS error_events_ouverts_idx
    ON public.error_events (last_seen_at DESC)
    WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS error_events_route_idx
    ON public.error_events (route)
    WHERE route IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Enregistrement d'une occurrence
-- ----------------------------------------------------------------------------
-- Fait en une seule instruction atomique : deux requêtes concurrentes portant
-- la même erreur ne doivent ni se perdre ni lever de conflit d'unicité.
--
-- Une erreur qui réapparaît après acquittement rouvre l'incident : la traiter
-- comme résolue alors qu'elle se reproduit reviendrait à la cacher.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_error_event(
    p_fingerprint TEXT,
    p_level       TEXT,
    p_source      TEXT,
    p_name        TEXT,
    p_message     TEXT,
    p_stack       TEXT DEFAULT NULL,
    p_route       TEXT DEFAULT NULL,
    p_method      TEXT DEFAULT NULL,
    p_status      INTEGER DEFAULT NULL,
    p_digest      TEXT DEFAULT NULL,
    p_actor_id    UUID DEFAULT NULL,
    p_release     TEXT DEFAULT NULL,
    p_environment TEXT DEFAULT 'production',
    p_context     JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    INSERT INTO public.error_events AS e (
        fingerprint, level, source, name, message, stack,
        route, method, status, digest, actor_id, release_sha, environment, context
    )
    VALUES (
        p_fingerprint, p_level, p_source, p_name, p_message, p_stack,
        p_route, p_method, p_status, p_digest, p_actor_id, p_release,
        p_environment, COALESCE(p_context, '{}'::jsonb)
    )
    ON CONFLICT (fingerprint) DO UPDATE SET
        occurrences  = e.occurrences + 1,
        last_seen_at = NOW(),
        -- La dernière occurrence remplace la précédente : c'est celle dont le
        -- contexte est le plus proche de l'état actuel du code.
        stack        = COALESCE(EXCLUDED.stack, e.stack),
        message      = EXCLUDED.message,
        route        = COALESCE(EXCLUDED.route, e.route),
        method       = COALESCE(EXCLUDED.method, e.method),
        status       = COALESCE(EXCLUDED.status, e.status),
        digest       = COALESCE(EXCLUDED.digest, e.digest),
        actor_id     = COALESCE(EXCLUDED.actor_id, e.actor_id),
        release_sha  = COALESCE(EXCLUDED.release_sha, e.release_sha),
        context      = EXCLUDED.context,
        resolved_at  = NULL,
        resolved_by  = NULL
    RETURNING e.id;
$$;

-- ----------------------------------------------------------------------------
-- Sécurité d'accès
-- ----------------------------------------------------------------------------
ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

-- Lecture réservée aux administrateurs : messages et piles peuvent contenir
-- des fragments de données d'autres comptes, malgré la rédaction appliquée
-- côté application.
DROP POLICY IF EXISTS "error_events_admin_read" ON public.error_events;
CREATE POLICY "error_events_admin_read" ON public.error_events
    FOR SELECT USING (get_user_role() = 'ADMIN');

-- Acquittement par un administrateur.
DROP POLICY IF EXISTS "error_events_admin_update" ON public.error_events;
CREATE POLICY "error_events_admin_update" ON public.error_events
    FOR UPDATE USING (get_user_role() = 'ADMIN')
    WITH CHECK (get_user_role() = 'ADMIN');

-- Aucune politique INSERT ni DELETE : l'écriture passe exclusivement par le
-- rôle de service, et un incident ne s'efface pas.
REVOKE ALL ON FUNCTION public.record_error_event(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
    INTEGER, TEXT, UUID, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
