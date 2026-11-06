/** Pure public presentation policy; database RPCs enforce the same rules. */
export type RoundStatus = 'waiting_capacity' | 'queued' | 'processing' | 'awaiting_assets' | 'voting_open' | 'awaiting_initiator_feedback' | 'settled' | 'cancelled'
export type RoundViewer = { id: string; role: string } | null
export const VOYAGERS_ONLY_LOCK = 'Voyagers only'
/** Signal votes are for Voyagers. Architects keep their operating access. */
export function isSignalVoter(role: string | null | undefined): boolean {
  return role === 'voyager' || role === 'architect'
}
/** 'self' is the only scope narrower than the Voyager base rule; 'all' and 'voters' now match. */
export function scopeAllowsVote(viewer: RoundViewer, voteScope: string, ownerId: string | null): boolean {
  if (!viewer || !isSignalVoter(viewer.role)) return false
  return viewer.role === 'architect' || voteScope !== 'self' || viewer.id === ownerId
}
export function roundVoteAccess(input: {
  status: RoundStatus; openedAt: string | null; closesAt: string | null; participantCount: number
  initiatorId: string; discovererId: string | null; voteScope: string; viewer: RoundViewer; now: number
  /** Nothing settles while paused, so the settling fallback vote stays shut. */
  paused?: boolean
}): { canVote: boolean; initiatorOnly: boolean; publicOpen: boolean } {
  const active = ['voting_open', 'awaiting_initiator_feedback'].includes(input.status)
  const opened = !!input.openedAt && Date.parse(input.openedAt) <= input.now
  const deadline = input.closesAt ? Date.parse(input.closesAt) : NaN
  const publicOpen = active && opened && input.now < deadline
  const initiatorOnly = !input.paused && active && opened && input.now >= deadline && input.participantCount === 0
  const me = input.viewer
  const eligible = scopeAllowsVote(me, input.voteScope, input.discovererId)
  return { canVote: publicOpen ? eligible : initiatorOnly && !!me && isSignalVoter(me.role) && me.id === input.initiatorId, initiatorOnly, publicOpen }
}
export function roundLabel(status: string, roundNumber: number, generationStatus?: string): string {
  const labels: Record<string, string> = {
    waiting_capacity: 'WAITING FOR QUEUE SPACE', queued: 'QUEUED', processing: 'PROCESSING',
    awaiting_assets: generationStatus === 'failed' ? 'SIGNAL DELAYED · NEEDS ATTENTION' : 'DEVICE COMPLETE · AWAITING SIGNALS',
    voting_open: 'COMMUNITY VOTING', awaiting_initiator_feedback: 'WAITING FOR ORIGINAL SUBMITTER',
    settled: 'FEEDBACK RECORDED', cancelled: 'EXPLORATION ENDED',
  }
  return `ROUND ${roundNumber} · ${labels[status] ?? status.toUpperCase()}`
}
