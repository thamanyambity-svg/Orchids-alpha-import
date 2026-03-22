/**
 * Bornes de période pour le dashboard finance (factures filtrées sur issued_at).
 */

export type PeriodPreset =
  | '7d'
  | '30d'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom'

export interface PeriodFilter {
  preset: PeriodPreset
  /** ISO — requis si preset = custom */
  dateFrom?: string
  dateTo?: string
}

export function computeDateRange(filter: PeriodFilter): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (filter.preset) {
    case '7d': {
      const from = new Date(today)
      from.setDate(from.getDate() - 6)
      return {
        dateFrom: from.toISOString(),
        dateTo: new Date(today.getTime() + 86399999).toISOString(),
      }
    }
    case '30d': {
      const from = new Date(today)
      from.setDate(from.getDate() - 29)
      return {
        dateFrom: from.toISOString(),
        dateTo: new Date(today.getTime() + 86399999).toISOString(),
      }
    }
    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
    }
    case 'last_month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
    }
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3)
      const from = new Date(now.getFullYear(), q * 3, 1)
      const to = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999)
      return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
    }
    case 'this_year': {
      const from = new Date(now.getFullYear(), 0, 1)
      const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
    }
    case 'custom':
    default:
      return {
        dateFrom: filter.dateFrom ?? today.toISOString(),
        dateTo: filter.dateTo ?? new Date(today.getTime() + 86399999).toISOString(),
      }
  }
}
