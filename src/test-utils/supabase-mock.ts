import { vi } from "vitest"

/**
 * Mock minimal du client Supabase pour tester les routes API.
 *
 * On enregistre chaque opération (table + type + payload) et on délègue la réponse
 * à un resolver fourni par le test, ce qui permet d'asserter aussi bien le résultat
 * HTTP que la forme exacte du payload envoyé à la base.
 */

export type SupabaseFiltre = {
  operateur: string
  colonne: string
  valeur?: any
}

export type SupabaseOp = {
  table: string
  type: "select" | "insert" | "update" | "delete"
  payload?: any
  /**
   * Filtres appliqués à l'opération, dans l'ordre.
   *
   * Sans eux, un test ne peut vérifier que la donnée renvoyée, jamais la
   * restriction demandée — or c'est souvent la restriction qui porte la règle
   * de sécurité : « seulement les miens », « seulement les non résolus ».
   */
  filtres: SupabaseFiltre[]
}

type Resolver = (op: SupabaseOp) => { data?: any; error?: any }

export function createSupabaseMock(resolver: Resolver) {
  const ops: SupabaseOp[] = []

  const from = vi.fn((table: string) => {
    const op: SupabaseOp = { table, type: "select", filtres: [] }
    ops.push(op)

    const settle = () => Promise.resolve(resolver(op))

    const noter = (operateur: string) => (colonne: string, valeur?: any) => {
      op.filtres.push({ operateur, colonne, valeur })
      return builder
    }

    const builder: any = {
      select: () => builder,
      eq: noter("eq"),
      neq: noter("neq"),
      in: noter("in"),
      is: noter("is"),
      gt: noter("gt"),
      gte: noter("gte"),
      lt: noter("lt"),
      lte: noter("lte"),
      like: noter("like"),
      ilike: noter("ilike"),
      contains: noter("contains"),
      // `.not(colonne, operateur, valeur)` a une signature à trois arguments.
      not: (colonne: string, operateur: string, valeur?: any) => {
        op.filtres.push({ operateur: `not.${operateur}`, colonne, valeur })
        return builder
      },
      order: () => builder,
      limit: () => builder,
      range: () => builder,
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
    /** Vrai si la dernière opération sur cette table portait ce filtre. */
    aFiltre: (table: string, operateur: string, colonne: string) =>
      [...ops]
        .reverse()
        .find((o) => o.table === table)
        ?.filtres.some((f) => f.operateur === operateur && f.colonne === colonne) ?? false,
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
