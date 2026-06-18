// Newsletter-attributed slice of the membership funnel.
//
// "Attributed to the email" = the user has at least one $pageview whose
// utm_source=newsletter (set by the UTM-tagged links in the weekly email).
// PostHog identifies logged-in users by their voyager_profiles.id, so a
// PostHog person_id maps directly to a Supabase user id.
//
// We deliberately use EVENT-level utm (not the first_touch_utm person property)
// because recipients are existing users whose first touch predates the email.
//
// Funnel: Clicked email → viewed Pack → initiated checkout → paid.
// Split A/B by experiment_group (which equals the link's utm_content).

import { createAdminClient } from '@/lib/supabase/server'
import { queryPostHog } from '@/lib/analytics/posthog-query'
import type { GroupKey } from '@/lib/analytics/membership-funnel'

export type NewsletterGroup = {
  group: GroupKey
  clicked: number            // distinct people who clicked a newsletter link
  packViews: number          // of those, viewed the Pack
  checkoutInitiated: number  // of those, initiated checkout
  ordersPaid: number         // of those, paid
}

export type NewsletterFunnel = {
  groups: NewsletterGroup[]
  totals: { clicked: number; packViews: number; checkoutInitiated: number; ordersPaid: number; revenueCents: number }
  tracked: boolean           // PostHog returned newsletter click data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

// Persons (= user ids) who clicked any newsletter link this run.
const NEWSLETTER_PERSONS = `
  SELECT distinct person_id FROM events
  WHERE event = '$pageview' AND properties.utm_source = 'newsletter'
`

function empty(group: GroupKey): NewsletterGroup {
  return { group, clicked: 0, packViews: 0, checkoutInitiated: 0, ordersPaid: 0 }
}

export async function getNewsletterFunnel(): Promise<NewsletterFunnel> {
  const G: Record<GroupKey, NewsletterGroup> = { direct: empty('direct'), task_gated: empty('task_gated') }
  const totals = { clicked: 0, packViews: 0, checkoutInitiated: 0, ordersPaid: 0, revenueCents: 0 }
  let tracked = false

  // ── PostHog: clicks (by utm_content), pack views + checkout (by group) ──────
  const newsletterIds = new Set<string>()
  try {
    const clicks = await queryPostHog(`
      SELECT coalesce(properties.utm_content, 'none') AS variant, count(distinct person_id) AS c
      FROM events
      WHERE event = '$pageview' AND properties.utm_source = 'newsletter'
      GROUP BY variant
    `)
    for (const row of clicks as [string, number][]) {
      const v = String(row[0]); const c = Number(row[1]) || 0
      totals.clicked += c
      if (v === 'direct' || v === 'task_gated') G[v].clicked += c
    }
    tracked = clicks.length > 0

    const ids = await queryPostHog(`SELECT distinct person_id FROM events
      WHERE event = '$pageview' AND properties.utm_source = 'newsletter'`)
    for (const row of ids as [string][]) if (row[0]) newsletterIds.add(String(row[0]))

    const pv = await queryPostHog(`
      SELECT coalesce(properties.experiment_group, 'none') AS grp, count(distinct person_id) AS c
      FROM events
      WHERE event = 'voyager_pack_viewed' AND person_id IN (${NEWSLETTER_PERSONS})
      GROUP BY grp
    `)
    for (const row of pv as [string, number][]) {
      const grp = String(row[0]); const c = Number(row[1]) || 0
      totals.packViews += c
      if (grp === 'direct' || grp === 'task_gated') G[grp].packViews += c
    }

    const ci = await queryPostHog(`
      SELECT coalesce(properties.experiment_group, 'none') AS grp, count(distinct person_id) AS c
      FROM events
      WHERE event = 'voyager_checkout_initiated' AND person_id IN (${NEWSLETTER_PERSONS})
      GROUP BY grp
    `)
    for (const row of ci as [string, number][]) {
      const grp = String(row[0]); const c = Number(row[1]) || 0
      totals.checkoutInitiated += c
      if (grp === 'direct' || grp === 'task_gated') G[grp].checkoutInitiated += c
    }
  } catch {
    // PostHog unconfigured / unreachable — return whatever we have (likely zeros).
    return { groups: [G.task_gated, G.direct], totals, tracked: false }
  }

  // ── Supabase: paid orders by newsletter-attributed users, split by group ────
  if (newsletterIds.size > 0) {
    const admin = createAdminClient() as DB
    const { data: profiles } = await admin
      .from('voyager_profiles')
      .select('id, experiment_group')
    const groupOf = new Map<string, GroupKey>()
    for (const p of profiles ?? []) {
      if ((p.experiment_group === 'direct' || p.experiment_group === 'task_gated') && newsletterIds.has(p.id)) {
        groupOf.set(p.id, p.experiment_group)
      }
    }

    const { data: orders } = await admin
      .from('voyager_orders')
      .select('user_id, status, amount')
    for (const o of orders ?? []) {
      if (o.status !== 'paid' || !o.user_id || !newsletterIds.has(o.user_id)) continue
      totals.ordersPaid++
      totals.revenueCents += o.amount ?? 0
      const grp = groupOf.get(o.user_id)
      if (grp) G[grp].ordersPaid++
    }
  }

  return { groups: [G.task_gated, G.direct], totals, tracked }
}
