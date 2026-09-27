/** Pure public presentation policy; database RPCs enforce the same rules. */
export type RoundStatus = 'waiting_capacity' | 'queued' | 'processing' | 'awaiting_assets' | 'voting_open' | 'awaiting_initiator_feedback' | 'settled' | 'cancelled'
export type RoundViewer = { id: string; role: string } | null
export function roundVoteAccess(input: {
  status: RoundStatus; openedAt: string | null; closesAt: string | null; participantCount: number
  initiatorId: string; discovererId: string | null; voteScope: string; viewer: RoundViewer; now: number
}): { canVote: boolean; initiatorOnly: boolean; publicOpen: boolean } {
  const active = ['voting_open', 'awaiting_initiator_feedback'].includes(input.status)
  const opened = !!input.openedAt && Date.parse(input.openedAt) <= input.now
  const deadline = input.closesAt ? Date.parse(input.closesAt) : NaN
  const publicOpen = active && opened && input.now < deadline
  const initiatorOnly = active && opened && input.now >= deadline && input.participantCount === 0
  const me = input.viewer
  const eligible = !!me && (me.role === 'architect' || input.voteScope === 'all' ||
    (input.voteScope === 'self' && me.id === input.discovererId) || (input.voteScope === 'voters' && me.role === 'voyager'))
  return { canVote: publicOpen ? eligible : initiatorOnly && me?.id === input.initiatorId, initiatorOnly, publicOpen }
}
export function roundLabel(status: string, roundNumber: number, generationStatus?: string): string {
  const labels: Record<string, string> = {
    waiting_capacity: 'WAITING FOR QUEUE SPACE', queued: 'QUEUED', processing: 'PROCESSING',
    awaiting_assets: generationStatus === 'failed' ? 'SIGNAL DELAYED · NEEDS ATTENTION' : 'RECEIVING SIGNALS',
    voting_open: 'COMMUNITY VOTING', awaiting_initiator_feedback: 'WAITING FOR ORIGINAL SUBMITTER',
    settled: 'FEEDBACK RECORDED', cancelled: 'EXPLORATION ENDED',
  }
  return `ROUND ${roundNumber} · ${labels[status] ?? status.toUpperCase()}`
}
