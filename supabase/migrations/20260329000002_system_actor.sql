-- =============================================================================
-- Acteur système pour les journaux d'audit
-- Migration: 20260329000002
-- Description: Les événements système (webhook Stripe, n8n) n'ont pas d'utilisateur
--   réel. On les enregistre avec actor_id = NULL (l'UI affiche "Système").
--   Cette migration garantit que actor_id accepte NULL.
-- =============================================================================

ALTER TABLE public.audit_logs ALTER COLUMN actor_id DROP NOT NULL;
