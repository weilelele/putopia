'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { getAllVoyagers } from '@/lib/actions/profile'
import { useAuth } from '@/lib/auth-context'
import { memberInitials } from '@/lib/member-initials'
import { useSessionPreference } from '@/lib/use-session-preference'
import { createClientDataCache } from '@/lib/client-data-cache'
import { MemberProfileContent } from '@/components/member-profile-content'
import { ArchiveSheet } from '@/components/archive-sheet'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { ArchiveStatStrip } from '@/components/archive-stat-strip'
import { ArchiveRouteError, ArchiveRouteLoading } from '@/components/archive-route-state'
import { BatchTabs } from '@/components/batch-tabs'
import type { VoyagerProfile } from '@/types/database'

const cache = createClientDataCache<VoyagerProfile[]>(5 * 60_000)
export default function VoyagerMembers() {
  const { user } = useAuth()
  const [members,setMembers] = useState(()=>cache.peek() ?? [])
  const [loading,setLoading] = useState(()=>cache.peek() === undefined)
  const [error,setError] = useState(false)
  const [batch,setBatch] = useSessionPreference<string | null>('mc:view:voyagers:batch:s2-default',null)
  const [expanded,setExpanded] = useState(false)
  const [architectsExpanded,setArchitectsExpanded] = useState(false)
  const [selected,setSelected] = useState<VoyagerProfile | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const load = useCallback(async(force=false)=>{
    setLoading(true);setError(false)
    try { setMembers(await cache.load(getAllVoyagers,force)) } catch { setError(true) } finally { setLoading(false) }
  },[])
  useEffect(()=>{void Promise.resolve().then(()=>load())},[load])
  const architects=members.filter(member=>member.role==='architect')
  const batches=new Map<string,VoyagerProfile[]>()
  for(const member of members.filter(member=>member.role==='voyager')) {
    const label=member.batch_label || 'Original Batch'
    batches.set(label,[...(batches.get(label) ?? []),member])
  }
  const names=[...batches.keys()]
  const active=names.find(name=>name===batch) ?? names.find(name=>/\bS2\b/i.test(name)) ?? names[0] ?? ''
  const current=batches.get(active) ?? []
  const newest=names.filter(name=>name!=='Original Batch').at(-1) ?? names.at(-1) ?? ''
  const jump=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})
  const close=()=>{setSelected(null);requestAnimationFrame(()=>trigger.current?.focus({preventScroll:true}))}
  const card=(member:VoyagerProfile)=><article key={member.id} className="voyager-directory-row"><button className="voyager-directory-trigger" aria-label={`View ${member.display_name}'s profile`} onClick={event=>{trigger.current=event.currentTarget;setSelected(member)}}><span className="voyager-directory-portrait">{member.avatar_url ?
    // eslint-disable-next-line @next/next/no-img-element -- Existing member media.
    <img src={member.avatar_url} alt="" loading="lazy"/> : <span>{memberInitials(member.display_name)}</span>}</span><span className="voyager-directory-copy"><span className="voyager-directory-name">{member.display_name}</span><span className="voyager-directory-meta">{member.location || member.role}</span></span><ArrowRight size={16} aria-hidden /></button></article>
  return <div className="pilot-voyagers-page">
    <ArchiveStatStrip items={[{value:loading && !members.length ? '—' : architects.length,label:'ARCHITECTS',onSelect:()=>jump('section-architects')},{value:loading && !members.length ? '—' : batches.get(newest)?.length ?? 0,label:'NEW BATCH',onSelect:()=>{setBatch(newest || null);setExpanded(false);jump('section-voyagers')}},{value:loading && !members.length ? '—' : members.length,label:'ALL VOYAGERS',onSelect:()=>jump('section-voyagers')}]} />
    {loading && !members.length ? <ArchiveRouteLoading label="LOADING VOYAGER REGISTRY" /> : error ? <ArchiveRouteError title="REGISTRY UNAVAILABLE" description="The Voyager registry could not be retrieved." onRetry={()=>void load(true)} /> : <>
      <section id="section-architects"><ArchiveSectionLabel>ARCHITECTS</ArchiveSectionLabel><div className="voyager-directory-list">{(architectsExpanded?architects:architects.slice(0,4)).map(card)}</div>{architects.length>4 && <ArchiveButton variant="ghost" aria-expanded={architectsExpanded} onClick={()=>setArchitectsExpanded(value=>!value)}>{architectsExpanded?'COLLAPSE':`SHOW ALL (${architects.length})`}</ArchiveButton>}</section>
      <section id="section-voyagers"><ArchiveSectionLabel>VOYAGER BATCHES</ArchiveSectionLabel><BatchTabs activeId={active} items={names.map(name=>({id:name,label:name,count:batches.get(name)!.length}))} onChange={value=>{setBatch(value);setExpanded(false)}}/><div className="voyager-directory-list">{(expanded?current:current.slice(0,6)).map(card)}</div>{current.length>6 && <ArchiveButton variant="ghost" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'COLLAPSE':`SHOW ALL (${current.length})`}</ArchiveButton>}{!members.length && <p>No members to display yet.</p>}</section>
    </>}
    {selected && <ArchiveSheet open title="Voyager profile" onClose={close} footer={selected.id===user.id?<ArchiveLinkButton href="/profile" fullWidth>Edit profile</ArchiveLinkButton>:undefined}><MemberProfileContent profile={selected}/></ArchiveSheet>}
  </div>
}
