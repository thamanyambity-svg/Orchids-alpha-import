-- Table pour les emails reçus sur contact@aonosekehouseinvestmentdrc.site
CREATE TABLE IF NOT EXISTS public.inbound_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id text UNIQUE NOT NULL,
  from_email text NOT NULL,
  from_name text,
  to_emails text[] NOT NULL,
  subject text,
  body_text text,
  body_html text,
  received_at timestamptz DEFAULT now(),
  -- IA
  ai_category text,           -- PARTENARIAT, INFO, RÉCLAMATION, PRESSE, AUTRE
  ai_priority text,           -- HAUTE, MOYENNE, BASSE
  ai_summary text,
  ai_suggested_reply text,
  ai_processed_at timestamptz,
  -- Gestion
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'READ', 'REPLIED', 'ARCHIVED')),
  admin_notes text,
  replied_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_received ON public.inbound_emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_status ON public.inbound_emails(status);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_from ON public.inbound_emails(from_email);

ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;

-- Policy : Admin peut lire et mettre à jour (statut, notes). Inserts via webhook (service role)
DROP POLICY IF EXISTS "inbound_emails_admin_select" ON public.inbound_emails;
CREATE POLICY "inbound_emails_admin_select" ON public.inbound_emails
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "inbound_emails_admin_update" ON public.inbound_emails;
CREATE POLICY "inbound_emails_admin_update" ON public.inbound_emails
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
