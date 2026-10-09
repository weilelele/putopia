import 'server-only'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NPC_HOLDER_STATUSES, npcMemberBatchOptions, parseNpcInitiationState, type NpcProfileInput } from '@/lib/npc-model'

// Local v87 contract until the shared generated Database types are regenerated.
type NpcRpc = { rpc(name: 'npc_initiation_state' | 'save_npc_profile', args: {
  p_actor: string; p_user: string | null; p_profile?: NpcProfileInput
}): PromiseLike<{ data: unknown; error: { message: string } | null }> }

export async function saveNpcProfileRecord(actorId: string, npcId: string, input: NpcProfileInput) {
  return (createAdminClient() as unknown as NpcRpc).rpc('save_npc_profile', {
    p_actor: actorId, p_user: npcId, p_profile: input,
  })
}

/** Includes historical profile labels not present in the newer batches registry. */
export async function getNpcMemberBatches() {
  const admin = createAdminClient()
  const { data: registered, error } = await admin.from('batches')
    .select('label').order('sort_index').returns<{ label: string }[]>()
  if (error) throw new Error('Could not load member batches. Please try again.')
  const labels = (registered ?? []).map((batch) => batch.label)
  // Read all labels rather than silently dropping historical cohorts at the API row limit.
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error: profileError } = await admin.from('voyager_profiles')
      .select('batch_label').order('id').range(offset, offset + pageSize - 1)
    if (profileError) throw new Error('Could not load historical member batches. Please try again.')
    labels.push(...(data ?? []).map((profile) => profile.batch_label))
    if (!data || data.length < pageSize) break
  }
  return npcMemberBatchOptions([...labels, 'S26'])
}

export async function requireNpcArchitect() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Architect permission required.')
  const { data, error } = await createAdminClient().from('voyager_profiles')
    .select('role, account_kind').eq('id', user.id).single()
  if (error || data?.role !== 'architect' || data.account_kind !== 'human') throw new Error('Architect permission required.')
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

/** Every managed NPC identity, regardless of device allocation. */
export async function getAllNpcIdentities() {
  const { data, error } = await createAdminClient().from('voyager_profiles')
    .select('id, display_name, avatar_url, role, account_kind').eq('account_kind', 'npc').order('display_name')
  if (error) throw new Error('Could not load NPC identities.')
  return data ?? []
}

/** NPCs holding an active device, used only by device-allocation management. */
export async function getNpcIdentities(batchSlug?: string) {
  const admin = createAdminClient()
  const profiles = await getAllNpcIdentities()
  let query = admin.from('device_batch_units').select('user_id').in('status', [...NPC_HOLDER_STATUSES])
  if (batchSlug) query = query.eq('batch_slug', batchSlug)
  const { data: units, error: unitError } = await query
  if (unitError) throw new Error('Could not verify NPC devices.')
  const holders = new Set(units?.map((unit) => unit.user_id))
  return profiles.filter((profile) => holders.has(profile.id))
}

/** The RPC also validates the actor. Missing migrations/data are never 'unregistered'. */
export async function getNpcInitiationState(actorId: string, npcId: string | null) {
  const { data, error } = await (createAdminClient() as unknown as NpcRpc).rpc('npc_initiation_state', { p_actor: actorId, p_user: npcId })
  if (error) throw new Error('S26 registration status could not load. NPC management requires schema_v87. Please retry or contact an administrator.')
  return parseNpcInitiationState(data)
}
