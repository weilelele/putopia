'use server'
import { createClient } from '@/lib/supabase/server'
import { accessRole } from '@/lib/digital-access'
import type { UserRole } from '@/types/database'

/** Same no-argument DB decision used by RLS. No role fallback grants membership. */
export async function getMyDigitalAccessRole(): Promise<UserRole> {
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error && error.name !== 'AuthSessionMissingError') throw new Error('Access could not be verified.')
  if (!user) return 'guest'
  // schema_v89 RPC; generated types are integrated by the root task.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (client as any).rpc('effective_access_role')
  if (result.error || !['guest', 'applicant', 'voyager', 'architect'].includes(result.data)) throw new Error('Member access is unavailable.')
  return accessRole(result.data, true)
}
