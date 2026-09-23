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
}

export function validateNpcProfile(input: NpcProfileInput): string | null {
  if (!input || typeof input.displayName !== 'string' || !input.displayName.trim() || input.displayName.trim().length > 80) return 'Use a name between 1 and 80 characters.'
  if (!NPC_ROLE_OPTIONS.some(({ value }) => value === input.role)) return 'Choose a valid NPC identity type.'
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

export const NPC_HOLDER_STATUSES = ['assigned', 'preparing', 'shipped', 'delivered', 'return_pending'] as const

export function canSpeakAsNpc(isArchitect: boolean, isNpc: boolean, hasUnit: boolean) {
  return isArchitect && isNpc && hasUnit
}
