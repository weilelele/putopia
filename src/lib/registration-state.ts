import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'

/** True while an account has not completed /register (no display name or password chosen yet). */
export async function needsRegistration(userId: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (createAdminClient() as any).from('voyager_profiles').select('registered_at').eq('id', userId).maybeSingle()
  if (error) throw error
  return !!data && !data.registered_at
}
