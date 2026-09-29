import 'server-only'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/actions/activity-events'

export async function recordVoyagerPathActivation(userId: string) {
  const admin = createAdminClient()
  const { data: profile } = await admin.from('voyager_profiles').select('display_name').eq('id', userId).single()
  await logActivity({ actor_id: userId, actor_name: profile?.display_name ?? 'Voyager', actor_role: 'voyager', event_type: 'voyager_activated', target_id: userId, target_title: 'Become a new Voyager', target_href: '/voyagers', group_key: 'voyager_activations' })
  revalidatePath('/voyagers')
  revalidatePath('/console')
  revalidatePath('/voyager-path')
}

/** Trusted payment callbacks only. Incomplete profiles are a successful no-op. */
export async function activatePaidVoyagerPath(userId: string): Promise<{ error: string | null }> {
  const admin = createAdminClient()
  // New RPC is introduced by schema_v81; generated database types lag migrations.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activated, error } = await (admin as any).rpc('activate_voyager_path', { p_user: userId })
  if (error) return { error: error.message }
  if (activated) await recordVoyagerPathActivation(userId)
  revalidatePath('/voyager-path')
  return { error: null }
}
