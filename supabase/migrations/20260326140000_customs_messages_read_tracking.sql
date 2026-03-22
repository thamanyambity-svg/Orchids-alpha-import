-- =============================================================================
-- Bloc K Sprint 2 — Suivi de lecture (read_by JSONB + RPC sécurisées)
-- Dépendance : 20260326130000_customs_messaging_system.sql
-- =============================================================================
-- Les RPC utilisent auth.uid() — jamais un user_id passé par le client.
-- =============================================================================

ALTER TABLE public.customs_file_messages
  ADD COLUMN IF NOT EXISTS read_by JSONB NOT NULL DEFAULT '{}'::jsonb;

-- L’auteur est considéré comme ayant « lu » son message (rétroactif K-1)
UPDATE public.customs_file_messages m
   SET read_by = m.read_by || jsonb_build_object(m.author_id::text, to_jsonb(m.created_at))
 WHERE NOT (m.read_by ? m.author_id::text);

CREATE INDEX IF NOT EXISTS idx_cfm_read_by
  ON public.customs_file_messages USING GIN (read_by);

CREATE INDEX IF NOT EXISTS idx_cfm_unread_empty_read_by
  ON public.customs_file_messages (file_id, created_at DESC)
  WHERE read_by = '{}'::jsonb;

-- ─── Accès dossier (même logique que la messagerie K-1) ───────────────────────

CREATE OR REPLACE FUNCTION public.cfm_user_can_access_file(p_file_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('FISCAL_CONSULTANT', 'ACCOUNTANT')
    )
    OR EXISTS (
      SELECT 1 FROM public.customs_files cf
      JOIN public.partner_profiles pp ON pp.id = cf.assigned_partner_id
      WHERE cf.id = p_file_id AND pp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.customs_files cf
      JOIN public.orders o ON o.id = cf.order_id
      JOIN public.import_requests ir ON ir.id = o.request_id
      WHERE cf.id = p_file_id AND ir.buyer_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.cfm_user_can_access_file(uuid) FROM PUBLIC;

-- ─── Marquer comme lus (merge JSONB atomique) ────────────────────────────────

CREATE OR REPLACE FUNCTION public.mark_customs_messages_read(
  p_file_id   uuid,
  p_timestamp timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   text := auth.uid()::text;
  v_role  text;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 0;
  END IF;

  IF NOT public.cfm_user_can_access_file(p_file_id) THEN
    RETURN 0;
  END IF;

  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();

  UPDATE public.customs_file_messages m
     SET read_by = m.read_by || jsonb_build_object(v_uid, to_jsonb(p_timestamp))
   WHERE m.file_id = p_file_id
     AND NOT (m.read_by ? v_uid)
     AND (v_role IS DISTINCT FROM 'BUYER' OR m.is_internal = false);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_customs_messages_read(uuid, timestamptz)
  TO authenticated, service_role;

-- ─── Nombre de messages non lus (un dossier) ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_customs_file_unread_count(p_file_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   text := auth.uid()::text;
  v_role  text;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 0;
  END IF;

  IF NOT public.cfm_user_can_access_file(p_file_id) THEN
    RETURN 0;
  END IF;

  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();

  SELECT COUNT(*)::integer INTO v_count
    FROM public.customs_file_messages m
   WHERE m.file_id = p_file_id
     AND m.author_id IS DISTINCT FROM auth.uid()
     AND NOT (m.read_by ? v_uid)
     AND (v_role IS DISTINCT FROM 'BUYER' OR m.is_internal = false);

  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customs_file_unread_count(uuid)
  TO authenticated, service_role;

-- ─── Compteurs pour une liste de dossiers (évite N appels) ───────────────────

CREATE OR REPLACE FUNCTION public.get_customs_unread_counts_for_files(p_file_ids uuid[])
RETURNS TABLE (file_id uuid, unread_count integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  text := auth.uid()::text;
  v_role text;
BEGIN
  IF v_uid IS NULL OR p_file_ids IS NULL OR cardinality(p_file_ids) = 0 THEN
    RETURN;
  END IF;

  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.file_id,
    COUNT(*)::integer AS unread_count
    FROM public.customs_file_messages m
   WHERE m.file_id = ANY (p_file_ids)
     AND public.cfm_user_can_access_file(m.file_id)
     AND m.author_id IS DISTINCT FROM auth.uid()
     AND NOT (m.read_by ? v_uid)
     AND (v_role IS DISTINCT FROM 'BUYER' OR m.is_internal = false)
   GROUP BY m.file_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customs_unread_counts_for_files(uuid[])
  TO authenticated, service_role;

-- ─── Vérification ───────────────────────────────────────────────────────────

DO $$
DECLARE
  v_col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'customs_file_messages'
       AND column_name  = 'read_by'
  ) INTO v_col_exists;

  IF v_col_exists THEN
    RAISE NOTICE 'OK — colonne read_by sur customs_file_messages';
  ELSE
    RAISE WARNING 'ÉCHEC — colonne read_by absente';
  END IF;
END $$;
