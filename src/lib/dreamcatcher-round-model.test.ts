import { describe, expect, it } from 'vitest'
import { roundVoteAccess } from './dreamcatcher-round-model'
const closesAt='2026-09-28T12:00:00Z'
const input={status:'voting_open' as const,openedAt:'2026-09-27T12:00:00Z',closesAt,participantCount:0,initiatorId:'original',discovererId:'other',voteScope:'voters',viewer:{id:'member',role:'voyager'},now:Date.parse(closesAt)-1}
describe('round participation',()=>{
  it('keeps a full window even after a response',()=>{
    expect(roundVoteAccess({...input,participantCount:1})).toEqual({canVote:true,initiatorOnly:false,publicOpen:true})
  })
  it('narrows at the exact deadline even before cron catches up',()=>{
    expect(roundVoteAccess({...input,now:Date.parse(closesAt)})).toEqual({canVote:false,initiatorOnly:true,publicOpen:false})
    expect(roundVoteAccess({...input,now:Date.parse(closesAt),viewer:{id:'architect',role:'architect'}}).canVote).toBe(false)
  })
  it('lets only a Voyager original submitter continue after zero feedback',()=>{
    const now=Date.parse(closesAt)+1
    expect(roundVoteAccess({...input,now,viewer:{id:'original',role:'voyager'}}).canVote).toBe(true)
    expect(roundVoteAccess({...input,now,viewer:{id:'original',role:'applicant'}}).canVote).toBe(false)
    expect(roundVoteAccess({...input,now,viewer:{id:'other',role:'voyager'}}).canVote).toBe(false)
    expect(roundVoteAccess({...input,now,viewer:null}).canVote).toBe(false)
    expect(roundVoteAccess({...input,now,participantCount:1,viewer:{id:'original',role:'voyager'}}).canVote).toBe(false)
  })
  it('limits every scope to Voyagers, and self to its owner',()=>{
    for (const voteScope of ['all','voters']) {
      expect(roundVoteAccess({...input,voteScope,viewer:{id:'member',role:'voyager'}}).canVote).toBe(true)
      expect(roundVoteAccess({...input,voteScope,viewer:{id:'member',role:'architect'}}).canVote).toBe(true)
      expect(roundVoteAccess({...input,voteScope,viewer:{id:'member',role:'applicant'}}).canVote).toBe(false)
    }
    expect(roundVoteAccess({...input,voteScope:'self',viewer:{id:'member',role:'voyager'}}).canVote).toBe(false)
    expect(roundVoteAccess({...input,voteScope:'self',viewer:{id:'other',role:'voyager'}}).canVote).toBe(true)
    expect(roundVoteAccess({...input,voteScope:'self',viewer:{id:'other',role:'applicant'}}).canVote).toBe(false)
  })
  it('keeps open windows votable during a pause but shuts the settling fallback',()=>{
    expect(roundVoteAccess({...input,paused:true}).canVote).toBe(true)
    expect(roundVoteAccess({...input,paused:true,now:Date.parse(closesAt)+1,viewer:{id:'original',role:'voyager'}})).toEqual({canVote:false,initiatorOnly:false,publicOpen:false})
  })
  it('never reopens ended, cancelled or not-yet-published rounds',()=>{
    for (const status of ['settled','cancelled','queued','processing'] as const) {
      expect(roundVoteAccess({...input,status,viewer:{id:'original',role:'architect'},now:Date.parse(closesAt)+1}).canVote).toBe(false)
    }
    expect(roundVoteAccess({...input,openedAt:null}).canVote).toBe(false)
  })
})
