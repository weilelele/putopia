'use server'

import { getMyDeviceStatus } from '@/lib/actions/device-status'
import { getCurrentMissionBriefing } from '@/lib/mission-board'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function missionForDevice(id: string) {
  const briefing = getCurrentMissionBriefing(id)
  if (!briefing) return { kind: 'expired' } as const

  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user || !(await getMyDeviceStatus()).has) return { kind: 'locked' } as const

  return { kind: 'available', userId: user.id, briefing } as const
}

export async function loadMissionBriefing(id: string) {
  const mission = await missionForDevice(id)
  if (mission.kind !== 'available') return mission

  const { data, error } = await createAdminClient().from('mission_acceptances')
    .select('mission_id').eq('user_id', mission.userId).eq('mission_id', id).maybeSingle()
  return {
    kind: 'available' as const,
    briefing: mission.briefing,
    accepted: !!data,
    canAccept: !error,
  }
}

export async function acceptMission(id: string) {
  const mission = await missionForDevice(id)
  if (mission.kind !== 'available') return mission.kind

  const { error } = await createAdminClient().from('mission_acceptances')
    .upsert({ mission_id: id, user_id: mission.userId }, {
      onConflict: 'user_id,mission_id',
      ignoreDuplicates: true,
    })
  return error ? 'unavailable' : 'accepted'
}
