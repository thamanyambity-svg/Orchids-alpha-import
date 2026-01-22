-- Create Contact Messages Table for Institutional Requests
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('INSTITUTIONAL', 'OTHER')),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'READ', 'PROCESSED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
-- Enable RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
-- Policy: Allow ANYONE (anon/public) to insert messages (Contact Form)
DROP POLICY IF EXISTS "Public can insert contact messages" ON contact_messages;
CREATE POLICY "Public can insert contact messages" ON contact_messages FOR
INSERT TO public WITH CHECK (true);
-- Policy: Only Admins can view messages
DROP POLICY IF EXISTS "Admins can view contact messages" ON contact_messages;
CREATE POLICY "Admins can view contact messages" ON contact_messages FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'ADMIN'
        )
    );