-- Add organization columns to suppliers table
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS sector TEXT,
    -- e.g. 'Textile', 'Electronics'
ADD COLUMN IF NOT EXISTS territory TEXT,
    -- e.g. 'ASIA', 'MIDDLE_EAST'
ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'APPROVED' CHECK (
        application_status IN ('APPROVED', 'PENDING', 'REJECTED')
    );
-- Update existing suppliers with default values based on their partner's country?
-- We can try to infer it, but for now let's leave them null or set defaults if we knew.
-- Example: 
-- UPDATE suppliers SET territory = 'ASIA', sector = 'General' WHERE territory IS NULL;