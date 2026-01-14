-- Enable RLS on import_requests if not already enabled
ALTER TABLE import_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Buyers can view their own requests" ON import_requests;

-- Create policy for Buyers to view their own requests
CREATE POLICY "Buyers can view their own requests"
ON import_requests
FOR SELECT
USING (auth.uid() = buyer_id);

-- Create policy for Buyers to insert their requests (authenticated users)
DROP POLICY IF EXISTS "Buyers can insert their own requests" ON import_requests;
CREATE POLICY "Buyers can insert their own requests"
ON import_requests
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);
