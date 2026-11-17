'use server'

import { getMyProfileStages } from '@/lib/actions/profile'
import { hasVoyagerAccess } from '@/lib/digital-access'
import { getCurrentMissionBriefing } from '@/lib/mission-board'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function missionForVoyager(id: string) {
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error && error.name !== 'AuthSessionMissingError') return { kind: 'unavailable' } as const
  if (!user || user.is_anonymous) return { kind: 'locked' } as const

  const stages = await getMyProfileStages().catch(() => null)
  if (!stages) return { kind: 'unavailable' } as const
  if (!hasVoyagerAccess(stages.accessRole)) return { kind: 'locked' } as const

  const briefing = getCurrentMissionBriefing(id)
  if (!briefing) return { kind: 'expired' } as const
  return { kind: 'available', userId: user.id, briefing, consoleBound: stages.consoleBound } as const
}

export async function loadMissionBriefing(id: string) {
  const mission = await missionForVoyager(id)
  if (mission.kind !== 'available') return mission

  if (!mission.consoleBound) {
    return { kind: 'available' as const, briefing: mission.briefing, accepted: false, canAccept: false }
  }

  const { data, error } = await createAdminClient().from('mission_acceptances')
    .select('mission_id').eq('user_id', mission.userId).eq('mission_id', id).maybeSingle()
  return error ? { kind: 'unavailable' as const } : {
    kind: 'available' as const,
    briefing: mission.briefing,
    accepted: !!data,
    canAccept: true,
  }
}

export async function acceptMission(id: string) {
  const mission = await missionForVoyager(id)
  if (mission.kind !== 'available') return mission.kind
  if (!mission.consoleBound) return 'console_required' as const

  const { error } = await createAdminClient().from('mission_acceptances')
    .upsert({ mission_id: id, user_id: mission.userId }, {
      onConflict: 'user_id,mission_id',
      ignoreDuplicates: true,
    })
  if (error?.code === '42501') return 'console_required' as const
  return error ? 'unavailable' : 'accepted'
}
