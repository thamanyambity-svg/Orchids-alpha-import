import { z } from "zod"

export const checkoutPayloadSchema = z.object({
  orderId: z.string().uuid(),
  paymentType: z.enum(["DEPOSIT_60", "BALANCE_40"]),
})

export const transitionPayloadSchema = z.object({
  type: z.enum(["REQUEST", "ORDER"]),
  id: z.string().uuid(),
  targetStatus: z.string().min(1).max(100),
  reason: z.string().max(1000).optional(),
})

export const adminActionSchema = z.object({
  action: z.enum(["ASSIGN_PARTNER", "VALIDATE", "REJECT", "FREEZE", "UNFREEZE"]),
  requestId: z.string().uuid(),
  data: z.record(z.string(), z.any()).optional(),
})

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  company_name: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  language: z.enum(["fr", "en", "tr", "zh", "ja", "ar"]).optional(),
})

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  full_name: z.string().min(1).max(200),
  company_name: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const requestSchema = z.object({
  product_name: z.string().min(1).max(500),
  quantity: z.number().positive().optional(),
  budget_min: z.number().nonnegative().optional(),
  budget_max: z.number().nonnegative().optional(),
  country: z.string().min(1).max(100),
  description: z.string().max(5000).optional(),
  category: z.string().max(200).optional(),
})

export const partnerSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  company_name: z.string().min(1).max(200),
  country: z.string().min(1).max(100),
  phone: z.string().max(30).optional(),
  cities: z.array(z.string()).optional(),
})

export const incidentSchema = z.object({
  orderId: z.string().uuid(),
  type: z.enum(["DELAY", "QUALITY", "DAMAGE", "OTHER"]),
  description: z.string().min(1).max(5000),
  attachments: z.array(z.string()).optional(),
})

export const invoiceSchema = z.object({
  orderId: z.string().uuid(),
  type: z.enum(["PROFORMA", "COMMERCIAL", "FINAL"]),
})

export const messageSchema = z.object({
  recipient_id: z.string().uuid(),
  subject: z.string().min(1).max(500),
  content: z.string().min(1).max(10000),
})

export const sepaMandateSchema = z.object({
  iban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/),
  bic: z.string().regex(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/),
  name: z.string().min(1).max(200),
})

export const sepaDebitSchema = z.object({
  orderId: z.string().uuid(),
  paymentType: z.enum(["DEPOSIT_60", "BALANCE_40"]),
  amount: z.number().positive().optional(),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  sort: z.string().max(50).optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
})

export function validate<T>(schema: z.ZodType<T>, data: unknown): { data?: T; error?: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const firstError = result.error.issues[0]
    return { error: `${firstError.path.join(".")}: ${firstError.message}` }
  }
  return { data: result.data }
}
