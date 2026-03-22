-- =============================================================================
-- Bloc K — Messagerie contextuelle douanière
-- Dépendances : customs_files (request_id déjà présent), profiles
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.customs_file_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  file_id     UUID        NOT NULL
              REFERENCES public.customs_files(id)
              ON DELETE CASCADE,

  author_id   UUID        NOT NULL
              REFERENCES public.profiles(id)
              ON DELETE RESTRICT,

  content     TEXT        NOT NULL
    CONSTRAINT chk_cfm_content_not_blank
      CHECK (LENGTH(TRIM(content)) > 0),

  is_internal BOOLEAN     NOT NULL DEFAULT false,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfm_file_created
  ON public.customs_file_messages(file_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cfm_is_internal
  ON public.customs_file_messages(file_id, is_internal)
  WHERE is_internal = false;

CREATE INDEX IF NOT EXISTS idx_cfm_author
  ON public.customs_file_messages(author_id);

ALTER TABLE public.customs_file_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cfm_admin_select" ON public.customs_file_messages;
CREATE POLICY "cfm_admin_select"
  ON public.customs_file_messages
  FOR SELECT
  USING (public.get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "cfm_partner_select" ON public.customs_file_messages;
CREATE POLICY "cfm_partner_select"
  ON public.customs_file_messages
  FOR SELECT
  USING (
    public.get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
    AND file_id IN (
      SELECT cf.id
        FROM public.customs_files cf
        JOIN public.partner_profiles pp
          ON pp.id = cf.assigned_partner_id
       WHERE pp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cfm_fiscal_accountant_select" ON public.customs_file_messages;
CREATE POLICY "cfm_fiscal_accountant_select"
  ON public.customs_file_messages
  FOR SELECT
  USING (
    public.get_user_role() IN ('FISCAL_CONSULTANT', 'ACCOUNTANT')
    AND EXISTS (SELECT 1 FROM public.customs_files cf WHERE cf.id = file_id)
  );

DROP POLICY IF EXISTS "cfm_buyer_select" ON public.customs_file_messages;
CREATE POLICY "cfm_buyer_select"
  ON public.customs_file_messages
  FOR SELECT
  USING (
    is_internal = false
    AND public.get_user_role() = 'BUYER'
    AND file_id IN (
      SELECT cf.id
        FROM public.customs_files cf
        JOIN public.orders o ON o.id = cf.order_id
        JOIN public.import_requests ir ON ir.id = o.request_id
       WHERE ir.buyer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cfm_admin_insert" ON public.customs_file_messages;
CREATE POLICY "cfm_admin_insert"
  ON public.customs_file_messages
  FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'ADMIN'
    AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS "cfm_partner_insert" ON public.customs_file_messages;
CREATE POLICY "cfm_partner_insert"
  ON public.customs_file_messages
  FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('PARTNER', 'PARTNER_COUNTRY')
    AND author_id = auth.uid()
    AND file_id IN (
      SELECT cf.id
        FROM public.customs_files cf
        JOIN public.partner_profiles pp
          ON pp.id = cf.assigned_partner_id
       WHERE pp.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.customs_file_messages IS 'Messagerie contextuelle par dossier douanier (immuabilité : pas UPDATE/DELETE).';

-- Realtime : Dashboard → Database → Replication → activer la table customs_file_messages
-- ou : ALTER PUBLICATION supabase_realtime ADD TABLE public.customs_file_messages;

DO $$
DECLARE
  v_policies INT;
  v_indexes  INT;
BEGIN
  SELECT COUNT(*) INTO v_policies
    FROM pg_policies
   WHERE tablename = 'customs_file_messages'
     AND schemaname = 'public';

  SELECT COUNT(*) INTO v_indexes
    FROM pg_indexes
   WHERE tablename = 'customs_file_messages'
     AND schemaname = 'public';

  RAISE NOTICE 'customs_file_messages — % politiques RLS, % index', v_policies, v_indexes;

  IF v_policies < 6 THEN
    RAISE WARNING 'Attendu 6 politiques RLS, trouvé %', v_policies;
  END IF;
END $$;
