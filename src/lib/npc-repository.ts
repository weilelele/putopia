import 'server-only'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NPC_HOLDER_STATUSES } from '@/lib/npc-model'

export async function requireNpcArchitect() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Architect permission required.')
  const { data, error } = await createAdminClient().from('voyager_profiles')
    .select('role, account_kind').eq('id', user.id).single()
  if (error || data?.role !== 'architect' || data.account_kind === 'npc') throw new Error('Architect permission required.')
  return user.id
}

export async function npcHasDevice(id: string, batchSlug?: string) {
  let query = createAdminClient().from('device_batch_units').select('id')
    .eq('user_id', id).in('status', [...NPC_HOLDER_STATUSES])
  if (batchSlug) query = query.eq('batch_slug', batchSlug)
  const { data, error } = await query.limit(1)
  if (error) throw new Error('Could not verify device ownership.')
  return !!data?.length
}

export async function getNpcIdentities(batchSlug?: string) {
  const admin = createAdminClient()
  const { data: profiles, error } = await admin.from('voyager_profiles')
    .select('id, display_name, avatar_url, role, account_kind').eq('account_kind', 'npc').order('display_name')
  if (error) throw new Error('Could not load NPC identities.')
  let query = admin.from('device_batch_units').select('user_id').in('status', [...NPC_HOLDER_STATUSES])
  if (batchSlug) query = query.eq('batch_slug', batchSlug)
  const { data: units, error: unitError } = await query
  if (unitError) throw new Error('Could not verify NPC devices.')
  const holders = new Set(units?.map((unit) => unit.user_id))
  return (profiles ?? []).filter((profile) => holders.has(profile.id))
}
