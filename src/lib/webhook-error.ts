/** Supabase/PostgREST errors are plain objects, so `instanceof Error` alone loses the database reason. */
export function webhookErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const { code, message } = error as { code?: unknown; message?: unknown }
    if (typeof message === 'string' && message) return typeof code === 'string' && code ? `${code}: ${message}` : message
  }
  return 'Unknown webhook failure'
}
