-- Enable RLS on suppliers if not enabled
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
-- Allow Admins to View All Suppliers
CREATE POLICY "Admins can view all suppliers" ON suppliers FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'ADMIN'
        )
    );
-- Allow Partners to View their Own Suppliers
CREATE POLICY "Partners can view own suppliers" ON suppliers FOR
SELECT USING (partner_id = auth.uid());
-- Allow Partners to Insert/Update their Own Suppliers
CREATE POLICY "Partners can manage own suppliers" ON suppliers FOR ALL USING (partner_id = auth.uid());