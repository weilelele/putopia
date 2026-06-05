import { getAllVotes, getMyVoteResponses, getVoteResultsBulk } from '@/lib/actions/votes'
import { VotingHub } from './VotingHub'

export const dynamic = 'force-dynamic'

export default async function VotePage() {
  const votes = await getAllVotes()
  const [myResponses, tallies] = await Promise.all([
    getMyVoteResponses(),
    getVoteResultsBulk(votes.map((v) => v.id)),
  ])

  return <VotingHub votes={votes} myResponses={myResponses} tallies={tallies} />
}
