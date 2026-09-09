import { describe, expect, it } from 'vitest'
import { latestUpdates, availableVotes } from './dashboard-model'
import type { Vote } from '@/types/database'
const vote = (id: string, patch: Partial<Vote> = {}): Vote => ({ id, title: id, description: '', type: 'single', scope: ['voyager'], is_active: true, ends_at: null, created_at: '2026-09-01T00:00:00Z', ...patch } as Vote)
describe('Dashboard content contract', () => {
  it('takes the global latest ten instead of alternating categories', () => {
    const updates = latestUpdates([], Array.from({ length: 14 }, (_, i) => ({id:String(i),title:String(i),created_at:`2026-09-${String(i + 1).padStart(2,'0')}T00:00:00Z`})))
    expect(updates).toHaveLength(10)
    expect(updates.map(item => item.title)).toEqual(['13','12','11','10','9','8','7','6','5','4'])
  })
  it('omits missing media and strips locked content', () => {
    const item = {id:'intel-one',occurredAt:'2026-09-09T00:00:00Z',category:'Intel',title:'One',description:'Private body',href:'/intel/one'}
    expect(latestUpdates([item], [])[0].image).toBeUndefined()
    expect(latestUpdates([{...item,locked:true,image:'/private.png'}], [])[0]).toMatchObject({image:null,description:undefined,locked:true})
  })
  it('excludes closed, expired, completed and ineligible votes only from Events', () => {
    const votes = [vote('open'),vote('closed',{is_active:false}),vote('expired',{ends_at:'2026-09-08T00:00:00Z'}),vote('done'),vote('private',{scope:['architect']})]
    expect(availableVotes(votes,'voyager',[{vote_id:'done'}],Date.parse('2026-09-09T00:00:00Z')).map(item=>item.id)).toEqual(['open'])
    expect(latestUpdates([],votes)).toHaveLength(5)
  })
})
