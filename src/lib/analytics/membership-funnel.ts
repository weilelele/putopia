// Membership module analytics — Path tasks → Pack views → checkout → payment.
//
// Sources:
//   • Supabase  — voyager_profiles (task flags + group), worlds (sighting),
//                 vote_responses (votes), voyager_orders (created / paid).
//   • PostHog   — voyager_pack_viewed (page views), voyager_checkout_initiated
//                 (clicked "buy" and reached /api/checkout). Both carry
//                 experiment_group so the funnel can be split A/B.
//
// All Supabase figures are full-history live counts. PostHog figures accumulate
// from the day the events shipped (pre-launch they read 0 — expected).

import { createAdminClient } from '@/lib/supabase/server'
import { queryPostHog } from '@/lib/analytics/posthog-query'

export type GroupKey = 'direct' | 'task_gated'

export type GroupFunnel = {
  group: GroupKey
  cohort: number        // registered, group-assigned, non-architect
  sighting: number      // submitted ≥1 world
  quiz: number          // passed the assessment
  intel: number         // read an Architect report
  votes: number         // ≥2 distinct votes
  eligible: number      // sighting && quiz → may purchase
  becameVoyager: number // role is now voyager (promoted/paid in)
  packViews: number     // PostHog voyager_pack_viewed
  checkoutInitiated: number // PostHog voyager_checkout_initiated
  ordersCreated: number // voyager_orders rows
  ordersPaid: number    // voyager_orders status = paid
}

export type MembershipFunnel = {
  groups: GroupFunnel[]
  totals: {
    packViews: number
    packViews30d: number
    checkoutInitiated: number
    ordersCreated: number
    ordersPaid: number
    revenueCents: number
  }
  packTracked: boolean // PostHog returned any pack-view data
}

function emptyGroup(group: GroupKey): GroupFunnel {
  return {
    group, cohort: 0, sighting: 0, quiz: 0, intel: 0, votes: 0, eligible: 0,
    becameVoyager: 0, packViews: 0, checkoutInitiated: 0, ordersCreated: 0, ordersPaid: 0,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

export async function getMembershipFunnel(): Promise<MembershipFunnel> {
  const admin = createAdminClient() as DB

  // ── Profiles in the experiment ───────────────────────────────────────────
  const { data: profiles } = await admin
    .from('voyager_profiles')
    .select('id, experiment_group, role, registered_at, task_quiz_at, task_intel_at')

  const inExp = (profiles ?? []).filter(
    (p: DB) => p.experiment_group && p.registered_at && p.role !== 'architect',
  )
  const groupOf = new Map<string, GroupKey>()
  for (const p of inExp) groupOf.set(p.id, p.experiment_group)

  // ── Sighting: distinct world submitters ──────────────────────────────────
  const { data: worlds } = await admin.from('worlds').select('submitted_by')
  const sightingSet = new Set<string>(
    (worlds ?? []).map((w: DB) => w.submitted_by).filter(Boolean),
  )

  // ── Votes: users with ≥2 distinct vote_id ────────────────────────────────
  const { data: vr } = await admin
    .from('vote_responses')
    .select('user_id, vote_id')
    .not('user_id', 'is', null)
  const voteMap = new Map<string, Set<string>>()
  for (const r of vr ?? []) {
    if (!r.user_id) continue
    if (!voteMap.has(r.user_id)) voteMap.set(r.user_id, new Set())
    voteMap.get(r.user_id)!.add(r.vote_id)
  }
  const voterSet = new Set<string>(
    [...voteMap].filter(([, s]) => s.size >= 2).map(([u]) => u),
  )

  // ── Build per-group task funnels ─────────────────────────────────────────
  const G: Record<GroupKey, GroupFunnel> = {
    direct: emptyGroup('direct'),
    task_gated: emptyGroup('task_gated'),
  }
  for (const p of inExp) {
    const g = G[p.experiment_group as GroupKey]
    g.cohort++
    const hasSighting = sightingSet.has(p.id)
    const hasQuiz = !!p.task_quiz_at
    if (hasSighting) g.sighting++
    if (hasQuiz) g.quiz++
    if (p.task_intel_at) g.intel++
    if (voterSet.has(p.id)) g.votes++
    if (hasSighting && hasQuiz) g.eligible++
    if (p.role === 'voyager') g.becameVoyager++
  }

  // ── Orders (created / paid / revenue) ────────────────────────────────────
  const { data: orders } = await admin
    .from('voyager_orders')
    .select('user_id, status, amount')
  const totals = {
    packViews: 0, packViews30d: 0, checkoutInitiated: 0,
    ordersCreated: 0, ordersPaid: 0, revenueCents: 0,
  }
  for (const o of orders ?? []) {
    const paid = o.status === 'paid'
    totals.ordersCreated++
    if (paid) {
      totals.ordersPaid++
      totals.revenueCents += o.amount ?? 0
    }
    const grp = o.user_id ? groupOf.get(o.user_id) : undefined
    if (grp) {
      G[grp].ordersCreated++
      if (paid) G[grp].ordersPaid++
    }
  }

  // ── PostHog: pack views + checkout initiations, split by group ───────────
  let packTracked = false
  try {
    const pv = await queryPostHog(`
      SELECT coalesce(properties.experiment_group, 'none') AS grp,
             count() AS c,
             countIf(timestamp >= now() - interval 30 day) AS c30
      FROM events
      WHERE event = 'voyager_pack_viewed'
      GROUP BY grp
    `)
    for (const row of pv as [string, number, number][]) {
      const grp = String(row[0])
      const c = Number(row[1]) || 0
      const c30 = Number(row[2]) || 0
      totals.packViews += c
      totals.packViews30d += c30
      if (grp === 'direct' || grp === 'task_gated') G[grp].packViews += c
    }
    packTracked = pv.length > 0

    const ci = await queryPostHog(`
      SELECT coalesce(properties.experiment_group, 'none') AS grp, count() AS c
      FROM events
      WHERE event = 'voyager_checkout_initiated'
      GROUP BY grp
    `)
    for (const row of ci as [string, number][]) {
      const grp = String(row[0])
      const c = Number(row[1]) || 0
      totals.checkoutInitiated += c
      if (grp === 'direct' || grp === 'task_gated') G[grp].checkoutInitiated += c
    }
  } catch {
    // PostHog unconfigured / unreachable — Supabase figures still render.
  }

  return { groups: [G.task_gated, G.direct], totals, packTracked }
}
