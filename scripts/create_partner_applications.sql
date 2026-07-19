
-- Create Enum for Application Status
CREATE TYPE application_status AS ENUM ('PENDING', 'APPROVED_KYC', 'DEPOSIT_PAID', 'ACTIVE', 'REJECTED');

-- Create Partner Applications Table
CREATE TABLE IF NOT EXISTS partner_applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contact Info (can be linked to a user later if they sign up, but initially just guest/prospect)
    email TEXT NOT NULL,
    company_name TEXT NOT NULL,
    phone TEXT,
    
    -- JSONB Columns for flexible data storage
    company_details JSONB DEFAULT '{}'::jsonb, -- Address, Reg Number, etc.
    documents JSONB DEFAULT '[]'::jsonb,       -- Array of file URLs + types
    agreements JSONB DEFAULT '{}'::jsonb,      -- { terms_accepted: true, date: ... }
    
    status application_status DEFAULT 'PENDING',
    
    admin_notes TEXT
);

-- Enable RLS
ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Public can insert (Apply)
CREATE POLICY "Allow public insert application" ON partner_applications
    FOR INSERT WITH CHECK (true);

-- 2. Public cannot read (Blind insert), only Admin can read
CREATE POLICY "Allow admin read al applications" ON partner_applications
    FOR SELECT TO authenticated
    USING ((auth.jwt() ->> 'email') LIKE '%@aonosekehouseinvestmentdrc.site' OR (auth.jwt() ->> 'role') = 'service_role');

-- 3. Admin can update (Approve/Reject)
CREATE POLICY "Allow admin update application" ON partner_applications
    FOR UPDATE TO authenticated
    USING ((auth.jwt() ->> 'email') LIKE '%@aonosekehouseinvestmentdrc.site')
    WITH CHECK ((auth.jwt() ->> 'email') LIKE '%@aonosekehouseinvestmentdrc.site');

-- Trigger to update updated_at
CREATE TRIGGER update_partner_applications_modtime
    BEFORE UPDATE ON partner_applications
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
