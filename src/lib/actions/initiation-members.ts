'use server'

import { visibleMemberProfiles } from '@/lib/member-visibility'
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
    const profiles = await visibleMemberProfiles<{ id: string; display_name: string | null; avatar_url: string | null }>((data ?? []).map((row: { voyager_profiles: { id: string; display_name: string | null; avatar_url: string | null } }) => row.voyager_profiles))
    return profiles.map(profile => ({
      id: profile.id,
      displayName: profile.display_name?.trim() || 'Voyager',
      avatarUrl: profile.avatar_url,
    }))
  } catch { return [] }
}
