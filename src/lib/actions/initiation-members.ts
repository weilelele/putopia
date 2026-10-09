'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { INITIATION_BATCH, type InitiationPublicMember } from '@/lib/initiation-types'

/** Same active S26 roster as initiation_availability; includes granted/NPC members.
 * Private membership records stay server-side. No email, grant note or payment data.
 */
export async function getInitiationPublicMembers(): Promise<InitiationPublicMember[]> {
  try {
    // The new membership table is not yet present in generated Database types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    const { data, error } = await admin.from('initiation_members')
      .select('voyager_profiles!inner(id,display_name,avatar_url)')
      .eq('batch', INITIATION_BATCH).eq('active', true)
      .order('created_at', { ascending: true }).order('user_id', { ascending: true })
    if (error) return []
    return (data ?? []).map((row: { voyager_profiles: { id: string; display_name: string | null; avatar_url: string | null } }) => ({
      id: row.voyager_profiles.id,
      displayName: row.voyager_profiles.display_name?.trim() || 'Voyager',
      avatarUrl: row.voyager_profiles.avatar_url,
    }))
  } catch { return [] }
}
