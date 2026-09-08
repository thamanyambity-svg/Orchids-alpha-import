import type { CustomsFileStatus } from '@/lib/customs/types'

export function getStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'DRAFT':
      return 'outline'
    case 'PRE_ADVICE':
    case 'IN_CUSTOMS':
      return 'secondary'
    case 'LIQUIDATED':
    case 'PAID':
    case 'RELEASED':
      return 'default'
    case 'BLOCKED':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Brouillon',
    PRE_ADVICE: 'Pré-alerte',
    IN_CUSTOMS: 'En douane',
    LIQUIDATED: 'Liquidé',
    PAID: 'Payé',
    RELEASED: 'Libéré',
    BLOCKED: 'Bloqué',
  }
  return labels[status] ?? status
}

export function isCustomsFileStatus(s: string): s is CustomsFileStatus {
  return [
    'DRAFT',
    'PRE_ADVICE',
    'IN_CUSTOMS',
    'LIQUIDATED',
    'PAID',
    'RELEASED',
    'BLOCKED',
  ].includes(s)
}
