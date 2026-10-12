import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'

/** Deletion shells retain operational records, but never appear as public members. */
export async function visibleMemberProfiles<T extends { id: string }>(profiles: T[]): Promise<T[]> {
  if (!profiles.length) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (createAdminClient() as any).from('account_deletions')
    .select('user_id').in('user_id', profiles.map(profile => profile.id))
  if (error) throw new Error('Member visibility could not be verified.')
  const hidden = new Set((data ?? []).map((row: { user_id: string }) => row.user_id))
  return profiles.filter(profile => !hidden.has(profile.id))
}
