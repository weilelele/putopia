import type { CosmoAsset } from '@/lib/cosmo'

export type DreamcatcherLivePhase = 'resting' | 'starting' | 'working' | 'stopping'

export type DreamcatcherLiveVideo = Pick<CosmoAsset, 'assetId' | 'url'>

export type DreamcatcherLiveVideoLibrary = Record<DreamcatcherLivePhase, DreamcatcherLiveVideo[]>

export type DreamcatcherPlaybackCursor = {
  phase: DreamcatcherLivePhase
  index: number
  sequence: number
}

export const DREAMCATCHER_RECONNECT_MIN_MS = 45_000
export const DREAMCATCHER_RECONNECT_MAX_MS = 90_000

const PHASE_TAGS: Record<DreamcatcherLivePhase, readonly string[]> = {
  resting: ['休息中', '待机'],
  starting: ['进入工作', '开始工作'],
  working: ['工作中'],
  stopping: ['结束工作'],
}

export function emptyDreamcatcherLiveVideoLibrary(): DreamcatcherLiveVideoLibrary {
  return { resting: [], starting: [], working: [], stopping: [] }
}

/** Group completed Cosmo videos by their editorial tags. A tag may include a
 *  location or device prefix (for example, "日本捕梦仪，工作中"), so phase
 *  matching intentionally checks for the phase token instead of exact equality. */
export function groupDreamcatcherLiveVideos(assets: CosmoAsset[]): DreamcatcherLiveVideoLibrary {
  const grouped = emptyDreamcatcherLiveVideoLibrary()
  for (const asset of assets) {
    for (const phase of Object.keys(PHASE_TAGS) as DreamcatcherLivePhase[]) {
      if (asset.tags?.some((tag) => PHASE_TAGS[phase].some((token) => tag.includes(token)))) {
        grouped[phase].push({ assetId: asset.assetId, url: asset.url })
        break
      }
    }
  }
  return grouped
}

export function isDreamcatcherWorking(
  roomStatus: string,
  jobs: Array<{ status: string }>,
): boolean {
  return roomStatus === 'processing' || jobs.some((job) => job.status === 'processing')
}

export function advanceDreamcatcherPlayback(
  current: DreamcatcherPlaybackCursor,
  working: boolean,
  library: DreamcatcherLiveVideoLibrary | null,
): DreamcatcherPlaybackCursor {
  const steadyPhase: DreamcatcherLivePhase = working ? 'working' : 'resting'

  if (current.phase === 'starting' || current.phase === 'stopping') {
    return { phase: steadyPhase, index: 0, sequence: current.sequence + 1 }
  }

  const currentIsWorking = current.phase === 'working'
  if (currentIsWorking !== working) {
    const transition: DreamcatcherLivePhase = working ? 'starting' : 'stopping'
    const nextPhase = library?.[transition]?.length ? transition : steadyPhase
    return { phase: nextPhase, index: 0, sequence: current.sequence + 1 }
  }

  // Resting and working clips use the browser's native loop playback. Keeping
  // the same element and source avoids a decode/load gap at the seam.
  return current
}

/** Move to another editorial clip while a steady-state signal is hidden by a
 * brief reconnect effect. Transition clips always remain one-shot. */
export function advanceDreamcatcherSteadyVideo(
  current: DreamcatcherPlaybackCursor,
  library: DreamcatcherLiveVideoLibrary | null,
): DreamcatcherPlaybackCursor {
  if (current.phase !== 'resting' && current.phase !== 'working') return current

  const poolLength = library?.[current.phase]?.length ?? 0
  if (poolLength < 2) return current

  return {
    ...current,
    index: (current.index + 1) % poolLength,
    sequence: current.sequence + 1,
  }
}

export function dreamcatcherReconnectDelay(randomValue: number): number {
  const normalized = Math.min(1, Math.max(0, randomValue))
  return Math.round(
    DREAMCATCHER_RECONNECT_MIN_MS
      + normalized * (DREAMCATCHER_RECONNECT_MAX_MS - DREAMCATCHER_RECONNECT_MIN_MS),
  )
}

/** React to a device-state change without interrupting a one-shot transition
 *  that is already playing. Steady clips otherwise remain mounted and loop. */
export function syncDreamcatcherPlaybackToState(
  current: DreamcatcherPlaybackCursor,
  working: boolean,
  library: DreamcatcherLiveVideoLibrary | null,
): DreamcatcherPlaybackCursor {
  if (current.phase === 'starting' || current.phase === 'stopping') return current

  const currentIsWorking = current.phase === 'working'
  if (currentIsWorking === working) return current

  const transition: DreamcatcherLivePhase = working ? 'starting' : 'stopping'
  const steadyPhase: DreamcatcherLivePhase = working ? 'working' : 'resting'
  return {
    phase: library?.[transition]?.length ? transition : steadyPhase,
    index: 0,
    sequence: current.sequence + 1,
  }
}
