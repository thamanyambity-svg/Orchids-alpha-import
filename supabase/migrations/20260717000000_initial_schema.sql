-- =============================================================================
-- Alpha Import Exchange - Complete Initial Schema
-- Migration: 20260717000000_initial_schema
-- Description: Schéma COMPLET de toutes les tables de base (créé from scratch)
--              pour nouvelle DB Supabase (zmzhxxgsgcillmbbsrdy)
-- Exécuter EN PREMIER dans Supabase SQL Editor
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('BUYER', 'PARTNER', 'ADMIN');
CREATE TYPE user_status AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED');
CREATE TYPE kyc_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'VERIFIED', 'REJECTED');
CREATE TYPE contract_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');
CREATE TYPE supplier_status AS ENUM ('ACTIVE', 'RESTRICTED', 'SUSPENDED');
CREATE TYPE request_status AS ENUM (
    'PENDING', 'DRAFT', 'ANALYSIS', 'VALIDATED', 'REJECTED',
    'AWAITING_DEPOSIT', 'AWAITING_BALANCE', 'EXECUTING',
    'SHIPPED', 'DELIVERED', 'INCIDENT', 'CLOSED'
);
CREATE TYPE order_status AS ENUM (
    'PENDING', 'AWAITING_DEPOSIT', 'FUNDED', 'SOURCING', 'EXECUTING',
    'PURCHASED', 'AWAITING_BALANCE', 'SHIPPED', 'DELIVERED',
    'CLOSED', 'INCIDENT', 'FROZEN', 'CANCELLED'
);
CREATE TYPE payment_type AS ENUM ('DEPOSIT_60', 'BALANCE_40');
CREATE TYPE payment_status AS ENUM ('PENDING', 'BLOCKED', 'RELEASED', 'REFUNDED');
CREATE TYPE incident_type AS ENUM ('LOSS', 'DELAY', 'NON_CONFORMITY', 'FRAUD');
CREATE TYPE incident_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'FROZEN', 'RESOLVED', 'CANCELLED');
CREATE TYPE ledger_entry_type AS ENUM ('DEPOSIT', 'RELEASE', 'COMMISSION', 'REFUND', 'FREEZE');
CREATE TYPE ledger_entry_status AS ENUM ('BLOCKED', 'AUTHORIZED', 'EXECUTED');
CREATE TYPE invoice_type AS ENUM ('PROFORMA', 'COMMERCIAL', 'FINAL');
CREATE TYPE invoice_status AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');
CREATE TYPE notification_channel AS ENUM (
    'status_change', 'document_upload', 'payment',
    'message', 'incident', 'kyc', 'system'
);

-- 3. CORE TABLES

-- Countries (référentiel)
CREATE TABLE public.countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code CHAR(2) NOT NULL UNIQUE,
    name TEXT NOT NULL,
    region TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    flag_emoji TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (utilisateurs auth)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'BUYER',
    status user_status NOT NULL DEFAULT 'PENDING',
    email TEXT NOT NULL,
    phone TEXT,
    full_name TEXT,
    company_name TEXT,
    country_id UUID REFERENCES public.countries(id),
    city TEXT,
    avatar_url TEXT,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    -- Champs Stripe/SEPA
    stripe_customer_id TEXT UNIQUE,
    stripe_payment_method_id TEXT,
    stripe_mandate_id TEXT,
    iban_last4 TEXT,
    bic TEXT,
    mandate_activated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buyer Profiles
CREATE TABLE public.buyer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type TEXT,
    kyc_status kyc_status NOT NULL DEFAULT 'NOT_STARTED',
    kyc_documents JSONB DEFAULT '[]'::jsonb,
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partner Profiles
CREATE TABLE public.partner_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    country_id UUID NOT NULL REFERENCES public.countries(id),
    assigned_cities TEXT[] DEFAULT '{}',
    contract_status contract_status NOT NULL DEFAULT 'PENDING',
    deposit_amount NUMERIC(14,2) DEFAULT 0,
    commission_rate NUMERIC(5,2) DEFAULT 10.00,
    performance_score NUMERIC(3,1) DEFAULT 0,
    total_orders_handled INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers (gérés par partenaires)
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    legal_docs JSONB DEFAULT '[]'::jsonb,
    capacity TEXT,
    status supplier_status NOT NULL DEFAULT 'ACTIVE',
    validated_by_admin BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    rating NUMERIC(3,1) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import Requests
CREATE TABLE public.import_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT NOT NULL UNIQUE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    country_id UUID NOT NULL REFERENCES public.countries(id),
    category TEXT NOT NULL,
    specifications JSONB DEFAULT '{}'::jsonb,
    quantity NUMERIC(14,2),
    unit TEXT,
    budget_min NUMERIC(14,2),
    budget_max NUMERIC(14,2),
    deadline TIMESTAMPTZ,
    status request_status NOT NULL DEFAULT 'PENDING',
    assigned_partner_id UUID REFERENCES public.partner_profiles(id) ON DELETE SET NULL,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT NOT NULL UNIQUE,
    request_id UUID NOT NULL REFERENCES public.import_requests(id) ON DELETE CASCADE,
    total_amount NUMERIC(14,2) NOT NULL,
    alpha_commission NUMERIC(14,2) NOT NULL DEFAULT 0,
    partner_payout NUMERIC(14,2) NOT NULL DEFAULT 0,
    status order_status NOT NULL DEFAULT 'PENDING',
    validated_by_admin BOOLEAN DEFAULT FALSE,
    execution_deadline TIMESTAMPTZ,
    notes TEXT,
    deposit_amount NUMERIC(14,2),
    balance_amount NUMERIC(14,2),
    deposit_paid BOOLEAN DEFAULT FALSE,
    balance_paid BOOLEAN DEFAULT FALSE,
    is_frozen BOOLEAN DEFAULT FALSE,
    escrow_activated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    type payment_type NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'EUR',
    status payment_status NOT NULL DEFAULT 'PENDING',
    payment_method TEXT,
    transaction_ref TEXT,
    paid_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    released_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Request Documents
CREATE TABLE public.request_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.import_requests(id) ON DELETE CASCADE,
    document_type TEXT,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incidents
CREATE TABLE public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    type incident_type NOT NULL,
    description TEXT NOT NULL,
    status incident_status NOT NULL DEFAULT 'OPEN',
    reported_by UUID NOT NULL REFERENCES public.profiles(id),
    decision TEXT,
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    compensation_amount NUMERIC(14,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.import_requests(id) ON DELETE SET NULL,
    sender_id UUID NOT NULL REFERENCES public.profiles(id),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL,
    type notification_type NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.import_requests(id) ON DELETE CASCADE,
    type invoice_type NOT NULL,
    number TEXT NOT NULL UNIQUE,
    total_amount NUMERIC(14,2) NOT NULL,
    deposit_amount NUMERIC(14,2),
    balance_amount NUMERIC(14,2),
    alpha_commission NUMERIC(14,2) NOT NULL DEFAULT 0,
    status invoice_status NOT NULL DEFAULT 'DRAFT',
    issued_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partner Applications
CREATE TABLE public.partner_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT,
    country_id UUID REFERENCES public.countries(id),
    city TEXT,
    experience_years INTEGER,
    specialization TEXT,
    website TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Messages
CREATE TABLE public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'READ', 'REPLIED', 'ARCHIVED')),
    admin_notes TEXT,
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (financier)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'EUR',
    status TEXT NOT NULL,
    reference TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial Ledger
CREATE TABLE public.financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    actor TEXT NOT NULL,
    entry_type ledger_entry_type NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'EUR',
    status ledger_entry_status NOT NULL DEFAULT 'BLOCKED',
    description TEXT,
    authorized_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracking Events
CREATE TABLE public.tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    location TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processed Stripe Events (idempotence webhook)
CREATE TABLE public.processed_stripe_events (
    event_id TEXT PRIMARY KEY,
    type TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inbound Emails
CREATE TABLE public.inbound_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resend_email_id TEXT UNIQUE NOT NULL,
    from_email TEXT NOT NULL,
    from_name TEXT,
    to_emails TEXT[] NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    -- IA
    ai_category TEXT,
    ai_priority TEXT,
    ai_summary TEXT,
    ai_suggested_reply TEXT,
    ai_processed_at TIMESTAMPTZ,
    -- Gestion
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'READ', 'REPLIED', 'ARCHIVED')),
    admin_notes TEXT,
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEPA Payment Transactions
CREATE TABLE public.sepa_payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'EUR',
    type TEXT CHECK (type IN ('DEPOSIT_60', 'BALANCE_40')),
    status TEXT CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sepa_payment_order_id ON public.sepa_payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_sepa_payment_stripe_id ON public.sepa_payment_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_sepa_payment_status ON public.sepa_payment_transactions(status);

-- SEPA Payment Retries
CREATE TABLE public.sepa_payment_retries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES public.sepa_payment_transactions(id) ON DELETE CASCADE,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sepa_retries_transaction_id ON public.sepa_payment_retries(transaction_id);

-- Newsletter Subscribers
CREATE TABLE public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    locale TEXT DEFAULT 'fr',
    source TEXT,
    confirmed_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INDEXES PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_buyer_profiles_user_id ON public.buyer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_user_id ON public.partner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_country ON public.partner_profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_partner ON public.suppliers(partner_id);
CREATE INDEX IF NOT EXISTS idx_import_requests_buyer ON public.import_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_import_requests_partner ON public.import_requests(assigned_partner_id);
CREATE INDEX IF NOT EXISTS idx_import_requests_status ON public.import_requests(status);
CREATE INDEX IF NOT EXISTS idx_orders_request ON public.orders(request_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_request_documents_request ON public.request_documents(request_id);
CREATE INDEX IF NOT EXISTS idx_incidents_order ON public.incidents(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_request ON public.messages(request_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order ON public.transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_order ON public.financial_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_order ON public.tracking_events(order_id);
CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON public.partner_applications(status);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_status ON public.inbound_emails(status);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_received ON public.inbound_emails(received_at DESC);

-- 5. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role::text FROM public.profiles WHERE id = auth.uid()
$$;

-- 6. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_buyer_profiles_updated_at
    BEFORE UPDATE ON public.buyer_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_partner_profiles_updated_at
    BEFORE UPDATE ON public.partner_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_import_requests_updated_at
    BEFORE UPDATE ON public.import_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_incidents_updated_at
    BEFORE UPDATE ON public.incidents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_partner_applications_updated_at
    BEFORE UPDATE ON public.partner_applications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_inbound_emails_updated_at
    BEFORE UPDATE ON public.inbound_emails
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. SEPA PAYMENT FUNCTIONS (atomiques)
CREATE OR REPLACE FUNCTION public.apply_sepa_payment(
    p_order_id UUID,
    p_stripe_intent TEXT,
    p_amount INTEGER,
    p_type TEXT,
    p_status TEXT DEFAULT 'SUCCEEDED'
) RETURNS VOID AS $$
DECLARE
    v_current_status TEXT;
    v_new_status TEXT;
BEGIN
    -- 1. Vérifier idempotence
    IF EXISTS (
        SELECT 1 FROM public.sepa_payment_transactions 
        WHERE stripe_payment_intent_id = p_stripe_intent
    ) THEN
        RETURN;
    END IF;

    -- 2. Insérer la transaction
    INSERT INTO public.sepa_payment_transactions (order_id, stripe_payment_intent_id, amount, type, status)
    VALUES (p_order_id, p_stripe_intent, p_amount, p_type, p_status);

    -- 3. Lire le statut actuel de la commande
    SELECT status INTO v_current_status FROM public.orders WHERE id = p_order_id;

    -- 4. Logique de mise à jour du statut
    IF p_type = 'DEPOSIT_60' AND p_status = 'SUCCEEDED' AND v_current_status = 'AWAITING_DEPOSIT' THEN
        v_new_status := 'FUNDED';
    ELSIF p_type = 'BALANCE_40' AND p_status = 'SUCCEEDED' AND v_current_status = 'DELIVERED' THEN
        v_new_status := 'CLOSED';
    ELSE
        RETURN;
    END IF;

    -- 5. Mise à jour atomique
    UPDATE public.orders 
    SET status = v_new_status, updated_at = NOW()
    WHERE id = p_order_id AND status = v_current_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_sepa_payment_failure(
    p_order_id UUID,
    p_stripe_intent TEXT,
    p_amount INTEGER,
    p_type TEXT,
    p_error_message TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.sepa_payment_transactions (order_id, stripe_payment_intent_id, amount, type, status, metadata)
    VALUES (p_order_id, p_stripe_intent, p_amount, p_type, 'FAILED', 
            jsonb_build_object('error', p_error_message, 'failed_at', NOW()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. SEED DATA: Countries (5 pays principaux)
INSERT INTO public.countries (code, name, region, flag_emoji) VALUES
    ('CN', 'Chine', 'Asie', '🇨🇳'),
    ('TR', 'Turquie', 'Europe/Asie', '🇹🇷'),
    ('AE', 'Émirats Arabes Unis', 'Moyen-Orient', '🇦🇪'),
    ('JP', 'Japon', 'Asie', '🇯🇵'),
    ('TH', 'Thaïlande', 'Asie', '🇹🇭'),
    ('FR', 'France', 'Europe', '🇫🇷'),
    ('US', 'États-Unis', 'Amérique du Nord', '🇺🇸'),
    ('DE', 'Allemagne', 'Europe', '🇩🇪'),
    ('IT', 'Italie', 'Europe', '🇮🇹'),
    ('ES', 'Espagne', 'Europe', '🇪🇸')
ON CONFLICT (code) DO NOTHING;

-- 9. TRIGGER: Auto-create profiles & buyer_profiles on user signUp
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'BUYER',
    'PENDING'
  );
  INSERT INTO public.buyer_profiles (user_id, activity_type)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'activity_type');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();