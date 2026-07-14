import { z } from 'zod'

export const transitionPayloadSchema = z.object({
  type: z.enum(['REQUEST', 'ORDER']),
  id: z.string().min(1).max(255),
  targetStatus: z.string().min(1).max(100),
  reason: z.string().max(1000).optional(),
})

export const checkoutPayloadSchema = z.object({
  orderId: z.string().min(1).max(255),
  paymentType: z.enum(['DEPOSIT_60', 'BALANCE_40']),
})

export function getRequiredEnvVars(names: string[]) {
  const missing = names.filter((name) => !process.env[name])
  return { missing, ok: missing.length === 0 }
}
