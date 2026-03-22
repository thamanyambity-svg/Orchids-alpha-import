/**
 * Statuts des preuves de paiement (table payment_proofs, migration financière).
 */
export type ProofStatus =
  | 'PENDING_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'SUPERSEDED'
