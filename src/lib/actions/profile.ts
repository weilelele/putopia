'use server'

import { randomUUID } from 'node:crypto'
import { AVATAR_MAX_BYTES, validateAvatar, validateProfileUpdate } from '@/lib/profile-validation'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { VoyagerProfileUpdate } from '@/types/database'
import { visibleMemberProfiles } from '@/lib/member-visibility'
import { upsertLoopsContact } from '@/lib/loops'

export async function syncLoopsRegistration(
  email: string,
  displayName: string,
  userId: string,
): Promise<void> {
  await upsertLoopsContact({
    email,
    firstName: displayName,
    userId,
    userGroup: 'registered',
    registered: true,
  })
}

export async function getMyProfile() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError && authError.name !== 'AuthSessionMissingError') throw new Error('Your session could not be verified.')
  if (!user) return null
  const { data, error } = await supabase.from('voyager_profiles').select('*').eq('id', user.id).single()
  if (error || !data) throw new Error('Your profile could not be loaded.')
  return data
}

function refreshProfilePages() {
  for (const path of ['/console', '/profile', '/voyagers']) revalidatePath(path)
}

export async function updateProfile(updates: VoyagerProfileUpdate) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Not authenticated' }
    const { data: profile, error: profileError } = await supabase.from('voyager_profiles').select('role').eq('id', user.id).single()
    if (profileError || !profile) return { error: 'Your profile could not be verified.' }
    const validated = validateProfileUpdate(updates, profile.role)
    if (validated.error) return { error: validated.error }
    const { data, error } = await supabase.from('voyager_profiles').update(validated.updates!).eq('id', user.id).eq('role', profile.role).select('id').single()
    if (error || !data) return { error: 'Your profile could not be saved. Reload your profile and try again.' }
    refreshProfilePages()
    return { error: null }
  } catch {
    return { error: 'Your profile update could not be confirmed. Reload your profile before trying again.' }
  }
}

export async function uploadAvatar(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Not authenticated', url: null }
    const { data: profile, error: profileError } = await supabase.from('voyager_profiles').select('role').eq('id', user.id).single()
    if (profileError || !profile || !['applicant', 'voyager', 'architect'].includes(profile.role)) return { error: 'Your profile could not be verified for editing.', url: null }
    const file = formData.get('avatar')
    if (!(file instanceof File) || !file.size || file.size > AVATAR_MAX_BYTES) return { error: 'Choose an image up to 5 MB.', url: null }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const validated = validateAvatar(bytes, file.type)
    if (validated.error) return { error: validated.error, url: null }
    // Unique names preserve the previous avatar if upload or profile saving fails.
    const path = `${user.id}/avatar-${randomUUID()}.${validated.extension}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, bytes, { upsert: false, contentType: file.type })
    if (uploadError) return { error: 'Avatar upload failed. Please try again.', url: null }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const { data, error } = await supabase.from('voyager_profiles').update({ avatar_url: publicUrl }).eq('id', user.id).eq('role', profile.role).select('id').single()
    // Do not delete on an ambiguous write result: the URL might have been saved.
    if (error || !data) return { error: 'Your avatar update could not be confirmed. Reload your profile before trying again.', url: null }
    refreshProfilePages()
    return { error: null, url: publicUrl }
  } catch {
    return { error: 'Your avatar update could not be confirmed. Reload your profile before trying again.', url: null }
  }
}

export async function getAllVoyagers() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('voyager_profiles')
    .select('*')
    .in('role', ['voyager', 'architect'])
    .order('joined_at', { ascending: true })

  return visibleMemberProfiles(data ?? [])
}

export async function getVoyagerById(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('voyager_profiles')
    .select('*')
    .eq('id', id)
    .single()
  return data ? (await visibleMemberProfiles([data]))[0] ?? null : null
}

// Architect-only: reassign a voyager's batch (writes past RLS via service role).
export async function setVoyagerBatch(voyagerId: string, batchLabel: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (me?.role !== 'architect') return { error: 'Forbidden' }

  const label = batchLabel.trim() || 'Original Batch'
  const admin = createAdminClient()
  // batch_label is admin-managed, not in the RLS-restricted VoyagerProfileUpdate type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('voyager_profiles') as any)
    .update({ batch_label: label })
    .eq('id', voyagerId)

  if (error) return { error: error.message }
  revalidatePath('/voyagers')
  revalidatePath('/admin/voyagers')
  return { error: null }
}

export async function searchMembers(query: string, scope: 'members' | 'npcs' = 'members') {
  const supabase = await createClient()
  let search = supabase
    .from('voyager_profiles')
    .select('id, display_name, role, account_kind')
  search = scope === 'npcs'
    ? search.eq('account_kind', 'npc')
    : search.or('account_kind.eq.human,account_kind.is.null').in('role', ['voyager', 'architect'])
  const { data } = await search
    .ilike('display_name', `%${query}%`)
    .order('display_name')
    .limit(10)

  return data ?? []
}

/** Public member details only; existing profile RLS remains authoritative. */
export async function getMemberProfile(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('voyager_profiles')
    .select('id, display_name, avatar_url, role, account_kind, bio, location, batch_label, joined_at, observation_days, worlds_discovered, social_x, social_instagram, social_linkedin')
    .eq('id', id).maybeSingle()
  if (error) throw new Error('Member profile could not be loaded.')
  return data ? (await visibleMemberProfiles([data]))[0] ?? null : null
}

/** Read-only display milestone; never grants a role or changes entitlement. */
export async function getMyProfileStages(): Promise<{ consoleBound: boolean; accessRole: import('@/types/database').UserRole }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError && authError.name !== 'AuthSessionMissingError') throw new Error('Your session could not be verified.')
  if (!user) return { consoleBound: false, accessRole: 'guest' }
  // Keep the display milestone separate from effective digital membership.
  // A stored profile role is not proof of an active entitlement.
  const [binding, access] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient() as any).rpc('has_bound_console', { p_user: user.id }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('effective_access_role'),
  ])
  if (binding.error || typeof binding.data !== 'boolean' || access.error || !['guest', 'applicant', 'voyager', 'architect'].includes(access.data)) {
    throw new Error('Your membership and Console status could not be loaded.')
  }
  return { consoleBound: binding.data, accessRole: access.data }
}
