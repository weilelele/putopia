'use server'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

export type GuestHeroStats = {
  /** Every parallel world on record, across all three lifecycle stages. */
  worlds: number
  /** Voyagers + applicants + architects (everyone in the voyager program). */
  voyagers: number
}

/** Headline counts for the guest hero. Public + identical for everyone, so
 *  cached 60 s to cut DB load; new sign-ups / worlds self-heal within the window. */
const getGuestHeroStatsCached = unstable_cache(
  async (): Promise<GuestHeroStats> => {
    const admin = createAdminClient()
    const [worldsRes, voyagersRes] = await Promise.all([
      // All worlds regardless of lifecycle_state (raw + tuning + established).
      admin.from('worlds').select('*', { count: 'exact', head: true }),
      // Only registered accounts (registered_at set on /register completion) —
      // excludes invited-but-not-yet-registered profiles.
      admin
        .from('voyager_profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['voyager', 'applicant', 'architect'])
        .not('registered_at', 'is', null),
    ])
    return {
      worlds: worldsRes.count ?? 0,
      voyagers: voyagersRes.count ?? 0,
    }
  },
  ['guest-hero-stats'],
  { revalidate: 60 },
)

export async function getGuestHeroStats(): Promise<GuestHeroStats> {
  return getGuestHeroStatsCached()
}
