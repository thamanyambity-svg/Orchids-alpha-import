import { z } from 'zod'

export const transitionPayloadSchema = z.object({
  type: z.enum(['REQUEST', 'ORDER']),
  // Même raison que ci-dessous : `import_requests.id` et `orders.id` sont de
  // type uuid.
  id: z.string().uuid(),
  targetStatus: z.string().min(1).max(100),
  reason: z.string().max(1000).optional(),
})

export const checkoutPayloadSchema = z.object({
  // UUID et non chaîne libre : `orders.id` est de type uuid, donc une valeur
  // arbitraire atteignait Postgres qui levait 22P02, et la route rendait ce
  // défaut de saisie sous la forme « commande introuvable ». Une entrée
  // invalide doit être refusée à la frontière, pas traduite par la base.
  orderId: z.string().uuid(),
  paymentType: z.enum(['DEPOSIT_60', 'BALANCE_40']),
})

export function getRequiredEnvVars(names: string[]) {
  const missing = names.filter((name) => !process.env[name])
  return { missing, ok: missing.length === 0 }
}
