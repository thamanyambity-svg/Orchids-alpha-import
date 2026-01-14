
-- =============================================
-- 1. RISK MANAGEMENT (INCIDENTS)
-- =============================================

-- Create Enums
DO $$ BEGIN
    CREATE TYPE incident_type AS ENUM ('LOSS', 'DELAY', 'NON_CONFORMITY', 'FRAUD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'FROZEN', 'RESOLVED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) NOT NULL,
    type incident_type NOT NULL,
    description TEXT NOT NULL,
    status incident_status DEFAULT 'OPEN',
    
    reported_by UUID REFERENCES profiles(id), -- Who reported it?
    
    -- Admin Decision
    decision TEXT,
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    compensation_amount NUMERIC DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can read incidents related to their orders (complex join needed or simplified for now)
-- Admin can do everything
CREATE POLICY "Admins full access incidents" ON incidents
    TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN')
    WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "Partner/Buyer read own incidents" ON incidents
    FOR SELECT TO authenticated
    USING (
        reported_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM orders WHERE orders.id = incidents.order_id AND (orders.request_id IN (SELECT id FROM import_requests WHERE buyer_id = auth.uid() OR assigned_partner_id = auth.uid())))
    );

-- Trigger for updated_at
CREATE TRIGGER update_incidents_modtime
    BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();


-- =============================================
-- 2. ACCOUNTING (FINANCIAL LEDGER)
-- =============================================

-- Create Enums
DO $$ BEGIN
    CREATE TYPE ledger_entry_type AS ENUM ('DEPOSIT', 'RELEASE', 'COMMISSION', 'REFUND', 'FREEZE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ledger_entry_status AS ENUM ('BLOCKED', 'AUTHORIZED', 'EXECUTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Table
CREATE TABLE IF NOT EXISTS financial_ledger (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    
    actor UUID REFERENCES profiles(id), -- Who initiated this movement?
    
    entry_type ledger_entry_type NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    status ledger_entry_status DEFAULT 'EXECUTED',
    
    description TEXT,
    authorized_by UUID REFERENCES profiles(id), -- If manual validation needed
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE financial_ledger ENABLE ROW LEVEL SECURITY;

-- Policies
-- Only Admin sees the full ledger
CREATE POLICY "Admins full access ledger" ON financial_ledger
    TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN')
    WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');

-- Partners/Buyers can see their own movements (linked to their orders)
CREATE POLICY "Users read own ledger entries" ON financial_ledger
    FOR SELECT TO authenticated
    USING (
        order_id IN (
            SELECT o.id FROM orders o
            JOIN import_requests r ON o.request_id = r.id
            WHERE r.buyer_id = auth.uid() OR r.assigned_partner_id = auth.uid()
        )
    );
