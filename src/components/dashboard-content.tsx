'use client'
import { PublisherIdentity, NewsMedia } from './news-content'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import SmartImage from './smart-image'
import { ArchiveButton } from './archive-button'
import { ArchiveLinkButton } from './archive-link-button'
import type { DashboardUpdate, DashboardEvent } from '@/lib/dashboard-model'
export function UpdateTimeline({ updates }: { updates: DashboardUpdate[] }) {
  return <ol className="update-timeline">{updates.map(item => <li key={item.id} className="update-row">
    <div className="update-time"><span aria-hidden className="update-node" /><time dateTime={item.occurredAt} title={new Date(item.occurredAt).toISOString()}>{new Date(item.occurredAt).toISOString().slice(5,10).replace('-','/')}</time></div>
    <Link className={`update-content${item.category === 'Intel' ? ' update-content--intel' : item.image ? ' update-content--media' : ''}`} href={item.href} scroll={false}>
      {item.category !== 'Intel' && item.image && <SmartImage src={item.image} alt="" width={120} height={64} sizes="120px" className="update-image" />}
      <div><span className="update-category">{item.category}</span><h3>{item.title}</h3>{item.authorName && <PublisherIdentity name={item.authorName} avatar={item.authorAvatar} />}{item.locked ? <p>Restricted · sign in with eligible access</p> : item.description && <p>{item.description}</p>}</div>
      {item.category === 'Intel' && !item.locked && <NewsMedia images={item.images ?? (item.image ? [item.image] : [])} title={item.title} />}
    </Link>
  </li>)}</ol>
}
export function EventRail({ events }: { events: DashboardEvent[] }) {
  const rail = useRef<HTMLUListElement>(null)
  const [position, setPosition] = useState(0)
  const move = (direction: number) => {
    const next = Math.max(0, Math.min(events.length - 1, position + direction))
    const el = rail.current; const card = el?.children[next] as HTMLElement | undefined
    if (el && card) { el.scrollTo({ left: card.offsetLeft - (el.firstElementChild as HTMLElement).offsetLeft, behavior: 'instant' }); setPosition(next) }
  }
  return <div className="event-rail-wrap">
    {events.length > 1 && <div className="event-rail-controls"><ArchiveButton variant="ghost" size="compact" aria-label="Previous event" disabled={position === 0} onClick={() => move(-1)}><ChevronLeft aria-hidden size={20} /></ArchiveButton><span aria-live="polite">{position + 1} / {events.length}</span><ArchiveButton variant="ghost" size="compact" aria-label="Next event" disabled={position === events.length - 1} onClick={() => move(1)}><ChevronRight aria-hidden size={20} /></ArchiveButton></div>}
    <ul className="event-rail" ref={rail} onScroll={() => { const el=rail.current; if(!el) return; const cards=[...el.children] as HTMLElement[]; let nearest=0; cards.forEach((card,i)=>{if(Math.abs(card.offsetLeft-cards[0].offsetLeft-el.scrollLeft)<Math.abs(cards[nearest].offsetLeft-cards[0].offsetLeft-el.scrollLeft)) nearest=i});setPosition(el.scrollLeft >= el.scrollWidth - el.clientWidth - 2 ? events.length - 1 : nearest) }}>
      {events.map(event => <li className="event-card" key={event.id}>
        {event.image && <SmartImage src={event.image} alt="" width={480} height={270} sizes="(min-width:768px) 340px, 85vw" />}
        <div className="event-copy"><span className="update-category">{event.kind}</span><h3>{event.title}</h3><p>{event.description}</p>{event.endsAt && <time dateTime={event.endsAt}>Closes {new Date(event.endsAt).toISOString().slice(0,16).replace('T',' ')} UTC</time>}<ArchiveLinkButton href={event.href} variant="primary" fullWidth>{event.action}<ArrowRight aria-hidden size={18} /></ArchiveLinkButton></div>
      </li>)}
    </ul>
  </div>
}
