'use client'

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { ArrowRight, ChevronLeft, X } from 'lucide-react'
import { BRIEFING_PAGES, clampBriefingPage, type BriefingOffer, type BriefingOutcome, type BriefingRegion } from '@/lib/initiation-briefing'
import type { InitiationPublicMember } from '@/lib/initiation-types'
import type { PageState } from './briefing-kit'
import { ClassifiedPage, CollectivePage, DevicePage, FrontLinePage, JoinPage, MembersPage, PacksPage, RecruitingPage, VotesPage } from './briefing-pages'
import s from './briefing.module.css'

export type BriefingProps = {
  trigger: 'auto' | 'replay' | 'link'
  members: InitiationPublicMember[]
  seats: { batch: string; capacity: number; initiated: number | null }
  regions: BriefingRegion[]
  offers: BriefingOffer[]
  busy: boolean
  unavailable: string | null
  capture: (event: string, properties?: Record<string, unknown>) => void
  onChoose: (offer: BriefingOffer['id'], page: number) => void
  onClose: (outcome: BriefingOutcome, page: number) => void
}

type NavState = { page: number; leaving: number; dir: number; visits: number[]; maxPage: number }

const LAST = BRIEFING_PAGES.length - 1
const LEAVE_MS = 260

/** First-visit briefing over /voyager-initiation. Mounted only while open; a native modal dialog keeps the page and app chrome inert behind it. */
export function InitiationBriefing({ trigger, members, seats, regions, offers, busy, unavailable, capture, onChoose, onClose }: BriefingProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [nav, setNav] = useState<NavState>(() => ({ page: 0, leaving: -1, dir: 1, visits: BRIEFING_PAGES.map((_, i) => i === 0 ? 1 : 0), maxPage: 0 }))
  const openedAt = useRef(0)
  const swipe = useRef<{ x: number; y: number; control: boolean; swiped: boolean }>({ x: 0, y: 0, control: false, swiped: false })

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (!element.open) element.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.postMessage({ type: 'sheet-open' }, location.origin)
    return () => { document.body.style.overflow = overflow; window.postMessage({ type: 'sheet-close' }, location.origin); if (element.open) element.close() }
  }, [])

  useEffect(() => {
    if (nav.leaving < 0) return
    const timer = setTimeout(() => setNav(current => ({ ...current, leaving: -1 })), LEAVE_MS)
    return () => clearTimeout(timer)
  }, [nav.leaving, nav.page])

  useEffect(() => {
    openedAt.current = performance.now()
    capture('initiation_brief_opened', { trigger })
    capture('initiation_brief_page_viewed', { page_index: 1, page_id: BRIEFING_PAGES[0], via: 'open' })
    // One mount is one briefing visit; later prop changes must not re-announce it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function go(target: number, via: string) {
    const next = clampBriefingPage(target)
    if (next === nav.page) return
    setNav(current => ({
      page: next, leaving: current.page, dir: next > current.page ? 1 : -1,
      visits: current.visits.map((v, i) => i === next ? v + 1 : v), maxPage: Math.max(current.maxPage, next),
    }))
    capture('initiation_brief_page_viewed', { page_index: next + 1, page_id: BRIEFING_PAGES[next], via })
  }

  function close(outcome: BriefingOutcome) {
    capture('initiation_brief_closed', { outcome, last_page: nav.page + 1, max_page: Math.max(nav.maxPage, nav.page) + 1, elapsed_ms: Math.round(performance.now() - openedAt.current) })
    onClose(outcome, nav.page)
  }

  const state = (index: number): PageState => ({ active: nav.page === index, leaving: nav.leaving === index, dir: nav.dir, visit: nav.visits[index] })
  const first = nav.page === 0, last = nav.page === LAST

  const ownTarget = (target: EventTarget) => (target as HTMLElement).closest('dialog') === dialog.current
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    swipe.current = { x: event.clientX, y: event.clientY, control: !ownTarget(event.target) || !!(event.target as HTMLElement).closest('button, a, input, label'), swiped: false }
  }
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current
    if (start.control) return
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { start.swiped = true; go(nav.page + (dx < 0 ? 1 : -1), 'swipe') }
  }
  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (swipe.current.swiped || !ownTarget(event.target) || (event.target as HTMLElement).closest('button, a, input, label')) return
    const rect = event.currentTarget.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width
    if (x > .62) go(nav.page + 1, 'tap')
    else if (x < .3) go(nav.page - 1, 'tap')
  }

  return <dialog ref={dialog} className={s.dialog} aria-label="Voyager briefing" aria-modal="true"
    onCancel={event => { event.preventDefault(); close('closed') }}
    onKeyDown={event => {
      if (!ownTarget(event.target) || (event.target as HTMLElement).closest('input, textarea')) return
      if (event.key === 'ArrowRight') go(nav.page + 1, 'key')
      if (event.key === 'ArrowLeft') go(nav.page - 1, 'key')
    }}>
    <div className={s.stage}>
      <div className={s.pages} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onClick={onClick}>
        <DevicePage state={state(0)} />
        <CollectivePage state={state(1)} />
        <MembersPage state={state(2)} members={members} onProfile={() => capture('initiation_brief_detail_opened', { page_id: BRIEFING_PAGES[2], topic: 'member_profile' })} />
        <RecruitingPage state={state(3)} batch={seats.batch} capacity={seats.capacity} initiated={seats.initiated} />
        <ClassifiedPage state={state(4)} />
        <VotesPage state={state(5)} />
        <FrontLinePage state={state(6)} regions={regions} />
        <PacksPage state={state(7)} onPack={index => capture('initiation_brief_detail_opened', { page_id: BRIEFING_PAGES[7], topic: `pack_${index + 1}` })} />
        <JoinPage state={state(8)} offers={offers} busy={busy} unavailable={unavailable}
          onChoose={offer => onChoose(offer, nav.page)}
          onLearnMore={() => { capture('initiation_brief_detail_opened', { page_id: BRIEFING_PAGES[8], topic: 'learn_more' }); close('learn_more') }} />
      </div>
      <div className={s.top}>
        {first
          ? <button type="button" className={s.iconButton} aria-label="Close briefing" onClick={() => close('closed')}><X size={20} aria-hidden /></button>
          : <button type="button" className={s.iconButton} aria-label="Previous page" onClick={() => go(nav.page - 1, 'back')}><ChevronLeft size={22} aria-hidden /></button>}
        {last
          ? <button type="button" className={s.iconButton} aria-label="Close briefing" onClick={() => close('completed')}><X size={20} aria-hidden /></button>
          : <button type="button" className={s.skip} onClick={() => go(LAST, 'skip')}>Skip</button>}
      </div>
      {!last && <div className={s.dock}>
        <button type="button" className={s.next} onClick={() => go(nav.page + 1, 'next')}>NEXT<ArrowRight size={18} aria-hidden /></button>
      </div>}
      <p className="sr-only" aria-live="polite">{`Page ${nav.page + 1} of ${BRIEFING_PAGES.length}`}</p>
    </div>
  </dialog>
}
