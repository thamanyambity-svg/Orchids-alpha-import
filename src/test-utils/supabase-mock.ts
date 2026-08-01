import { vi } from "vitest"

/**
 * Mock minimal du client Supabase pour tester les routes API.
 *
 * On enregistre chaque opération (table + type + payload) et on délègue la réponse
 * à un resolver fourni par le test, ce qui permet d'asserter aussi bien le résultat
 * HTTP que la forme exacte du payload envoyé à la base.
 */

export type SupabaseOp = {
  table: string
  type: "select" | "insert" | "update" | "delete"
  payload?: any
}

type Resolver = (op: SupabaseOp) => { data?: any; error?: any }

export function createSupabaseMock(resolver: Resolver) {
  const ops: SupabaseOp[] = []

  const from = vi.fn((table: string) => {
    const op: SupabaseOp = { table, type: "select" }
    ops.push(op)

    const settle = () => Promise.resolve(resolver(op))

    const builder: any = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      order: () => builder,
      limit: () => builder,
      insert: (payload: any) => {
        op.type = "insert"
        op.payload = payload
        return builder
      },
      update: (payload: any) => {
        op.type = "update"
        op.payload = payload
        return builder
      },
      delete: () => {
        op.type = "delete"
        return builder
      },
      single: settle,
      maybeSingle: settle,
      then: (onFulfilled: any, onRejected: any) => settle().then(onFulfilled, onRejected),
    }

    return builder
  })

  return {
    client: { from } as any,
    ops,
    /** Dernière opération enregistrée pour une table donnée. */
    lastOp: (table: string, type?: SupabaseOp["type"]) =>
      [...ops].reverse().find((o) => o.table === table && (!type || o.type === type)),
  }
}

/** Requête minimale compatible avec ce que consomment les routes (json/headers/url). */
export function makeRequest(
  body: unknown,
  { url = "http://localhost/api/test", headers = {} as Record<string, string> } = {}
) {
  return {
    url,
    json: async () => body,
    headers: { get: (key: string) => headers[key.toLowerCase()] ?? null },
  } as any
}
