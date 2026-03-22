export type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export function ok<T>(data: T): ServerActionResult<T> {
  return { success: true, data }
}

export function fail<T = never>(error: string): ServerActionResult<T> {
  return { success: false, error }
}
