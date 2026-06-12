import { NextResponse } from 'next/server'
import { getAllVotes, getVoteResultsBulk } from '@/lib/actions/votes'

export const dynamic = 'force-dynamic'

export async function GET() {
  const votes = await getAllVotes()
  const active = votes.filter((v) => v.is_active)
  const tallies = await getVoteResultsBulk(active.map((v) => v.id))
  return NextResponse.json({
    activeVoteIds: active.map((v) => v.id),
    tallies,
  })
}
