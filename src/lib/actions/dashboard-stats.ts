'use server'

import { getGuestHeroStats } from './hero-stats'

/** Preserve the original headline display policy, including its reach multiplier.
 * These values are displayed once and cached verbatim in the offline snapshot. */
export async function getDashboardStats() {
  const stats = await getGuestHeroStats()
  return { worlds: stats.worlds, voyagers: Math.ceil(stats.voyagers * 1.7) }
}
