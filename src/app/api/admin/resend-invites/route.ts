import { NextRequest } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const MAX_ATTEMPTS = 3
const DEFAULT_BATCH = 3

type PendingRow = { id: string; email: string; invite_resend_attempts: number }

export async function GET(request: NextRequest) {
  // Auth: EITHER a valid CRON_SECRET (GitHub Action) OR an authenticated architect.
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  const hasCronSecret = !!secret && auth === `Bearer ${secret}`

  if (!hasCronSecret) {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    let isArchitect = false
    if (user) {
      const adminCheck = createAdminClient()
      const { data: profile } = await adminCheck
        .from('voyager_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      isArchitect = profile?.role === 'architect'
    }
    if (!isArchitect) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const batch = Math.max(1, Math.min(20, Number(request.nextUrl.searchParams.get('count') ?? DEFAULT_BATCH)))
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://multiverseco.org'
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pending } = await (admin.from('applications') as any)
    .select('id, email, invite_resend_attempts')
    .eq('invite_resend_status', 'pending')
    .lt('invite_resend_attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(batch)

  const rows = (pending ?? []) as PendingRow[]
  const results: { email: string; outcome: string }[] = []

  for (const row of rows) {
    const attempts = (row.invite_resend_attempts ?? 0) + 1
    const { error } = await admin.auth.admin.inviteUserByEmail(row.email, {
      redirectTo: `${siteUrl}/auth/callback?next=/register`,
    })

    let patch: Record<string, unknown>
    let outcome: string

    if (!error) {
      patch = { invite_resend_status: 'sent', invite_resent_at: new Date().toISOString(), invite_resend_attempts: attempts, invite_resend_error: null }
      outcome = 'sent'
    } else if (/already been registered|already registered|already exists/i.test(error.message)) {
      // An auth user now exists for this address (e.g. re-applied) — nothing to do.
      patch = { invite_resend_status: 'skipped', invite_resend_attempts: attempts, invite_resend_error: error.message }
      outcome = 'skipped (already exists)'
    } else if (/rate limit/i.test(error.message)) {
      // Transient — leave pending and do NOT burn an attempt; next cron run retries.
      patch = { invite_resend_error: error.message }
      outcome = 'deferred (rate limited)'
    } else {
      patch = {
        invite_resend_attempts: attempts,
        invite_resend_error: error.message,
        invite_resend_status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
      }
      outcome = attempts >= MAX_ATTEMPTS ? `failed (${error.message})` : `retry (${error.message})`
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('applications') as any).update(patch).eq('id', row.id)
    results.push({ email: row.email, outcome })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: remaining } = await (admin.from('applications') as any)
    .select('*', { count: 'exact', head: true })
    .eq('invite_resend_status', 'pending')

  return Response.json({ processed: results.length, remaining: remaining ?? 0, results })
}
