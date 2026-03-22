-- Triggers attendus pour la validation Sprint Admin (updated_at + supersession)
-- À exécuter après 20260320140000_financial_foundations.sql

-- Colonnes de chaînage (historique « courant » vs supplanté)
ALTER TABLE public.exchange_rates
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

ALTER TABLE public.payment_proofs
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

-- -----------------------------------------------------------------------------
-- 1) payment_proofs.updated_at automatique
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_payment_proofs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_proofs_updated_at ON public.payment_proofs;
CREATE TRIGGER trg_payment_proofs_updated_at
  BEFORE UPDATE ON public.payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_payment_proofs_updated_at();

-- -----------------------------------------------------------------------------
-- 2) Nouveau taux USD→X : marque les lignes précédentes même paire comme supplantées
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_supersede_exchange_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.exchange_rates er
  SET superseded_at = now()
  WHERE er.id IS DISTINCT FROM NEW.id
    AND er.from_currency = NEW.from_currency
    AND er.to_currency = NEW.to_currency
    AND er.superseded_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_supersede_exchange_rate ON public.exchange_rates;
CREATE TRIGGER trg_supersede_exchange_rate
  AFTER INSERT ON public.exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_supersede_exchange_rate();

-- -----------------------------------------------------------------------------
-- 3) Nouvelle preuve sur une commande : supplante les anciennes preuves REJECTED
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_supersede_rejected_proof()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.payment_proofs pp
  SET superseded_at = now()
  WHERE pp.id IS DISTINCT FROM NEW.id
    AND pp.order_id = NEW.order_id
    AND pp.status = 'REJECTED'
    AND pp.superseded_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_supersede_rejected_proof ON public.payment_proofs;
CREATE TRIGGER trg_supersede_rejected_proof
  AFTER INSERT ON public.payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_supersede_rejected_proof();
