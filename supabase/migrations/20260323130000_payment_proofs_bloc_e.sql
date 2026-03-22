-- Bloc E — colonnes re-soumission + statut SUPERSEDED + trigger ciblé sur supersedes_proof_id

ALTER TABLE public.payment_proofs DROP CONSTRAINT IF EXISTS payment_proofs_status_check;
ALTER TABLE public.payment_proofs ADD CONSTRAINT payment_proofs_status_check
  CHECK (status IN ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED', 'SUPERSEDED'));

ALTER TABLE public.payment_proofs
  ADD COLUMN IF NOT EXISTS supersedes_proof_id uuid REFERENCES public.payment_proofs(id) ON DELETE SET NULL;

ALTER TABLE public.payment_proofs
  ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;

ALTER TABLE public.payment_proofs
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint;

ALTER TABLE public.payment_proofs
  ADD COLUMN IF NOT EXISTS file_mime_type text;

CREATE INDEX IF NOT EXISTS idx_payment_proofs_supersedes
  ON public.payment_proofs (supersedes_proof_id);

-- Remplace le trigger : quand une nouvelle preuve cite supersedes_proof_id, l’ancienne passe en SUPERSEDED
CREATE OR REPLACE FUNCTION public.fn_supersede_rejected_proof()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.supersedes_proof_id IS NOT NULL THEN
    UPDATE public.payment_proofs
    SET
      status = 'SUPERSEDED',
      superseded_at = COALESCE(superseded_at, now()),
      updated_at = now()
    WHERE id = NEW.supersedes_proof_id
      AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_supersede_rejected_proof ON public.payment_proofs;
CREATE TRIGGER trg_supersede_rejected_proof
  AFTER INSERT ON public.payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_supersede_rejected_proof();
