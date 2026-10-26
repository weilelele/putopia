import { canClaimDeviceBatch, type DeviceBatchStatus, DEVICE_BATCH_PHASES } from './device-batches'
import type { InitiationPaymentStatus, InitiationStatus } from './initiation-types'
import { INITIATION_PRICES, type InitiationOrderKind } from './initiation-pricing'

/** First-visit Voyager briefing shown over /voyager-initiation. Pure rules only; no DOM, storage or network. */
export const BRIEFING_VERSION = '2026-10-v1'
export const BRIEFING_STORAGE_KEY = 'mc:initiation:briefing'

export const BRIEFING_PAGES = [
  'brief_01_device', 'brief_02_collective', 'brief_03_members', 'brief_04_recruiting', 'brief_05_classified',
  'brief_06_votes', 'brief_07_console', 'brief_08_packs', 'brief_09_join',
] as const
export type BriefingPageId = typeof BRIEFING_PAGES[number]

/** People who still decide whether to join. Members, granted accounts and unreadable records never get it. */
export function briefingAudience(status: InitiationStatus): boolean {
  return status === 'guest' || status === 'unpaid' || status === 'legacy_pack'
}

/** `/voyager-initiation?briefing=1` opens the briefing on demand for the same audience, even if it was seen before. */
export function briefingLinkOpens(status: InitiationStatus, value: string | undefined): boolean {
  return value === '1' && briefingAudience(status)
}

/** Opens automatically once per browser and version, never over a payment outcome. */
export function shouldAutoOpenBriefing(input: {
  status: InitiationStatus
  paymentStatus: InitiationPaymentStatus
  checkoutCanceled: boolean
  stored: string | null
}): boolean {
  if (!briefingAudience(input.status) || input.checkoutCanceled) return false
  if (input.paymentStatus !== 'none' && input.paymentStatus !== 'unknown') return false
  return readBriefingRecord(input.stored)?.version !== BRIEFING_VERSION
}

export type BriefingRecord = { version: string; outcome: BriefingOutcome; page: number }
export type BriefingOutcome = 'closed' | 'skipped' | 'completed' | 'learn_more' | 'chose_offer'

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

export function clampBriefingPage(page: number): number {
  return Math.max(0, Math.min(BRIEFING_PAGES.length - 1, Math.trunc(page)))
}

export type BriefingOffer = {
  id: InitiationOrderKind
  label: string
  title: string
  price: number
  points: string[]
  note: string
}

const dollars = (kind: InitiationOrderKind) => INITIATION_PRICES[kind].amount / 100

/** The same offers as the checkout panel, priced from the shared pricing definition. */
export function briefingOffers(status: InitiationStatus): BriefingOffer[] {
  if (status === 'legacy_pack') return [{
    id: 'legacy_upgrade', label: 'YOUR INITIAL PACK', title: INITIATION_PRICES.legacy_upgrade.name, price: dollars('legacy_upgrade'),
    points: ['Your own Multiverse Console', 'The fourth delivery'], note: 'Your membership and first two packs stay with you.',
  }]
  const membership = 'Collective membership privileges'
  const saving = dollars('initial') + dollars('legacy_upgrade') - dollars('standard')
  return [{
    id: 'initial', label: 'INITIAL', title: INITIATION_PRICES.initial.name, price: dollars('initial'),
    points: [membership, 'Packs 1–2', 'Letter, badge, Mysterious Widgets'], note: `Add Console + Pack 4 later for $${dollars('legacy_upgrade')}.`,
  }, {
    id: 'standard', label: 'COMPLETE', title: INITIATION_PRICES.standard.name, price: dollars('standard'),
    points: [membership, 'All four packs', 'Your own Multiverse Console'], note: saving > 0 ? `Save $${saving} versus upgrading later.` : 'Pay once. No recurring fee.',
  }]
}

export type BriefingRegion = { name: string; open: boolean; phase: number; phases: number; phaseLabel: string }

const PHASE_LABEL: Record<DeviceBatchStatus, string> = { searching: 'Searching', claiming: 'Claiming', pack_one: 'Pack 1', pack_two: 'Pack 2', console: 'Console' }

/** Public batch facts only: city, whether a claim is open, and the published phase. */
export function briefingRegions(batches: { location: string; status: DeviceBatchStatus }[], limit = 5): BriefingRegion[] {
  const seen = new Set<string>()
  const regions: BriefingRegion[] = []
  for (const batch of batches) {
    const name = (batch.location.split(',')[0] ?? '').trim().toUpperCase()
    if (!name || seen.has(name)) continue
    seen.add(name)
    regions.push({ name, open: canClaimDeviceBatch(batch.status), phase: DEVICE_BATCH_PHASES.indexOf(batch.status) + 1, phases: DEVICE_BATCH_PHASES.length, phaseLabel: PHASE_LABEL[batch.status] })
  }
  return regions.sort((a, b) => Number(b.open) - Number(a.open)).slice(0, limit)
}

/** Seats for the recruiting ring; an unknown count shows the ring without taken seats. */
export function briefingSeats(capacity: number, initiated: number | null) {
  const total = Math.max(0, Math.min(200, Math.trunc(capacity)))
  const taken = initiated === null ? 0 : Math.max(0, Math.min(total, Math.trunc(initiated)))
  return { total, taken, next: taken < total ? taken : null, known: initiated !== null }
}

