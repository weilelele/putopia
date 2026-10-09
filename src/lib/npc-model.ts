import type { UserRole } from '@/types/database'

export const NPC_ROLE_OPTIONS = [
  { value: 'guest', label: 'Guest' },
  { value: 'applicant', label: 'Applicant' },
  { value: 'voyager', label: 'Voyager' },
  { value: 'architect', label: 'Architect' },
] as const satisfies ReadonlyArray<{ value: UserRole; label: string }>

export type NpcProfileInput = {
  displayName: string
  role: UserRole
  bio: string
  avatarUrl: string
  location: string
  batchLabel: string
  grantNote: string
}

export function validateNpcProfile(input: NpcProfileInput): string | null {
  if (!input || typeof input.displayName !== 'string' || !input.displayName.trim() || input.displayName.trim().length > 80) return 'Use a name between 1 and 80 characters.'
  if (!NPC_ROLE_OPTIONS.some(({ value }) => value === input.role)) return 'Choose a valid NPC identity type.'
  if (typeof input.batchLabel !== 'string' || !input.batchLabel.trim() || input.batchLabel.length > 120 || /[\r\n\t]/.test(input.batchLabel)) return 'Choose a member batch.'
  if (typeof input.grantNote !== 'string' || input.grantNote.length > 1000) return 'Grant note must be at most 1,000 characters.'
  if (typeof input.bio !== 'string' || input.bio.length > 2000) return 'Bio must be at most 2,000 characters.'
  if (typeof input.location !== 'string' || input.location.length > 120) return 'Location must be at most 120 characters.'
  if (typeof input.avatarUrl !== 'string' || input.avatarUrl.length > 2048) return 'Invalid avatar URL.'
  if (input.avatarUrl.trim()) {
    try {
      const url = new URL(input.avatarUrl.trim())
      if (url.protocol !== 'https:' || url.username || url.password) return 'Use an HTTPS avatar URL.'
    } catch { return 'Use an HTTPS avatar URL.' }
  }
  return null
}

/** S26 NPC registration uses one roster seat, without creating payment or delivery rights. */
export function npcMemberBatchOptions(labels: readonly string[]): string[] {
  return [...new Set(labels.filter((label) => label.trim().length > 0))]
}

export function validateNpcMemberBatch(label: string, available: readonly string[]): string | null {
  return available.includes(label) ? null : 'This member batch is no longer available. Reload and choose a batch.'
}

export const NPC_HOLDER_STATUSES = ['assigned', 'preparing', 'shipped', 'delivered', 'return_pending'] as const

export function canSpeakAsNpc(isArchitect: boolean, isNpc: boolean, hasUnit: boolean) {
  return isArchitect && isNpc && hasUnit
}

export type NpcInitiationState = {
  capacity: number
  occupied: number
  member: { batch: string; source: 'paid' | 'granted'; active: boolean } | null
}

export function parseNpcInitiationState(value: unknown): NpcInitiationState {
  if (!value || typeof value !== 'object') throw new Error('S26 registration status is unavailable.')
  const state = value as NpcInitiationState
  if (!Number.isSafeInteger(state.capacity) || state.capacity <= 0 || !Number.isSafeInteger(state.occupied) || state.occupied < 0 ||
    (state.member !== null && (!state.member || typeof state.member.batch !== 'string' || !['paid', 'granted'].includes(state.member.source) || typeof state.member.active !== 'boolean'))) {
    throw new Error('S26 registration status is unavailable.')
  }
  return state
}

export function validateNpcRegistration(input: NpcProfileInput, state: NpcInitiationState): string | null {
  if (state.member && (state.member.batch !== 'S26' || state.member.source !== 'granted')) return 'Membership requires management review.'
  if (state.member && (input.batchLabel !== 'S26' || !['voyager', 'architect'].includes(input.role))) return 'Registered S26 NPCs cannot leave or lose member identity. Management review is required.'
  if (input.batchLabel !== 'S26') return null
  if (!['voyager', 'architect'].includes(input.role)) return 'Choose Voyager or Architect identity to register in S26.'
  if (!state.member && !input.grantNote.trim()) return 'Add an audit note to register this NPC in S26.'
  if (!state.member && state.occupied >= state.capacity) return 'S26 is full. This NPC has not been registered.'
  return null
}
