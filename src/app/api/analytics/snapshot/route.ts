import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

const POSTHOG_EVENTS = [
  'onboarding_started',
  'onboarding_q1_completed',
  'onboarding_q2_completed',
  'onboarding_email_submitted',
  'console_login_clicked',
]

async function queryPostHog(sql: string): Promise<number[][]> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  const apiHost = process.env.POSTHOG_API_HOST ?? 'https://us.posthog.com'
  if (!apiKey || !projectId) return []

  const res = await fetch(`${apiHost}/api/projects/${projectId}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.results ?? []
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const versionTag = request.nextUrl.searchParams.get('version_tag') ?? null
  const supabase = createAdminClient()

  // ── PostHog: named events (all-time + last-30d unique persons) ──────────────
  const eventList = POSTHOG_EVENTS.map(e => `'${e}'`).join(', ')
  const [allTimeRows, window30dRows, pageviewAllTime, pageview30d] = await Promise.all([
    queryPostHog(`
      SELECT event, count(distinct person_id) as cnt
      FROM events WHERE event IN (${eventList})
      GROUP BY event
    `),
    queryPostHog(`
      SELECT event, count(distinct person_id) as cnt
      FROM events WHERE event IN (${eventList})
      AND toDate(timestamp) >= today() - 30
      GROUP BY event
    `),
    queryPostHog(`
      SELECT count(distinct person_id) as cnt
      FROM events WHERE event = '$pageview' AND properties.$pathname = '/'
    `),
    queryPostHog(`
      SELECT count(distinct person_id) as cnt
      FROM events WHERE event = '$pageview' AND properties.$pathname = '/'
      AND toDate(timestamp) >= today() - 30
    `),
  ])

  const byEvent = (rows: number[][], eventName: string): number => {
    const row = (rows as [string, number][]).find(r => r[0] === eventName)
    return row ? row[1] : 0
  }

  // ── Supabase: applications (email submissions), invite link clicks, registrations ──
  const cutoff30d = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [
    { count: appAll },
    { count: app30d },
    { count: regAll },
    { count: reg30d },
    // Confirmed auth users (clicked invite link) — queried via SECURITY DEFINER RPC
    // since auth.users is not accessible through PostgREST directly
    { data: clickedAllData },
    { data: clicked30dData },
  ] = await Promise.all([
    supabase.from('applications').select('*', { count: 'exact', head: true }),
    supabase.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', cutoff30d),
    supabase.from('voyager_profiles').select('*', { count: 'exact', head: true }).not('registered_at', 'is', null),
    supabase.from('voyager_profiles').select('*', { count: 'exact', head: true }).not('registered_at', 'is', null).gte('registered_at', cutoff30d),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('count_confirmed_auth_users'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('count_confirmed_auth_users_30d', { cutoff: cutoff30d }),
  ])

  const clickedAll = (clickedAllData as number | null) ?? 0
  const clicked30d = (clicked30dData as number | null) ?? 0

  // For email_submitted: use Supabase applications table (has full history)
  // PostHog event only tracks from today onward; prefer whichever is larger
  const phEmailAll = byEvent(allTimeRows, 'onboarding_email_submitted')
  const phEmail30d = byEvent(window30dRows, 'onboarding_email_submitted')
  const emailAll   = Math.max(phEmailAll, appAll ?? 0)
  const email30d   = Math.max(phEmail30d, app30d ?? 0)

  const runId = randomUUID()
  const steps = [
    // step 0: traffic reference — shown above the funnel, excluded from conversion rates
    { key: 'homepage_visit',             label: 'Homepage (traffic ref)', order: 0, all: pageviewAllTime[0]?.[0] ?? 0, d30: pageview30d[0]?.[0] ?? 0 },
    // funnel steps 1–6: conversion rates calculated relative to step 1
    { key: 'onboarding_started',         label: 'Onboarding Started', order: 1, all: byEvent(allTimeRows, 'onboarding_started'),      d30: byEvent(window30dRows, 'onboarding_started') },
    { key: 'onboarding_q1_completed',    label: 'Q1 Completed',       order: 2, all: byEvent(allTimeRows, 'onboarding_q1_completed'), d30: byEvent(window30dRows, 'onboarding_q1_completed') },
    { key: 'onboarding_q2_completed',    label: 'Q2 Completed',       order: 3, all: byEvent(allTimeRows, 'onboarding_q2_completed'), d30: byEvent(window30dRows, 'onboarding_q2_completed') },
    { key: 'onboarding_email_submitted', label: 'Email Submitted',    order: 4, all: emailAll,    d30: email30d },
    { key: 'invite_link_clicked',        label: 'Invite Link Clicked', order: 5, all: clickedAll, d30: clicked30d },
    { key: 'registered',                 label: 'Account Registered', order: 6, all: regAll ?? 0, d30: reg30d ?? 0 },
    // Retention: separate from acquisition funnel
    { key: 'console_login_clicked',      label: 'Returned to Login',  order: 7, all: byEvent(allTimeRows, 'console_login_clicked'), d30: byEvent(window30dRows, 'console_login_clicked') },
  ]

  const { error } = await supabase.from('funnel_snapshots').insert(
    steps.map(s => ({
      run_id:         runId,
      version_tag:    versionTag,
      step_key:       s.key,
      step_label:     s.label,
      step_order:     s.order,
      count_all_time: s.all,
      count_30d:      s.d30,
    }))
  )

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true, run_id: runId, steps })
}
