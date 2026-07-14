-- Create Tracking Events Table
CREATE TABLE IF NOT EXISTS tracking_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id UUID REFERENCES import_requests(id) NOT NULL,
    status TEXT NOT NULL,
    -- e.g., 'DEPARTURE', 'TRANSIT', 'CUSTOMS', 'DELIVERED', 'DELAY'
    location TEXT NOT NULL,
    -- e.g., 'Shenzhen Warehouse', 'Istanbul Airport'
    description TEXT,
    -- e.g., 'Flight TK123 departed', 'Customs clearance pending'
    event_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    created_by UUID REFERENCES profiles(id),
    -- Admin who added the event
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
-- Enable RLS
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
-- Policy: Admins can INSERT events
CREATE POLICY "Admins can insert tracking events" ON tracking_events FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'ADMIN'
        )
    );
-- Policy: Admins can UPDATE/DELETE events ( Corrections)
CREATE POLICY "Admins can update tracking events" ON tracking_events FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'ADMIN'
        )
    );
CREATE POLICY "Admins can delete tracking events" ON tracking_events FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = auth.uid()
            AND role = 'ADMIN'
    )
);
-- Policy: Everyone (Admins + Buyers + Partners) can READ events related to their requests
-- Complex join needed, or simplified check if user has access to request_id
-- For now, let's allow read for authenticated users to simplify, as request_id is not easily joinable in simple policy without performance hit
-- Better approach: "Users can see tracking for requests they own or are assigned to"
CREATE POLICY "Users can see tracking for their requests" ON tracking_events FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM import_requests ir
            WHERE ir.id = tracking_events.request_id
                AND (
                    ir.buyer_id = auth.uid() -- Buyer
                    OR ir.assigned_partner_id = auth.uid() -- Partner
                    OR EXISTS (
                        SELECT 1
                        FROM profiles
                        WHERE id = auth.uid()
                            AND role = 'ADMIN'
                    ) -- Admin
                )
        )
    );