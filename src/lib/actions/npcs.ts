'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { getNpcIdentities, getNpcMemberBatches, getNpcInitiationState, saveNpcProfileRecord, requireNpcArchitect } from '@/lib/npc-repository'
import { validateNpcProfile, validateNpcMemberBatch, validateNpcRegistration, type NpcProfileInput } from '@/lib/npc-model'

function refreshNpcs() {
  revalidatePath('/admin/npcs')
  revalidatePath('/admin/npcs/[id]', 'page')
  revalidatePath('/devices', 'layout')
  revalidatePath('/voyagers')
  revalidatePath('/admin/voyagers')
  revalidatePath('/voyager-initiation')
}

export async function listNpcIdentities(batchSlug?: string) {
  try {
    await requireNpcArchitect()
    return await getNpcIdentities(batchSlug)
  } catch { return [] }
}

export async function saveNpc(id: string | null, input: NpcProfileInput) {
  let recoveryId = id
  try {
    const actorId = await requireNpcArchitect()
    const invalid = validateNpcProfile(input)
    if (invalid) return { error: invalid }
    if (id !== null && (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) return { error: 'Select a valid NPC.' }
    const batchError = validateNpcMemberBatch(input.batchLabel, await getNpcMemberBatches())
    if (batchError) return { error: batchError }
    const admin = createAdminClient()
    // Fail closed before creating Auth if v87 or roster reads are unavailable.
    const registrationError = validateNpcRegistration(input, await getNpcInitiationState(actorId, id))
    if (registrationError) return { error: registrationError }
    let npcId = id
    if (!npcId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: `npc-${randomUUID()}@npc.invalid`,
        password: randomUUID() + randomUUID(),
        email_confirm: false,
        ban_duration: '876000h',
        app_metadata: { account_kind: 'npc' },
        user_metadata: { display_name: input.displayName.trim() },
      })
      if (error || !data.user) return { error: error?.message ?? 'Could not create NPC.' }
      npcId = data.user.id
      recoveryId = npcId
    }
    const { data, error } = await saveNpcProfileRecord(actorId, npcId, input)
    if (error || !data) {
      // A transport failure can follow a committed roster write. Never delete
      // this identity or release its seat; expose its ID for safe retry/review.
      return { error: error?.message ?? 'Save result is unconfirmed. Reload this NPC before retrying.', id: npcId }
    }
    refreshNpcs()
    return { error: null, id: npcId }
  } catch (error) { return { error: error instanceof Error ? error.message : 'Could not save NPC.', id: recoveryId } }
}

export async function setNpcDevice(id: string, batchSlug: string, allocate: boolean) {
  try {
    const actorId = await requireNpcArchitect()
    if (!id || !batchSlug || typeof allocate !== 'boolean') return { error: 'Select an NPC and Batch.' }
    const { error } = await createAdminClient().rpc('set_npc_device_allocation', {
      p_actor_id: actorId, p_user_id: id, p_batch_slug: batchSlug, p_allocate: allocate,
    })
    if (error) return { error: error.message }
    refreshNpcs()
    return { error: null }
  } catch (error) { return { error: error instanceof Error ? error.message : 'Could not update allocation.' } }
}

export async function uploadNpcAvatar(id: string, formData: FormData) {
  try {
    await requireNpcArchitect()
    const admin = createAdminClient()
    const { data: npc } = await admin.from('voyager_profiles').select('id').eq('id', id).eq('account_kind', 'npc').single()
    if (!npc) return { error: 'NPC not found.' }
    const file = formData.get('avatar')
    if (!(file instanceof File) || !file.size || file.size > 750_000) return { error: 'Choose an image smaller than 750 KB.' }
    const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
    const ext = extensions[file.type]
    if (!ext) return { error: 'Choose a JPEG, PNG or WebP image.' }
    const path = `${id}/npc-${randomUUID()}.${ext}`
    const { error } = await admin.storage.from('avatars').upload(path, file, { contentType: file.type })
    if (error) return { error: error.message }
    const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path)
    const { error: saveError } = await admin.from('voyager_profiles').update({ avatar_url: publicUrl }).eq('id', id).eq('account_kind', 'npc')
    if (saveError) {
      await admin.storage.from('avatars').remove([path])
      return { error: 'Could not save avatar.' }
    }
    refreshNpcs()
    return { error: null, url: publicUrl }
  } catch { return { error: 'Could not upload avatar.' } }
}
