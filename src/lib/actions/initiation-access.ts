'use server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

/** Digital access facts; the caller decides policy, never infer payment from role. */
export async function getMyInitiationAccess(): Promise<{ formal: boolean; legacy: boolean; source: 'paid' | 'granted' | null; refundOrDispute: boolean }> {
  const client = await createClient()
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError && authError.name !== 'AuthSessionMissingError') throw new Error('Membership session unavailable.')
  if (!user) return { formal: false, legacy: false, source: null, refundOrDispute: false }
  // New schema is service-only. User ID always comes from verified auth.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data, error } = await admin.rpc('initiation_access_state', { p_user: user.id })
  if (error || !data) throw new Error('Membership access records unavailable.')
  return data
}
