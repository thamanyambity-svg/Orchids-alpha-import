-- =============================================================================
-- Alpha Import Exchange - Row Level Security (RLS) Policies
-- Migration: 20250308000001
-- Description: Politiques de sécurité pour protéger les données par rôle
-- =============================================================================
-- IMPORTANT: Exécuter ce fichier dans le Supabase SQL Editor si pas de CLI Supabase
-- Les API routes utilisant SERVICE_ROLE_KEY bypassent RLS (comportement attendu)
-- =============================================================================

-- Fonction helper pour obtenir le rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid()
$$;

-- -----------------------------------------------------------------------------
-- PROFILES
-- Un utilisateur lit/met à jour uniquement son propre profil
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin peut voir tous les profils
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- BUYER_PROFILES
-- -----------------------------------------------------------------------------
ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyer_profiles_own" ON public.buyer_profiles;
CREATE POLICY "buyer_profiles_own" ON public.buyer_profiles
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "buyer_profiles_admin" ON public.buyer_profiles;
CREATE POLICY "buyer_profiles_admin" ON public.buyer_profiles
  FOR SELECT USING (get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- PARTNER_PROFILES
-- Partenaire voit le sien, Admin voit tous
-- -----------------------------------------------------------------------------
ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_profiles_own" ON public.partner_profiles;
CREATE POLICY "partner_profiles_own" ON public.partner_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "partner_profiles_update_own" ON public.partner_profiles;
CREATE POLICY "partner_profiles_update_own" ON public.partner_profiles
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "partner_profiles_admin" ON public.partner_profiles;
CREATE POLICY "partner_profiles_admin" ON public.partner_profiles
  FOR ALL USING (get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- IMPORT_REQUESTS
-- Buyer: ses demandes | Partner: demandes assignées | Admin: toutes
-- -----------------------------------------------------------------------------
ALTER TABLE public.import_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_requests_buyer" ON public.import_requests;
CREATE POLICY "import_requests_buyer" ON public.import_requests
  FOR ALL USING (buyer_id = auth.uid());

DROP POLICY IF EXISTS "import_requests_partner" ON public.import_requests;
CREATE POLICY "import_requests_partner" ON public.import_requests
  FOR SELECT USING (
    assigned_partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "import_requests_partner_update" ON public.import_requests;
CREATE POLICY "import_requests_partner_update" ON public.import_requests
  FOR UPDATE USING (
    assigned_partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "import_requests_admin" ON public.import_requests;
CREATE POLICY "import_requests_admin" ON public.import_requests
  FOR ALL USING (get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- ORDERS (via request_id -> buyer_id ou assigned_partner)
-- -----------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_via_request_buyer" ON public.orders;
CREATE POLICY "orders_via_request_buyer" ON public.orders
  FOR SELECT USING (
    request_id IN (SELECT id FROM public.import_requests WHERE buyer_id = auth.uid())
  );

DROP POLICY IF EXISTS "orders_via_request_partner" ON public.orders;
CREATE POLICY "orders_via_request_partner" ON public.orders
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM public.import_requests 
      WHERE assigned_partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "orders_partner_update" ON public.orders;
CREATE POLICY "orders_partner_update" ON public.orders
  FOR UPDATE USING (
    request_id IN (
      SELECT id FROM public.import_requests 
      WHERE assigned_partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "orders_admin" ON public.orders;
CREATE POLICY "orders_admin" ON public.orders
  FOR ALL USING (get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- REQUEST_DOCUMENTS
-- Lié aux import_requests (même logique)
-- -----------------------------------------------------------------------------
ALTER TABLE public.request_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "request_documents_buyer" ON public.request_documents;
CREATE POLICY "request_documents_buyer" ON public.request_documents
  FOR ALL USING (
    request_id IN (SELECT id FROM public.import_requests WHERE buyer_id = auth.uid())
  );

DROP POLICY IF EXISTS "request_documents_partner" ON public.request_documents;
CREATE POLICY "request_documents_partner" ON public.request_documents
  FOR ALL USING (
    request_id IN (
      SELECT id FROM public.import_requests 
      WHERE assigned_partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "request_documents_admin" ON public.request_documents;
CREATE POLICY "request_documents_admin" ON public.request_documents
  FOR ALL USING (get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- INCIDENTS
-- Admin principal, buyer/partner liés à leurs orders
-- -----------------------------------------------------------------------------
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incidents_buyer" ON public.incidents;
CREATE POLICY "incidents_buyer" ON public.incidents
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.import_requests ir ON o.request_id = ir.id
      WHERE ir.buyer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "incidents_partner" ON public.incidents;
CREATE POLICY "incidents_partner" ON public.incidents
  FOR ALL USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.import_requests ir ON o.request_id = ir.id
      WHERE ir.assigned_partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "incidents_admin" ON public.incidents;
CREATE POLICY "incidents_admin" ON public.incidents
  FOR ALL USING (get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- MESSAGES (sender ou recipient = user)
-- -----------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_participant" ON public.messages;
CREATE POLICY "messages_participant" ON public.messages
  FOR ALL USING (sender_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS "messages_admin" ON public.messages;
CREATE POLICY "messages_admin" ON public.messages
  FOR SELECT USING (get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS (user_id)
-- -----------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- COUNTRIES (lecture publique pour formulaire)
-- -----------------------------------------------------------------------------
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "countries_select_authenticated" ON public.countries;
CREATE POLICY "countries_select_authenticated" ON public.countries
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "countries_admin" ON public.countries;
CREATE POLICY "countries_admin" ON public.countries
  FOR ALL USING (get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- PARTNER_APPLICATIONS (candidatures - insertion publique, lecture admin)
-- -----------------------------------------------------------------------------
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_applications_insert" ON public.partner_applications;
CREATE POLICY "partner_applications_insert" ON public.partner_applications
  FOR INSERT WITH CHECK (true); -- Candidature ouverte (captcha/rate-limit côté app)

DROP POLICY IF EXISTS "partner_applications_admin" ON public.partner_applications;
CREATE POLICY "partner_applications_admin" ON public.partner_applications
  FOR SELECT USING (get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "partner_applications_admin_update" ON public.partner_applications;
CREATE POLICY "partner_applications_admin_update" ON public.partner_applications
  FOR UPDATE USING (get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- CONTACT_MESSAGES (insertion publique pour formulaire contact)
-- -----------------------------------------------------------------------------
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_messages_insert" ON public.contact_messages;
CREATE POLICY "contact_messages_insert" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "contact_messages_admin" ON public.contact_messages;
CREATE POLICY "contact_messages_admin" ON public.contact_messages
  FOR SELECT USING (get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- TABLES SENSIBLES : lecture Admin uniquement (Service Role pour écriture)
-- Les API utilisent SERVICE_ROLE_KEY pour transactions, payments, audit_logs
-- -----------------------------------------------------------------------------

-- TRANSACTIONS (financier - Admin read, write via service role)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_admin_only" ON public.transactions;
CREATE POLICY "transactions_admin_only" ON public.transactions
  FOR SELECT USING (get_user_role() = 'ADMIN');

-- PAYMENTS (idem - buyer voit via relation order)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    EXECUTE 'ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "payments_via_order" ON public.payments';
    EXECUTE 'CREATE POLICY "payments_via_order" ON public.payments FOR SELECT USING (
      order_id IN (
        SELECT o.id FROM public.orders o
        JOIN public.import_requests ir ON o.request_id = ir.id
        WHERE ir.buyer_id = auth.uid()
      )
    )';
    EXECUTE 'DROP POLICY IF EXISTS "payments_admin" ON public.payments';
    EXECUTE 'CREATE POLICY "payments_admin" ON public.payments FOR ALL USING (get_user_role() = ''ADMIN'')';
  END IF;
END $$;

-- AUDIT_LOGS (lecture Admin uniquement)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_admin" ON public.audit_logs
  FOR SELECT USING (get_user_role() = 'ADMIN');

-- SUPPLIERS (partner voit les siens, admin tous)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_partner" ON public.suppliers;
CREATE POLICY "suppliers_partner" ON public.suppliers
  FOR ALL USING (
    partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "suppliers_admin" ON public.suppliers;
CREATE POLICY "suppliers_admin" ON public.suppliers
  FOR ALL USING (get_user_role() = 'ADMIN');

-- TRACKING_EVENTS (lié aux orders)
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tracking_events_via_order" ON public.tracking_events;
CREATE POLICY "tracking_events_via_order" ON public.tracking_events
  FOR ALL USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.import_requests ir ON o.request_id = ir.id
      WHERE ir.buyer_id = auth.uid()
        OR ir.assigned_partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "tracking_events_admin" ON public.tracking_events;
CREATE POLICY "tracking_events_admin" ON public.tracking_events
  FOR ALL USING (get_user_role() = 'ADMIN');

-- -----------------------------------------------------------------------------
-- FINANCIAL_LEDGER (Admin read)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_ledger') THEN
    EXECUTE 'ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "financial_ledger_admin" ON public.financial_ledger';
    EXECUTE 'CREATE POLICY "financial_ledger_admin" ON public.financial_ledger FOR SELECT USING (get_user_role() = ''ADMIN'')';
  END IF;
END $$;
