-- Create Transactions Table for Real Financial Tracking
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    -- Payer
    amount NUMERIC NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    type VARCHAR(20) CHECK (
        type IN ('DEPOSIT', 'BALANCE', 'REFUND', 'ADJUSTMENT')
    ),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED')),
    stripe_payment_id TEXT,
    -- Stripe Payment Intent ID or Charge ID
    provider VARCHAR(20) DEFAULT 'STRIPE',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- Policies
-- Users can see their own transactions
CREATE POLICY "Users can view own transactions" ON transactions FOR
SELECT USING (auth.uid() = user_id);
-- Admins can see all transactions
CREATE POLICY "Admins can view all transactions" ON transactions FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'ADMIN'
        )
    );
-- System (Service Role) can insert/update
-- (Implicitly allowed for service role, but for explicit scripts if needed)
-- Update Dashboard View or Functions if necessary (not needed if we query directly)