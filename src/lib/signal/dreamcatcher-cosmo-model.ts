import type { CosmoExpansion } from '@/lib/cosmo'

/** Ignore every session seen before dispatch, including unfinished old batches. */
export function selectRoundBatch(expansions: CosmoExpansion[], baseline: string[]) {
  const seen = new Set(baseline)
  const playable = expansions.filter(e => !seen.has(e.sessionId) && e.videos.length > 0)
  const sessionId = playable[0]?.sessionId
  if (!sessionId) return null
  const clips = playable.filter(e => e.sessionId === sessionId).map(e => e.videos[0])
  const unique = [...new Map(clips.map(clip => [clip.assetId, clip])).values()].slice(0, 8)
  return unique.length >= 2 ? { sessionId, clips: unique } : null
}
