'use client'
import { useEffect, useMemo, useState } from 'react'
import { VoyagerFeed } from '@/app/voyagers/voyager-feed'
import type * as LiveFeed from '@/lib/actions/voyager-feed'
import { canReadVoyagerFeed, canPublishVoyagerFeed, type FeedEntry, type FeedViewer } from '@/lib/voyager-feed'
const viewers: Record<string, FeedViewer | null> = {
  architect: {id:'10000000-0000-4000-8000-000000000005',role:'architect',account_kind:'human',registered_at:'2026-10-13',display_name:'Architect',avatar_url:null},
  voyager: {id:'10000000-0000-4000-8000-000000000001',role:'voyager',registered_at:'2026-10-13',display_name:'You',avatar_url:null},
  applicant: {id:'10000000-0000-4000-8000-000000000002',role:'applicant',registered_at:'2026-10-13',display_name:'Alex Chen',avatar_url:null},
  guest:null,
  unregistered:{id:'10000000-0000-4000-8000-000000000003',role:'applicant',registered_at:null,display_name:'New arrival',avatar_url:null},
}
let selectedRole = 'voyager'
let fault = 'none'
let hydrated = false
function persistFixtures() { try { sessionStorage.setItem('feed-qa-entries',JSON.stringify({entries,creators:[...creators]})) } catch {} }
let entries: FeedEntry[] = [{id:'20000000-0000-4000-8000-000000000001',author_id:'10000000-0000-4000-8000-000000000004',parent_id:null,body:'The same shoreline, a different sky. Anyone else notice this today?',image_path:'/prototypes/voyager-feed/coast-v1.png',created_at:'2026-10-13T01:00:00Z',updated_at:'2026-10-13T01:00:00Z',display_name:'Ryo Tanaka',avatar_url:'/prototypes/voyager-feed/ryo-v1.png',author_role:'architect',like_count:8,reply_count:0,liked:false,down_count:0,downvoted:false}]
const npc = {id:'10000000-0000-4000-8000-000000000006',display_name:'Maren (test identity)',avatar_url:null}
const creators = new Map<string,string>()
const media = new Map<string,string>()
const downSets = new Map<string,Set<string>>()
const likeSets = new Map<string,Set<string>>()
function createServices(role: string): typeof LiveFeed {
 const current = () => viewers[role]
 return {
  async getVoyagerSubmission(id) { const p=entries.find(e=>e.id===id && (creators.get(e.id)??e.author_id)===current()?.id); return p ? {id:p.id,body:p.body,parent_id:p.parent_id}:null },
  async getFeedPublishingIdentities() { if (current()?.role !== 'architect') throw new Error('Access denied'); return [npc] },
  async getVoyagerFeed(postId) {
    if (!hydrated) { hydrated=true; try { const saved=JSON.parse(sessionStorage.getItem('feed-qa-entries')??'null'); if(saved) { entries=saved.entries; for(const [id,actor] of saved.creators)creators.set(id,actor) } } catch {} }
    if (fault === 'read-error') throw new Error('Simulated network read failure')
    const viewer = current(); const locked = !canReadVoyagerFeed(viewer)
    return { viewer, locked, entries:locked ? [] : entries.filter(e=>e.parent_id === (postId ?? null)).map(e=>({...e,can_manage:(creators.get(e.id) ?? e.author_id)===viewer!.id,liked:likeSets.get(e.id)?.has(viewer!.id) ?? false,downvoted:downSets.get(e.id)?.has(viewer!.id) ?? false})),next:null,post:locked ? null : (()=>{const p=entries.find(e=>e.id===postId); return p ? {...p,liked:likeSets.get(p.id)?.has(viewer!.id) ?? false,downvoted:downSets.get(p.id)?.has(viewer!.id) ?? false,can_manage:(creators.get(p.id)??p.author_id)===viewer!.id}:null})() }
  },
  async createVoyagerPost(form) {
    const viewer = current(), parent = form.get('parentId') as string | null, id = form.get('id') as string
    if (!canReadVoyagerFeed(viewer) || (!parent && !canPublishVoyagerFeed(viewer))) return {error:'Access denied.'}
    if (fault==='reject') return {error:'This test submission was rejected. Edit your text and retry.',outcome:'rejected' as const}
    if (fault==='timeout-before') return new Promise<Awaited<ReturnType<typeof LiveFeed.createVoyagerPost>>>(()=>{})
    if (entries.some(e=>e.id===id)) return {error:null,id}
    const identity=form.get('authorId')===npc.id && viewer!.role==='architect' && !parent ? npc : viewer!
    creators.set(id,viewer!.id)
    const image=form.get('image'); const now=new Date().toISOString()
    if (image instanceof File) media.set(id,URL.createObjectURL(image))
    entries.unshift({id,author_id:identity.id,parent_id:parent,body:String(form.get('body')),image_path:image instanceof File ? 'local':null,created_at:now,updated_at:now,display_name:identity.display_name,avatar_url:null,author_role:viewer!.role,like_count:0,reply_count:0,liked:false,down_count:0,downvoted:false})
    entries=entries.map(e=>e.id===parent ? {...e,reply_count:e.reply_count+1}:e)
    persistFixtures()
    if (fault==='timeout-after') return new Promise<Awaited<ReturnType<typeof LiveFeed.createVoyagerPost>>>(()=>{})
    return {error:null,id}
  },
  async editVoyagerPost(id,body) { if (!entries.some(e=>e.id===id && (creators.get(e.id)??e.author_id)===current()?.id)) return {error:'Not the author.'}; entries=entries.map(e=>e.id===id?{...e,body,updated_at:new Date().toISOString()}:e);persistFixtures();return {error:null} },
  async deleteVoyagerPost(id) { const entry=entries.find(e=>e.id===id); if(!entry || (creators.get(entry.id)??entry.author_id)!==current()?.id)return {error:'Not the author.'}; entries=entries.filter(e=>e.id!==id && e.parent_id!==id).map(e=>e.id===entry.parent_id?{...e,reply_count:e.reply_count-1}:e); persistFixtures();return {error:null} },
  async setVoyagerVote(id,vote) {
    const actor=current(); if (!actor?.registered_at) return {error:'Register or log in to participate.'}
    const ups=likeSets.get(id)??new Set<string>(), downs=downSets.get(id)??new Set<string>(); const upBefore=ups.has(actor.id), downBefore=downs.has(actor.id)
    if(vote===1)ups.add(actor.id);else ups.delete(actor.id)
    if(vote===-1)downs.add(actor.id);else downs.delete(actor.id)
    likeSets.set(id,ups);downSets.set(id,downs)
    entries=entries.map(e=>e.id===id?{...e,like_count:e.like_count+Number(vote===1)-Number(upBefore),down_count:(e.down_count??0)+Number(vote===-1)-Number(downBefore)}:e)
    return {error:null}
  },
  async setVoyagerLike(id,liked) { const set=likeSets.get(id)??new Set<string>(); const before=set.has(current()!.id);if(liked)set.add(current()!.id);else set.delete(current()!.id);likeSets.set(id,set);entries=entries.map(e=>e.id===id?{...e,like_count:e.like_count+(before===liked?0:liked?1:-1)}:e);return {error:null} },
}
}
const mediaSource = (entry:FeedEntry) => media.get(entry.id) ?? entry.image_path ?? ''
export function IntegratedFeedPreview({postId}:{postId?:string}) {
  const [role,setRole]=useState(selectedRole)
  const [mode,setMode]=useState(fault)
  const [ready,setReady]=useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore QA-only identity from browser storage after hydration.
  useEffect(()=>{setRole(sessionStorage.getItem('feed-qa-role')??selectedRole);setReady(true)},[])
  const services=useMemo(()=>createServices(role),[role])
  return <div className="w-full"><label>Local QA · <select aria-label="Preview identity" value={role} onChange={e=>{selectedRole=e.target.value;sessionStorage.setItem('feed-qa-role',selectedRole);setRole(selectedRole)}}>{Object.keys(viewers).map(value=><option key={value}>{value}</option>)}</select></label><label> Network · <select aria-label="Preview network" value={mode} onChange={e=>{fault=e.target.value;setMode(fault)}}>{['none','reject','timeout-before','timeout-after','read-error'].map(value=><option key={value}>{value}</option>)}</select></label>{ready && <VoyagerFeed key={`${role}:${postId??''}`} postId={postId} services={services} baseHref="/dev/voyager-feed-integrated" mediaSource={mediaSource} requestTimeout={1500}/>}</div>
}
