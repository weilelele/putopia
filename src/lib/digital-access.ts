import type { UserRole } from '@/types/database'
const roles: UserRole[] = ['guest', 'applicant', 'voyager', 'architect']
export function accessRole(value: unknown, signedIn: boolean): UserRole {
  return roles.includes(value as UserRole) ? value as UserRole : signedIn ? 'applicant' : 'guest'
}
export function normalizeVoteScope(scope: unknown): UserRole[] {
  if (Array.isArray(scope)) return roles.filter(role => scope.includes(role) || scope.includes('public'))
  if (scope === 'public') return [...roles]
  if (scope === 'applicant') return ['applicant', 'voyager', 'architect']
  if (scope === 'voyager') return ['voyager', 'architect']
  if (scope === 'architect') return ['architect']
  return []
}
export function voteSubmissionError(vote: { is_active: boolean; ends_at: string | null; scope: unknown; type: string; options: unknown }, role: UserRole, selected: unknown, now: number): string | null {
  if (!vote.is_active || (vote.ends_at !== null && (!Number.isFinite(Date.parse(vote.ends_at)) || Date.parse(vote.ends_at) <= now))) return 'Voting has closed.'
  if (!normalizeVoteScope(vote.scope).includes(role)) return 'This vote is not available to your membership.'
  if (!Array.isArray(vote.options) || !vote.options.length || !vote.options.every(o => o && typeof o.id === 'string' && o.id.length > 0)) return 'Vote options are unavailable.'
  const ids = vote.options.map(o => o.id as string)
  if (new Set(ids).size !== ids.length || !['single', 'multi'].includes(vote.type)) return 'Vote options are unavailable.'
  if (!Array.isArray(selected) || selected.length === 0 || (vote.type === 'single' && selected.length !== 1) || new Set(selected).size !== selected.length || !selected.every(id => typeof id === 'string' && ids.includes(id))) return 'Select valid vote options.'
  return null
}
export function validAnonymousVoteToken(token: unknown): token is string {
  return typeof token === 'string' && /^[a-zA-Z0-9_-]{16,128}$/.test(token)
}
