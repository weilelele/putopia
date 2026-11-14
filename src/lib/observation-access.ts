import 'server-only'
import { canSubmitObservation } from './observation-access-model'
import { PAID_PACK_STATUSES } from './voyager-intake'
import { createAdminClient, createClient } from '@/lib/supabase/server'

/** Paid-but-not-yet-Voyager covers Pack buyers who have not finished their profile. */
async function hasPaidOrder(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  // Order columns used here are newer than the generated database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const [orders, initiation] = await Promise.all([
    db.from('voyager_orders').select('id').eq('user_id', userId).in('status', PAID_PACK_STATUSES).limit(1),
    db.from('initiation_orders').select('id').eq('user_id', userId).eq('status', 'paid').limit(1),
  ])
  if (orders.error || initiation.error) throw new Error('Order records are temporarily unavailable')
  return !!orders.data?.length || !!initiation.data?.length
}

export async function userCanSubmitObservation(userId: string, role: string | null | undefined): Promise<boolean> {
  return canSubmitObservation(role, false) || canSubmitObservation(role, await hasPaidOrder(userId))
}

/** Viewer-facing check for showing the submission form; the action re-checks. */
export async function viewerCanSubmitObservation(): Promise<boolean> {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return false
  const { data: profile } = await createAdminClient().from('voyager_profiles').select('role').eq('id', user.id).maybeSingle()
  return userCanSubmitObservation(user.id, profile?.role)
}
