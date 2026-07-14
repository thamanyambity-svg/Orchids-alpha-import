export type UserRole = 'BUYER' | 'PARTNER' | 'ADMIN'
export type UserStatus = 'PENDING' | 'VERIFIED' | 'SUSPENDED'
export type KycStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'VERIFIED' | 'REJECTED'
export type ContractStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED'
export type SupplierStatus = 'ACTIVE' | 'RESTRICTED' | 'SUSPENDED'
export type RequestStatus = 'PENDING' | 'DRAFT' | 'ANALYSIS' | 'VALIDATED' | 'REJECTED' | 'AWAITING_DEPOSIT' | 'AWAITING_BALANCE' | 'EXECUTING' | 'SHIPPED' | 'DELIVERED' | 'INCIDENT' | 'CLOSED'
export type OrderStatus = 'PENDING' | 'AWAITING_DEPOSIT' | 'FUNDED' | 'SOURCING' | 'EXECUTING' | 'PURCHASED' | 'AWAITING_BALANCE' | 'SHIPPED' | 'DELIVERED' | 'CLOSED' | 'INCIDENT' | 'FROZEN' | 'CANCELLED'
export type PaymentType = 'DEPOSIT_60' | 'BALANCE_40'
export type PaymentStatus = 'PENDING' | 'BLOCKED' | 'RELEASED' | 'REFUNDED'
export type IncidentType = 'LOSS' | 'DELAY' | 'NON_CONFORMITY' | 'FRAUD'
export type IncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'FROZEN' | 'RESOLVED' | 'CANCELLED'
export type LedgerEntryType = 'DEPOSIT' | 'RELEASE' | 'COMMISSION' | 'REFUND' | 'FREEZE'
export type LedgerEntryStatus = 'BLOCKED' | 'AUTHORIZED' | 'EXECUTED'

export interface Country {
  id: string
  code: string
  name: string
  region: string | null
  is_active: boolean
  created_at: string
}

export interface Profile {
  id: string
  role: UserRole
  status: UserStatus
  email: string
  phone: string | null
  full_name: string | null
  company_name: string | null
  country_id: string | null
  city: string | null
  avatar_url: string | null
  mfa_enabled: boolean
  created_at: string
  updated_at: string
}

export interface BuyerProfile {
  id: string
  user_id: string
  activity_type: string | null
  kyc_status: KycStatus
  kyc_documents: unknown[]
  total_orders: number
  total_spent: number
  created_at: string
  updated_at: string
}

export interface PartnerProfile {
  id: string
  user_id: string
  country_id: string
  assigned_cities: string[]
  contract_status: ContractStatus
  deposit_amount: number
  commission_rate: number
  performance_score: number
  total_orders_handled: number
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  partner_id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  legal_docs: unknown[]
  capacity: string | null
  status: SupplierStatus
  validated_by_admin: boolean
  admin_notes: string | null
  rating: number
  created_at: string
  updated_at: string
}

export interface ImportRequest {
  id: string
  reference: string
  buyer_id: string
  country_id: string
  category: string
  specifications: Record<string, unknown>
  quantity: number | null
  unit: string | null
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  status: RequestStatus
  assigned_partner_id: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  reference: string
  request_id: string
  total_amount: number
  alpha_commission: number
  partner_payout: number
  status: OrderStatus
  validated_by_admin: boolean
  execution_deadline: string | null
  notes: string | null
  deposit_amount: number | null
  balance_amount: number | null
  deposit_paid: boolean
  balance_paid: boolean
  is_frozen: boolean
  escrow_activated: boolean
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  order_id: string
  type: PaymentType
  amount: number
  currency: string
  status: PaymentStatus
  payment_method: string | null
  transaction_ref: string | null
  paid_at: string | null
  released_at: string | null
  released_by: string | null
  created_at: string
}

export interface Document {
  id: string
  linked_type: string
  linked_id: string
  name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  uploaded_by: string
  hash: string | null
  created_at: string
}

export interface Incident {
  id: string
  order_id: string
  type: IncidentType
  description: string
  status: IncidentStatus
  reported_by: string
  decision: string | null
  resolved_by: string | null
  resolved_at: string | null
  compensation_amount: number | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  request_id: string | null
  sender_id: string
  recipient_id: string
  content: string
  is_read: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  actor_id: string
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface FinancialLedger {
  id: string
  order_id: string
  actor: string
  entry_type: LedgerEntryType
  amount: number
  currency: string
  status: LedgerEntryStatus
  description: string | null
  authorized_by: string | null
  created_at: string
}

// Types étendus pour les requêtes avec relations Supabase
export interface ImportRequestWithRelations extends ImportRequest {
  countries?: { name: string; flag?: string } | null
  assigned_partner?: Profile & { company_name?: string } | null
  country?: { name: string; code: string } | null
}

export interface RequestDocument {
  id: string
  request_id: string
  document_type?: string
  name?: string
  file_url: string
  file_type?: string | null
  created_at: string
}

export interface N8nWebhookPayload {
  event: string
  timestamp: string
  data?: Record<string, unknown>
}
