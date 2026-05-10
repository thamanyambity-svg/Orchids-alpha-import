-- Permettre aux utilisateurs authentifiés d'insérer leur propre trace d'audit
-- (nécessaire pour les transitions workflow côté partenaire / routes SSR avec clé anon + RLS).

DROP POLICY IF EXISTS "audit_logs_insert_own" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_own" ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());
