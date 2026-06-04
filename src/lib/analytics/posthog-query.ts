// Server-only helper for running HogQL queries against the PostHog query API.
// Mirrors the inline helper in src/app/api/analytics/snapshot/route.ts so the
// admin dashboards can query PostHog directly from a server component.

export async function queryPostHog(sql: string): Promise<unknown[][]> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  const apiHost = process.env.POSTHOG_API_HOST ?? 'https://us.posthog.com'
  if (!apiKey || !projectId) return []

  const res = await fetch(`${apiHost}/api/projects/${projectId}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.results ?? []
}
