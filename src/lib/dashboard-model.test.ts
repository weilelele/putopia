import { describe, expect, it } from 'vitest'
import { latestUpdates, availableVotes, visibleEventVotes, orderDashboardEvents } from './dashboard-model'
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
    expect(latestUpdates([{...item,locked:true,image:'/private.png',images:['/private.png'],authorName:'Private publisher',authorAvatar:'/avatar.png'}], [])[0]).toMatchObject({image:null,images:undefined,authorName:undefined,authorAvatar:null,description:undefined,locked:true})
  })
  it('excludes closed, expired, completed and ineligible votes only from Events', () => {
    const votes = [vote('open'),vote('closed',{is_active:false}),vote('expired',{ends_at:'2026-09-08T00:00:00Z'}),vote('done'),vote('private',{scope:['architect']})]
    expect(availableVotes(votes,'voyager',[{vote_id:'done'}],Date.parse('2026-09-09T00:00:00Z')).map(item=>item.id)).toEqual(['open'])
    expect(latestUpdates([],votes)).toHaveLength(5)
  })
})

describe('Public Events', () => {
  it('shows open events regardless of participation scope, while excluding closed and expired votes', () => {
    const now = Date.parse('2026-09-10T00:00:00Z')
    const items = [vote('members'), vote('architects', {scope: ['architect']}), vote('closed', {is_active:false}), vote('expired', {ends_at:'2026-09-09T00:00:00Z'})]
    expect(visibleEventVotes(items, now).map(v=>v.id)).toEqual(['architects', 'members'])
    expect(availableVotes(items, 'guest', [], now)).toEqual([])
  })
})

it('keeps every event while placing different action types at the start of the rail', () => {
  const events = ['Signal Dispatch','Signal Dispatch','Collective vote','Dreamcatcher'].map((kind,index)=>({id:String(index),kind,title:'Event',description:'',href:'/signal',action:'View'}))
  expect(orderDashboardEvents(events).map(event=>event.id)).toEqual(['0','2','3','1'])
  expect(orderDashboardEvents([])).toEqual([])
})

it('keeps news bylines and every attachment available to visible Updates', () => {
  const item={id:'intel-1',occurredAt:'2026-09-10T00:00:00Z',category:'Intel',title:'News',href:'/intel/1',authorName:'Mira',authorAvatar:'/mira.png',images:['/one.png','/two.png']}
  expect(latestUpdates([item],[])[0]).toMatchObject(item)
})
