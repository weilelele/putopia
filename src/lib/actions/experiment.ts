'use server'

import { createClient } from '@/lib/supabase/server'

export type ExperimentGroup = 'direct' | 'task_gated'

/**
 * Returns the user's experiment group, assigning one randomly (50/50) on first call.
 * Assigned to every member (applicants, voyagers, architects alike) so the
 * experiment runs uniformly; the ad slot itself decides who actually sees it.
 * Returns null if the user is not authenticated.
 */
export async function getOrAssignExperimentGroup(): Promise<ExperimentGroup | null> {
  const supabase = await createClient()
  // This runs on the server, so validate the token with Supabase instead of
  // trusting the session payload stored in cookies.
  const { data: { user } } = await supabase.auth.getUser()
  const uid = user?.id
  if (!uid) return null

  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('experiment_group')
    .eq('id', uid)
    .single()

  if (!profile) return null

  // Already assigned — return as-is
  if (profile.experiment_group) return profile.experiment_group as ExperimentGroup

  // First visit: assign 50/50
  const group: ExperimentGroup = Math.random() < 0.5 ? 'direct' : 'task_gated'

  await supabase
    .from('voyager_profiles')
    .update({ experiment_group: group })
    .eq('id', uid)

  return group
}
