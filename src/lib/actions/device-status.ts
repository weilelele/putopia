'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { requireNpcArchitect } from '@/lib/npc-repository'
import { getMyDeviceConsoles } from '@/lib/actions/orders'
import { resolveDeviceStatus, type DeviceStatus } from '@/lib/device-reporter'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The signed-in viewer's device status. A missing grants table counts as "not granted". */
export async function getMyDeviceStatus(): Promise<DeviceStatus> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { has: false, source: null }
  const [grant, consoles] = await Promise.all([
    (supabase.from('device_access_grants' as never) as ReturnType<typeof supabase.from>)
      .select('user_id').eq('user_id', user.id).maybeSingle(),
    getMyDeviceConsoles().catch(() => []),
  ])
  return resolveDeviceStatus({ granted: !grant.error && !!grant.data, consoles })
}

/** Back office: grant or remove the "has device" status for any user or NPC. Architect only. */
export async function setDeviceGrant(userId: string, granted: boolean): Promise<{ error: string | null }> {
  try {
    const actor = await requireNpcArchitect()
    if (!UUID.test(userId)) return { error: 'Invalid user.' }
    const admin = createAdminClient()
    const table = admin.from('device_access_grants' as never) as ReturnType<typeof admin.from>
    const { error } = granted
      ? await table.upsert({ user_id: userId, granted_by: actor, note: 'back-office' } as never, { onConflict: 'user_id' })
      : await table.delete().eq('user_id', userId)
    if (error) return { error: 'Could not update device status. Apply schema_v83 first.' }
    revalidatePath('/admin/npcs')
    revalidatePath('/admin/npcs/[id]', 'page')
    return { error: null }
  } catch { return { error: 'Architect permission required.' } }
}
