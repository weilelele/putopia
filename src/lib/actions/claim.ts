'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/actions/activity-events'

// ─── PHASE 1: MOCK CLAIM ───────────────────────────────────────────────────────
// Payment is NOT wired yet. This simulates a successful payment return:
//   1. verifies the user is authenticated + at least applicant
//   2. upgrades their role to voyager (admin client, bypasses RLS)
//   3. logs a `voyager_activated` feed event
// When Stripe lands, the role-upgrade + logging move behind a verified webhook.

export interface ClaimResult {
  ok:    boolean
  error?: string
}

export async function mockClaimFirstPack(): Promise<ClaimResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  // Read current profile
  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (!profile) return { ok: false, error: 'Profile not found' }
  if (profile.role === 'guest') return { ok: false, error: 'Apply first' }
  if (profile.role === 'voyager' || profile.role === 'architect') {
    return { ok: false, error: 'Already a Voyager' }
  }

  // Upgrade role → voyager (admin: role is RLS-protected, users can't self-promote)
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upErr } = await (admin.from('voyager_profiles') as any)
    .update({ role: 'voyager', batch_label: 'Cairo Batch 01' })
    .eq('id', user.id)

  if (upErr) return { ok: false, error: upErr.message }

  // Log feed event — folds with other recent activations.
  // Device Seeker = pack-purchase path (this mock + future Stripe webhook).
  // World Builder  = separate sub-role flow, wired in when that system is ready.
  await logActivity({
    actor_id:     user.id,
    actor_name:   profile.display_name ?? 'Unknown Voyager',
    actor_role:   'voyager',
    event_type:   'voyager_activated',
    target_title: 'Become a new Voyager: Device Seeker',
    target_href:  '/voyagers',
    group_key:    'voyager_activations',
  })

  revalidatePath('/console')
  revalidatePath('/devices')
  revalidatePath('/profile')
  revalidatePath('/voyagers')
  return { ok: true }
}

// ─── PHASE 2 placeholder: device match (after the trait test) ──────────────────
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
