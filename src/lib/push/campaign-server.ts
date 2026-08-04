import 'server-only'

import { timingSafeEqual } from 'node:crypto'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  CAMPAIGN_ROLES,
  type CampaignAudience,
  type PushCampaignProfile,
} from '@/lib/push/campaign'

// Tables introduced after the generated database types. Keep the looseness local.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PushCampaignDb = any

function secretsMatch(expected: string, provided: string): boolean {
  const expectedBytes = Buffer.from(expected)
  const providedBytes = Buffer.from(provided)
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes)
}

export async function authorizePushCampaign(request: Request): Promise<{ actorId: string | null; actorLabel: string }> {
  const configuredSecret = process.env.PUSH_CAMPAIGN_SECRET
  const authorization = request.headers.get('authorization')
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (configuredSecret && configuredSecret.length >= 32 && bearer && secretsMatch(configuredSecret, bearer)) {
    const suppliedLabel = request.headers.get('x-push-operator')?.trim() ?? ''
    const actorLabel = /^[^\u0000-\u001f\u007f]{2,80}$/.test(suppliedLabel) ? suppliedLabel : 'campaign-cli'
    return { actorId: null, actorLabel }
  }

  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const admin = createAdminClient() as PushCampaignDb
  const { data: profile } = await admin
    .from('voyager_profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'architect') throw new Error('Architect access required')
  return { actorId: user.id, actorLabel: profile.display_name || user.id }
}

async function enabledPushUserIds(admin: PushCampaignDb): Promise<string[]> {
  const ids = new Set<string>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from('push_devices')
      .select('user_id')
      .eq('platform', 'ios')
      .eq('enabled', true)
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`Could not load push devices: ${error.message}`)
    for (const row of data ?? []) if (row.user_id) ids.add(row.user_id)
    if ((data ?? []).length < pageSize) break
  }
  return [...ids]
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size))
  return result
}

export async function loadCampaignProfiles(audience: CampaignAudience): Promise<PushCampaignProfile[]> {
  const admin = createAdminClient() as PushCampaignDb
  let ids = await enabledPushUserIds(admin)
  if (audience.type === 'users') {
    const requested = new Set(audience.userIds)
    ids = ids.filter((id) => requested.has(id))
  }
  if (!ids.length) return []

  const profiles: PushCampaignProfile[] = []
  for (const batch of chunks(ids, 500)) {
    let query = admin
      .from('voyager_profiles')
      .select('id, display_name, role, location, batch_label, registered_at')
      .in('id', batch)
      .not('registered_at', 'is', null)
    if (audience.type === 'roles') query = query.in('role', audience.roles)
    const { data, error } = await query
    if (error) throw new Error(`Could not load campaign profiles: ${error.message}`)
    for (const row of data ?? []) {
      if (!CAMPAIGN_ROLES.includes(row.role)) continue
      profiles.push({
        id: row.id,
        display_name: row.display_name || 'Voyager',
        role: row.role,
        location: row.location ?? null,
        batch_label: row.batch_label ?? null,
      })
    }
  }
  return profiles.sort((a, b) => a.display_name.localeCompare(b.display_name) || a.id.localeCompare(b.id))
}

export async function loadCampaignProfile(userId: string): Promise<PushCampaignProfile | null> {
  const profiles = await loadCampaignProfiles({ type: 'users', userIds: [userId] })
  return profiles[0] ?? null
}

export function campaignDb(): PushCampaignDb {
  return createAdminClient() as PushCampaignDb
}

export function chunkValues<T>(values: T[], size: number): T[][] {
  return chunks(values, size)
}
