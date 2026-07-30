'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/actions/activity-events'

export interface ClaimResult {
  ok:    boolean
  error?: string
}

// Device match (after the trait test). Payment and role changes are handled
// only by the verified Stripe webhook, never by a browser-callable action.
// Logged once a Voyager completes the matching test AND has paid. Wired in Phase 2.
export async function logDeviceMatch(opts: {
  deviceId:   string
  deviceName: string
}): Promise<ClaimResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()
  if (!profile || (profile.role !== 'voyager' && profile.role !== 'architect')) {
    return { ok: false, error: 'Voyager status required' }
  }

  await logActivity({
    actor_id:     user.id,
    actor_name:   profile.display_name ?? 'Unknown Voyager',
    actor_role:   profile.role,
    event_type:   'device_matched',
    target_id:    opts.deviceId,
    target_title: opts.deviceName,
    target_href:  `/devices/${opts.deviceId}`,
    group_key:    'device_matches',
  })

  revalidatePath('/console')
  return { ok: true }
}
