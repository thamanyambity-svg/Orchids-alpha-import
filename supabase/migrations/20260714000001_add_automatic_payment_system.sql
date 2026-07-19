-- Ajout des champs Stripe/SEPA à la table des utilisateurs (profiles)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_mandate_id TEXT,
ADD COLUMN IF NOT EXISTS iban_last4 TEXT,
ADD COLUMN IF NOT EXISTS bic TEXT,
ADD COLUMN IF NOT EXISTS mandate_activated BOOLEAN DEFAULT FALSE;

-- Table de traçabilité des transactions SEPA (indempotence)
CREATE TABLE IF NOT EXISTS sepa_payment_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'EUR',
    type TEXT CHECK (type IN ('DEPOSIT_60', 'BALANCE_40')),
    status TEXT CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sepa_payment_order_id ON sepa_payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_sepa_payment_stripe_id ON sepa_payment_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_sepa_payment_status ON sepa_payment_transactions(status);

-- Fonction SQL atomique pour appliquer le paiement SEPA et changer le statut de la commande
CREATE OR REPLACE FUNCTION apply_sepa_payment(
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
    -- 1. Vérifier que la transaction n'existe pas déjà (idempotence)
    IF EXISTS (
        SELECT 1 FROM sepa_payment_transactions 
        WHERE stripe_payment_intent_id = p_stripe_intent
    ) THEN
        RETURN; -- Éviter les doublons
    END IF;

    -- 2. Insérer la transaction
    INSERT INTO sepa_payment_transactions (order_id, stripe_payment_intent_id, amount, type, status)
    VALUES (p_order_id, p_stripe_intent, p_amount, p_type, p_status);

    -- 3. Lire le statut actuel de la commande
    SELECT status INTO v_current_status FROM orders WHERE id = p_order_id;

    -- 4. Logique de mise à jour du statut
    IF p_type = 'DEPOSIT_60' AND p_status = 'SUCCEEDED' AND v_current_status = 'AWAITING_DEPOSIT' THEN
        v_new_status := 'FUNDED';
    ELSIF p_type = 'BALANCE_40' AND p_status = 'SUCCEEDED' AND v_current_status = 'DELIVERED' THEN
        v_new_status := 'CLOSED';
    ELSE
        -- Si le statut n'est pas celui attendu, on n'applique pas la transition
        RETURN;
    END IF;

    -- 5. Mise à jour atomique de la commande
    UPDATE orders 
    SET status = v_new_status, updated_at = NOW()
    WHERE id = p_order_id AND status = v_current_status;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour enregistrer un paiement SEPA échoué
CREATE OR REPLACE FUNCTION handle_sepa_payment_failure(
    p_order_id UUID,
    p_stripe_intent TEXT,
    p_amount INTEGER,
    p_type TEXT,
    p_error_message TEXT
) RETURNS VOID AS $$
BEGIN
    -- Insérer la transaction avec le statut FAILED
    INSERT INTO sepa_payment_transactions (order_id, stripe_payment_intent_id, amount, type, status, metadata)
    VALUES (p_order_id, p_stripe_intent, p_amount, p_type, 'FAILED', 
            jsonb_build_object('error', p_error_message, 'failed_at', NOW()));
    
    -- La commande reste dans son état actuel (AWAITING_DEPOSIT ou DELIVERED)
    -- Une logique d'alert admin peut être implémentée ailleurs
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Table pour suivre les tentatives de relance de paiement
CREATE TABLE IF NOT EXISTS sepa_payment_retries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID REFERENCES sepa_payment_transactions(id) ON DELETE CASCADE,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sepa_retries_transaction_id ON sepa_payment_retries(transaction_id);
