'use client'

import { useEffect, useEffectEvent, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { ChevronLeft, Volume2, VolumeX, X } from 'lucide-react'
import { BRIEFING_PAGES, BRIEFING_VERSION, briefingTapTarget, clampBriefingPage, type BriefingOffer, type BriefingOutcome, type BriefingRegion } from '@/lib/initiation-briefing'
import type { InitiationPublicMember } from '@/lib/initiation-types'
import type { PageState } from './briefing-kit'
import { useBriefingSound } from '@/hooks/use-briefing-sound'
import { ClassifiedPage, CollectivePage, DevicePage, FrontLinePage, JoinPage, MembersPage, PacksPage, RecruitingPage } from './briefing-pages'
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
const CONTROLS = 'button, a, input, label, select, textarea, [role="button"], [contenteditable="true"]'

/** First-visit briefing over /voyager-initiation. Mounted only while open; a native modal dialog keeps the page and app chrome inert behind it. */
export function InitiationBriefing({ trigger, members, seats, regions, offers, busy, unavailable, capture, onChoose, onClose }: BriefingProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const pendingNavigation = useRef<{ id: string; from: number; to: number; via: string; startedAt: number } | null>(null)
  const track = (event: string, properties: Record<string, unknown> = {}) => capture(event, {
    briefing_version: BRIEFING_VERSION, page_count: BRIEFING_PAGES.length, navigation_mode: 'tap_anywhere', ...properties,
  })
  const emit = useEffectEvent(track)
  const [nav, setNav] = useState<NavState>(() => ({ page: 0, leaving: -1, dir: 1, visits: BRIEFING_PAGES.map((_, i) => i === 0 ? 1 : 0), maxPage: 0 }))
  const openedAt = useRef(0)
  const sound = useBriefingSound(dialog)
  const swipe = useRef<{ x: number; y: number; control: boolean; swiped: boolean; moved: boolean; pointerType: string }>({ x: 0, y: 0, control: false, swiped: false, moved: false, pointerType: 'unknown' })

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (!element.open) element.showModal()
    // Start on the static content instead of auto-focusing the close button. Tab still reaches every control.
    content.current?.focus({ preventScroll: true })
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
    track('initiation_brief_opened', { trigger })
    track('initiation_brief_page_viewed', { page_index: 1, page_id: BRIEFING_PAGES[0], via: 'open' })
    // One mount is one briefing visit; later prop changes must not re-announce it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const navigation = pendingNavigation.current
    if (!navigation || navigation.to !== nav.page) return
    pendingNavigation.current = null
    // This effect runs after React commits the new page's active state, not when a tap merely requests it.
    emit('initiation_brief_navigation_succeeded', {
      navigation_id: navigation.id, from_page_index: navigation.from + 1, from_page_id: BRIEFING_PAGES[navigation.from],
      to_page_index: nav.page + 1, to_page_id: BRIEFING_PAGES[nav.page], via: navigation.via,
      render_elapsed_ms: Math.round(performance.now() - navigation.startedAt),
    })
  }, [nav.page])

  function go(target: number, via: string): string | null {
    const next = clampBriefingPage(target)
    if (next === nav.page || pendingNavigation.current) return null
    const id = crypto.randomUUID()
    pendingNavigation.current = { id, from: nav.page, to: next, via, startedAt: performance.now() }
    track('initiation_brief_navigation_requested', {
      navigation_id: id, from_page_index: nav.page + 1, from_page_id: BRIEFING_PAGES[nav.page],
      to_page_index: next + 1, to_page_id: BRIEFING_PAGES[next], via,
    })
    setNav(current => ({
      page: next, leaving: current.page, dir: next > current.page ? 1 : -1,
      visits: current.visits.map((v, i) => i === next ? v + 1 : v), maxPage: Math.max(current.maxPage, next),
    }))
    track('initiation_brief_page_viewed', { page_index: next + 1, page_id: BRIEFING_PAGES[next], via })
    return id
  }

  function close(outcome: BriefingOutcome) {
    track('initiation_brief_closed', { outcome, last_page: nav.page + 1, max_page: Math.max(nav.maxPage, nav.page) + 1, elapsed_ms: Math.round(performance.now() - openedAt.current) })
    onClose(outcome, nav.page)
  }

  const state = (index: number): PageState => ({ active: nav.page === index, leaving: nav.leaving === index, dir: nav.dir, visit: nav.visits[index] })
  const first = nav.page === 0, last = nav.page === LAST

  const ownTarget = (target: EventTarget) => (target as Element).closest('dialog') === dialog.current
  function onPointerDown(event: PointerEvent<HTMLDialogElement>) {
    swipe.current = { x: event.clientX, y: event.clientY, control: !ownTarget(event.target) || !!(event.target as Element).closest(CONTROLS),
      swiped: false, moved: false, pointerType: event.pointerType }
  }
  function onPointerMove(event: PointerEvent<HTMLDialogElement>) {
    const start = swipe.current
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) start.moved = true
  }
  function onPointerUp(event: PointerEvent<HTMLDialogElement>) {
    const start = swipe.current
    if (start.control || window.getSelection()?.toString()) return
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { start.swiped = true; go(nav.page + (dx < 0 ? 1 : -1), 'swipe') }
  }
  function onClick(event: MouseEvent<HTMLDialogElement>) {
    if (!ownTarget(event.target)) return
    const target = event.target as Element
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000
    const x = ratio((event.clientX - rect.left) / rect.width), y = ratio((event.clientY - rect.top) / rect.height)
    const reason = target.closest(CONTROLS) ? 'control' : swipe.current.moved || swipe.current.swiped ? 'gesture'
      : window.getSelection()?.toString() ? 'selection' : pendingNavigation.current ? 'navigation_pending' : null
    const next = briefingTapTarget(nav.page, reason !== null)
    // Continue/Skip have already handled their own click before it bubbles to the dialog.
    const controlAction = target.closest('[data-briefing-nav]')?.getAttribute('data-briefing-nav')
    const controlNavigation = controlAction && pendingNavigation.current?.via === controlAction ? pendingNavigation.current.id : null
    const navigationId = controlNavigation ?? (next === null ? null : go(next, 'tap'))
    track('initiation_brief_tapped', {
      page_index: nav.page + 1, page_id: BRIEFING_PAGES[nav.page], x_ratio: x, y_ratio: y,
      content_width: Math.round(rect.width), content_height: Math.round(rect.height),
      coordinate_space: 'dialog',
      pointer_type: event.detail === 0 ? 'keyboard' : swipe.current.pointerType,
      target_kind: reason === 'control' ? 'control' : target.closest('[data-briefing-target]')?.getAttribute('data-briefing-target') ?? 'background',
      navigation_requested: navigationId !== null, navigation_id: navigationId, ignored_reason: navigationId ? null : reason ?? (last ? 'last_page' : null),
    })
  }

  return <dialog ref={dialog} className={s.dialog} aria-label="Voyager briefing" aria-modal="true"
    onCancel={event => { event.preventDefault(); close('closed') }}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
    onPointerCancel={() => { swipe.current.moved = true }} onClick={onClick}
    onKeyDown={event => {
      if (!ownTarget(event.target) || (event.target as HTMLElement).closest('input, textarea')) return
      if (event.key === 'ArrowRight') go(nav.page + 1, 'key')
      if (event.key === 'ArrowLeft') go(nav.page - 1, 'key')
    }}>
    <div className={s.stage} data-cinematic={nav.page < 2 || undefined}>
      <div ref={content} tabIndex={-1} className={`${s.pages} ${last ? '' : s.withContinue}`}>
        <DevicePage state={state(0)} />
        <CollectivePage state={state(1)} />
        <MembersPage state={state(2)} members={members} onProfile={() => track('initiation_brief_detail_opened', { page_id: BRIEFING_PAGES[2], topic: 'member_profile' })} />
        <RecruitingPage state={state(3)} batch={seats.batch} capacity={seats.capacity} initiated={seats.initiated} />
        <ClassifiedPage state={state(4)} />
        <FrontLinePage state={state(5)} regions={regions} />
        <PacksPage state={state(6)} onPack={index => track('initiation_brief_detail_opened', { page_id: BRIEFING_PAGES[6], topic: `pack_${index + 1}` })} />
        <JoinPage state={state(7)} offers={offers} busy={busy} unavailable={unavailable}
          onChoose={offer => onChoose(offer, nav.page)}
          onLearnMore={() => { track('initiation_brief_detail_opened', { page_id: BRIEFING_PAGES[7], topic: 'learn_more' }); close('learn_more') }} />
      </div>
      <div className={s.top}>
        {first
          ? <button type="button" className={s.iconButton} aria-label="Close briefing" onClick={() => close('closed')}><X size={20} aria-hidden /></button>
          : <button type="button" className={s.iconButton} aria-label="Previous page" onClick={() => go(nav.page - 1, 'back')}><ChevronLeft size={22} aria-hidden /></button>}
        <div className={s.topEnd}>
          <button type="button" className={s.iconButton} data-sound-toggle aria-label={sound.on ? 'Turn music off' : 'Turn music on'}
            onClick={() => track('initiation_brief_sound_toggled', { sound: sound.toggle() ? 'on' : 'off', page_index: nav.page + 1, page_id: BRIEFING_PAGES[nav.page] })}>
            {sound.on ? <Volume2 size={20} aria-hidden /> : <VolumeX size={20} aria-hidden />}
          </button>
          {last
            ? <button type="button" className={s.iconButton} aria-label="Close briefing" onClick={() => close('completed')}><X size={20} aria-hidden /></button>
            : <button type="button" className={s.skip} data-briefing-nav="skip" onClick={() => go(LAST, 'skip')}>Skip</button>}
        </div>
      </div>
      {!last && <div className={s.dock}>
        <button type="button" className={s.tapHint} data-briefing-nav="continue" onClick={() => go(nav.page + 1, 'continue')}>Tap to continue</button>
      </div>}
      <p className="sr-only" aria-live="polite">{`Page ${nav.page + 1} of ${BRIEFING_PAGES.length}`}</p>
    </div>
  </dialog>
}
