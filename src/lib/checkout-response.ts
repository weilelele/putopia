/** Parse only the expected response shape; upstream errors may be HTML. */
export function parseCheckoutResponse(body: string): { url?: string; error?: string } {
  try {
    const parsed: unknown = JSON.parse(body)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const result = parsed as Record<string, unknown>
    return {
      url: typeof result.url === 'string' ? result.url : undefined,
      error: typeof result.error === 'string' ? result.error : undefined,
    }
  } catch {
    return {}
  }
}
