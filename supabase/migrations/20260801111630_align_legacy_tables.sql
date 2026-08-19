-- =============================================================================
-- Alignement des tables antérieures sur le schéma décrit par le repo
-- =============================================================================
--
-- Quinze tables existent à la fois dans 20260717000000_initial_schema.sql et
-- dans la base restaurée `edhijqtotsrefminalsp`, mais avec des colonnes
-- différentes : la base porte l'état de mars 2026, le repo celui de juillet.
-- Comme ces tables contiennent des données (9 profiles rattachés à 9 comptes
-- auth, 8 pays, 9 types de taxe, 3 fournisseurs, 2 demandes, 6 entrées d'audit),
-- il n'est pas question de les recréer : on ajoute uniquement ce qui manque.
--
-- Tout est additif et idempotent : ADD COLUMN IF NOT EXISTS, colonnes nullables
-- ou avec valeur par défaut. Aucune suppression, aucun changement de type,
-- aucune perte possible. Sur une base neuve, initial_schema a déjà créé ces
-- colonnes et ce fichier ne fait rien.
--
-- CE QUI N'EST PAS TRAITÉ ICI, PARCE QUE CELA DEMANDE UN ARBITRAGE :
--
--   1. `user_role` : le repo le déclare à 3 valeurs (BUYER, PARTNER, ADMIN),
--      la base à 6 (+ PARTNER_COUNTRY, FISCAL_CONSULTANT, ACCOUNTANT). Les
--      policies douanes comparent `get_user_role()` à ces trois rôles
--      supplémentaires : sur une base créée depuis le repo, personne ne peut
--      les porter et tout le module douanes devient admin-only.
--
--   2. `profiles.role` est TEXT + CHECK (BUYER, PARTNER, ADMIN) en base, mais
--      typé `user_role` dans le repo. Même conséquence que ci-dessus : les
--      rôles douanes sont inatteignables aujourd'hui.
--
--   3. `invoice_status` : le repo ajoute OVERDUE, la base ne l'a pas. Deux
--      définitions concurrentes du même type.
--
--   4. `customs_files.assigned_partner_id` référence profiles(id) mais les
--      policies le comparent tantôt à auth.uid(), tantôt à partner_profiles.id.
--
-- Ces quatre points changent le comportement des autorisations : ils doivent
-- être tranchés explicitement, pas absorbés dans une migration automatique.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Types manquants requis par les colonnes ajoutées plus bas
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE public.notification_channel AS ENUM (
    'status_change', 'document_upload', 'payment', 'message', 'incident', 'kyc', 'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.notification_type AS ENUM ('info', 'success', 'warning', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- countries
-- -----------------------------------------------------------------------------
ALTER TABLE public.countries
  ADD COLUMN IF NOT EXISTS flag_emoji TEXT;

-- -----------------------------------------------------------------------------
-- profiles — bloc Stripe/SEPA absent de la base
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_mandate_id TEXT,
  ADD COLUMN IF NOT EXISTS iban_last4 TEXT,
  ADD COLUMN IF NOT EXISTS bic TEXT,
  ADD COLUMN IF NOT EXISTS mandate_activated BOOLEAN DEFAULT FALSE;

-- L'unicité de stripe_customer_id est portée par un index partiel plutôt que par
-- une contrainte UNIQUE : plusieurs profils sans client Stripe coexistent.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_key
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- partner_profiles
--
-- Note : trois routes API demandaient full_name / company_name / email / phone
-- sur cette table, colonnes qui n'existent ni ici ni dans le repo — elles sont
-- portées par profiles. Corrigé côté code par un embed imbriqué, pas ici.
-- -----------------------------------------------------------------------------
ALTER TABLE public.partner_profiles
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 10.00;

-- -----------------------------------------------------------------------------
-- suppliers
-- -----------------------------------------------------------------------------
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS legal_docs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS execution_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- -----------------------------------------------------------------------------
-- notifications
--
-- `channel` est NOT NULL dans le repo. Ajoutée nullable ici : la contrainte ne
-- pourra être posée qu'une fois une valeur décidée pour l'existant (la table
-- est vide aujourd'hui, mais la migration doit rester rejouable ailleurs).
-- -----------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS channel public.notification_channel,
  ADD COLUMN IF NOT EXISTS link TEXT;

-- -----------------------------------------------------------------------------
-- partner_applications
-- -----------------------------------------------------------------------------
ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.countries(id),
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS experience_years INTEGER,
  ADD COLUMN IF NOT EXISTS specialization TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- -----------------------------------------------------------------------------
-- contact_messages
-- -----------------------------------------------------------------------------
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

-- -----------------------------------------------------------------------------
-- transactions
--
-- payment_id référence public.payments, table créée par initial_schema. La FK
-- n'est posée que si la table est présente, pour que ce fichier reste jouable
-- sur une base où l'alignement précède la création de payments.
-- -----------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_id UUID,
  ADD COLUMN IF NOT EXISTS reference TEXT;

DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'transactions_payment_id_fkey'
         AND conrelid = 'public.transactions'::regclass
     )
  THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_payment_id_fkey
      FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- audit_logs
-- -----------------------------------------------------------------------------
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- -----------------------------------------------------------------------------
-- tracking_events
--
-- La base indexe les événements par request_id + event_date, le repo par
-- order_id + occurred_at. Les deux jeux de colonnes coexistent : on ajoute ce
-- qui manque sans arbitrer lequel fait foi.
-- -----------------------------------------------------------------------------
ALTER TABLE public.tracking_events
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ DEFAULT NOW();
