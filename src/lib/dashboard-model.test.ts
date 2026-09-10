import { describe, expect, it } from 'vitest'
import { dashboardEventVotes, dashboardTuningWorlds, latestUpdates, orderDashboardEvents } from './dashboard-model'
import type { Vote } from '@/types/database'

const NOW = Date.parse('2026-09-10T00:00:00Z')
const vote = (id: string, patch: Partial<Vote> = {}): Vote => ({ id, title: id, description: '', type: 'single', scope: ['voyager'], is_active: true, ends_at: null, created_at: '2026-09-01T00:00:00Z', ...patch } as Vote)
const update = (id: string, category: string, day: number, entityKey?: string) => ({ id, category, entityKey, occurredAt:`2026-09-${String(day).padStart(2,'0')}T00:00:00Z`, title:id, href:'/intel' })

describe('Dashboard Updates contract', () => {
  it('keeps the latest ten from the four approved types without reserving Intel subtypes', () => {
    const updates = Array.from({ length: 14 }, (_, index) => update(`intel-${index}`, 'Intel', index + 1))
    expect(latestUpdates(updates, NOW).map(item => item.id)).toEqual(['intel-13','intel-12','intel-11','intel-10','intel-9','intel-8','intel-7','intel-6','intel-5','intel-4'])
  })

  it('caps Voyager at two and Established worlds at three', () => {
    const updates = [
      ...[9,8,7,6].map(day => update(`voyager-${day}`, 'Voyager activated', day)),
      ...[9,8,7,6].map(day => update(`world-${day}`, 'Established world', day, `world-${day}`)),
      update('intel', 'Intel', 5),
    ]
    const result = latestUpdates(updates, NOW)
    expect(result.filter(item => item.category === 'Voyager activated')).toHaveLength(2)
    expect(result.filter(item => item.category === 'Established world')).toHaveLength(3)
  })

  it('expires Voyager activations after seven days and removes Events-only types', () => {
    const result = latestUpdates([
      update('recent-voyager', 'Voyager activated', 9),
      update('old-voyager', 'Voyager activated', 2),
      update('signal', 'Signal tuning', 10),
      update('vote', 'Vote opened', 10),
    ], NOW)
    expect(result.map(item => item.id)).toEqual(['recent-voyager'])
  })

  it('keeps only the newest item for the same world or device', () => {
    const result = latestUpdates([
      update('world-new', 'Established world', 9, 'world-one'),
      update('world-old', 'Established world', 8, 'world-one'),
      update('device-new', 'Device update', 7, 'device-one'),
      update('device-old', 'Device update', 6, 'device-one'),
    ], NOW)
    expect(result.map(item => item.id)).toEqual(['world-new','device-new'])
  })

  it('strips classified Intel content while retaining its locked card', () => {
    const item = { ...update('intel-one', 'Intel', 9), locked:true, description:'Private body', image:'/private.png', images:['/private.png'], authorName:'Private publisher', authorAvatar:'/avatar.png' }
    expect(latestUpdates([item], NOW)[0]).toMatchObject({id:'intel-one',image:null,images:undefined,authorName:undefined,authorAvatar:null,description:undefined,locked:true})
  })
})

describe('Dashboard Events contract', () => {
  it('shows guests up to three open Votes ordered by the nearest deadline', () => {
    const votes = [
      vote('later',{ends_at:'2026-09-12T00:00:00Z'}), vote('soon',{ends_at:'2026-09-11T00:00:00Z'}),
      vote('no-end'), vote('fourth',{ends_at:'2026-09-13T00:00:00Z'}),
      vote('closed',{is_active:false}), vote('expired',{ends_at:'2026-09-09T00:00:00Z'}),
    ]
    expect(dashboardEventVotes(votes,'guest',[],NOW,true).map(item => item.id)).toEqual(['soon','later','fourth'])
  })

  it('removes completed and ineligible Votes for signed-in viewers', () => {
    const votes = [vote('open'),vote('done'),vote('architects',{scope:['architect']})]
    expect(dashboardEventVotes(votes,'voyager',[{vote_id:'done'}],NOW,false).map(item => item.id)).toEqual(['open'])
  })

  it('shows the latest three open tuning worlds and only outstanding worlds after login', () => {
    const worlds = [1,2,3,4].map(day => ({id:`world-${day}`,name:`World ${day}`,openedAt:`2026-09-0${day}T00:00:00Z`}))
    expect(dashboardTuningWorlds(worlds,[],true).map(item => item.id)).toEqual(['world-4','world-3','world-2'])
    expect(dashboardTuningWorlds(worlds,['world-1','world-3'],false).map(item => item.id)).toEqual(['world-3','world-1'])
  })

  it('alternates the two approved action types in the rail', () => {
    const events = ['Vote Open','Vote Open','Signal Tuning','Signal Tuning'].map((kind,index)=>({id:String(index),kind,title:'Event',description:'',href:'/vote',action:'View'}))
    expect(orderDashboardEvents(events).map(event=>event.id)).toEqual(['0','2','1','3'])
  })
})

it('keeps news bylines and every attachment available to visible Updates', () => {
  const item={...update('intel-1','Intel',10),authorName:'Mira',authorAvatar:'/mira.png',images:['/one.png','/two.png']}
  expect(latestUpdates([item],NOW)[0]).toMatchObject(item)
})
