/** Types partagés module douanier (importables côté client). */

export type CustomsFileStatus =
  | 'DRAFT'
  | 'PRE_ADVICE'
  | 'IN_CUSTOMS'
  | 'LIQUIDATED'
  | 'PAID'
  | 'RELEASED'
  | 'BLOCKED'
