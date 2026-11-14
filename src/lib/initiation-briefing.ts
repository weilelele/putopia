import { canClaimDeviceBatch, deviceBatchStage, type DeviceBatchStage, type DeviceBatchStatus, DEVICE_BATCH_STAGES } from './device-batches'
import type { InitiationPaymentStatus, InitiationStatus } from './initiation-types'

/** First-visit Voyager briefing shown over /voyager-initiation. Pure rules only; no DOM, storage or network. */
export const BRIEFING_VERSION = '2026-10-v2'
export const BRIEFING_STORAGE_KEY = 'mc:initiation:briefing'

export const BRIEFING_PAGES = [
  'brief_01_device', 'brief_02_collective', 'brief_03_members', 'brief_04_recruiting', 'brief_05_classified',
  'brief_06_parallax_array', 'brief_07_console', 'brief_08_packs', 'brief_09_join',
] as const
export type BriefingPageId = typeof BRIEFING_PAGES[number]

/** People who still decide whether to join. Members, granted accounts and unreadable records never get it. */
export function briefingAudience(status: InitiationStatus): boolean {
  return status === 'guest' || status === 'unpaid' || status === 'legacy_pack'
}

/** Device claim arrivals go straight to Initiation, including links carrying `briefing=1`. */
export function briefingLinkOpens(status: InitiationStatus, value: string | undefined, fromDevice = false): boolean {
  return !fromDevice && value === '1' && briefingAudience(status)
}

/** Opens automatically once per browser and version, never over a payment outcome. */
export function shouldAutoOpenBriefing(input: {
  status: InitiationStatus
  paymentStatus: InitiationPaymentStatus
  checkoutCanceled: boolean
  stored: string | null
  fromDevice?: boolean
}): boolean {
  if (input.fromDevice || !briefingAudience(input.status) || input.checkoutCanceled) return false
  if (input.paymentStatus !== 'none' && input.paymentStatus !== 'unknown') return false
  return readBriefingRecord(input.stored)?.version !== BRIEFING_VERSION
}

export type BriefingRecord = { version: string; outcome: BriefingOutcome; page: number }
/** How the briefing ended; the last page offers the Dashboard or the packs at the foot of the Initiation page. */
export type BriefingOutcome = 'closed' | 'skipped' | 'completed' | 'explore_collective' | 'view_packs'

export function readBriefingRecord(raw: string | null): BriefingRecord | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<BriefingRecord>
    if (typeof value.version !== 'string') return null
    return { version: value.version, outcome: (value.outcome ?? 'closed') as BriefingOutcome, page: Number.isInteger(value.page) ? value.page! : 0 }
  } catch { return null }
}

export function briefingRecord(outcome: BriefingOutcome, page: number): string {
  return JSON.stringify({ version: BRIEFING_VERSION, outcome, page: Math.max(0, Math.min(BRIEFING_PAGES.length - 1, Math.trunc(page))) })
}

/** Background theme: an original 96 s loop (scripts/audio/briefing-theme.py), on by default and started by the first gesture. */
export const BRIEFING_THEME = { src: '/assets/voyager-briefing/briefing-theme.mp3', loopSeconds: 96, volume: .6 } as const
export const BRIEFING_SOUND_KEY = 'mc:initiation:briefing-sound'

/** Sound stays on unless this browser turned it off; unreadable storage keeps the default. */
export function briefingSoundOn(stored: string | null): boolean {
  return stored !== 'off'
}

/**
 * Seconds to loop inside a decoded theme. Some decoders keep the MP3 encoder's leading silence, so the loop starts at the
 * first audible sample (the theme never starts silent) and runs exactly `loopSeconds`, ignoring trailing padding.
 */
export function briefingLoopWindow(samples: ArrayLike<number>, sampleRate: number, loopSeconds: number): { start: number; end: number } {
  const duration = samples.length / sampleRate
  const search = Math.min(samples.length, Math.round(sampleRate * .25))
  let first = 0
  while (first < search && Math.abs(samples[first]) < 1e-4) first++
  const start = first < search ? first / sampleRate : 0
  return { start, end: Math.min(duration, start + loopSeconds) }
}

export function clampBriefingPage(page: number): number {
  return Math.max(0, Math.min(BRIEFING_PAGES.length - 1, Math.trunc(page)))
}

/** Every non-interactive tap advances; the final page never wraps or goes back on a tap. */
export function briefingTapTarget(page: number, blocked: boolean): number | null {
  if (blocked) return null
  const next = clampBriefingPage(page + 1)
  return next === page ? null : next
}

/**
 * The briefing opens on the wordmark shuffling until page 1's film is downloaded. It never strands a slow connection:
 * after `hardMs`, or if the download fails, the briefing opens on the film's poster while the film streams.
 */
export const BRIEFING_RECEIVE = { hardMs: 12000 } as const
export type BriefingReceiveOutcome = 'ready' | 'failed' | 'timeout'

export function briefingReceiveOutcome(input: { elapsedMs: number; ready: boolean; settled: boolean }): BriefingReceiveOutcome | null {
  if (input.ready) return 'ready'
  if (input.settled) return 'failed'
  return input.elapsedMs >= BRIEFING_RECEIVE.hardMs ? 'timeout' : null
}

export type BriefingRegion = { name: string; open: boolean; phase: number; phases: number; phaseLabel: string }

const PHASE_LABEL: Record<DeviceBatchStage, string> = { searching: 'Searching', claiming: 'Claiming', delivering: 'Delivering' }

/** Public batch facts only: city, whether a claim is open, and the published phase. */
export function briefingRegions(batches: { location: string; status: DeviceBatchStatus }[], limit = 5): BriefingRegion[] {
  const seen = new Set<string>()
  const regions: BriefingRegion[] = []
  for (const batch of batches) {
    const name = (batch.location.split(',')[0] ?? '').trim().toUpperCase()
    if (!name || seen.has(name)) continue
    seen.add(name)
    const stage = deviceBatchStage(batch.status)
    regions.push({ name, open: canClaimDeviceBatch(batch.status), phase: DEVICE_BATCH_STAGES.indexOf(stage) + 1, phases: DEVICE_BATCH_STAGES.length, phaseLabel: PHASE_LABEL[stage] })
  }
  return regions.sort((a, b) => Number(b.open) - Number(a.open)).slice(0, limit)
}

/** Seats for the recruiting ring; an unknown count shows the ring without taken seats. */
export function briefingSeats(capacity: number, initiated: number | null) {
  const total = Math.max(0, Math.min(200, Math.trunc(capacity)))
  const taken = initiated === null ? 0 : Math.max(0, Math.min(total, Math.trunc(initiated)))
  return { total, taken, next: taken < total ? taken : null, known: initiated !== null }
}

