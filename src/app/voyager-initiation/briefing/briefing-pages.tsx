'use client'

import { useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import SmartImage from '@/components/smart-image'
import { ANTENNA } from '@/lib/antenna-copy'
import { FlipWordmark } from '@/components/flip-wordmark'
import { MemberProfileSheet } from '@/components/member-profile-sheet'
import { memberInitials } from '@/lib/member-initials'
import { briefingSeats, type BriefingOffer, type BriefingRegion } from '@/lib/initiation-briefing'
import type { InitiationPublicMember } from '@/lib/initiation-types'
import { BriefingPage, Headline, Kicker, attachVideo, clamp, ease, easeOut, fitCanvas, lerp, releaseVideo, rise, useScene, type PageState } from './briefing-kit'
import s from './briefing.module.css'

const MEDIA = '/assets/voyager-briefing'
const ORANGE = '227,82,5'
const STAR = '245,245,245'

/* 1 · The device: static, then a slow lamp over a loop of Console films (one is real footage). */
const CONSOLE_CLIPS = [
  { src: `${MEDIA}/console-real.mp4`, poster: `${MEDIA}/console-real.jpg` },
  { src: `${MEDIA}/console-tuning.mp4` },
  { src: `${MEDIA}/console-fairy.mp4` },
  { src: `${MEDIA}/console-starry.mp4` },
]

function drawSnow(buffer: HTMLCanvasElement, image: ImageData, ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const data = image.data
  for (let y = 0; y < buffer.height; y++) {
    let previous = Math.random() * 255
    const row = Math.random() * 36 - 18, streak = Math.random() < .012 ? 90 : 0
    for (let x = 0; x < buffer.width; x++) {
      previous = previous * .45 + Math.random() * 140
      const offset = (y * buffer.width + x) * 4, value = clamp(previous + row + streak, 0, 255)
      data[offset] = data[offset + 1] = data[offset + 2] = value
      data[offset + 3] = 255
    }
  }
  buffer.getContext('2d')!.putImageData(image, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(buffer, 0, 0, w, h)
  ctx.fillStyle = 'rgba(0,0,0,.3)'
  ctx.fillRect(0, ((t * .2) % (h + 100)) - 50, w, 46)
}

export function DevicePage({ state }: { state: PageState }) {
  const film = useRef<HTMLDivElement>(null)
  const lamp = useRef<HTMLSpanElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  useScene(state.active, (scene, reduced) => {
    const clips = Array.from(film.current!.querySelectorAll('video'))
    const cv = canvas.current!, light = lamp.current!
    clips.forEach(video => { releaseVideo(video); delete video.dataset.show })
    delete light.dataset.on
    if (reduced) { attachVideo(clips[0]); clips[0].dataset.show = ''; cv.style.opacity = '0'; return }
    cv.style.transition = ''
    cv.style.opacity = '1'
    const { ctx, w, h } = fitCanvas(cv)
    const buffer = document.createElement('canvas')
    buffer.width = Math.max(80, Math.round(w / 2))
    buffer.height = Math.max(60, Math.round(h / 2))
    const image = buffer.getContext('2d')!.createImageData(buffer.width, buffer.height)
    let snowing = true, last = -100
    scene.loop(t => { if (snowing && t - last >= 40) { last = t; drawSnow(buffer, image, ctx, w, h, t) } })
    scene.later(() => { cv.style.transition = 'opacity .16s ease'; cv.style.opacity = '0' }, 1400)
    scene.later(() => { snowing = false; ctx.clearRect(0, 0, w, h) }, 1650)
    // Each time the lamp goes fully dark (one animation iteration, every 3s) the film cuts to the next clip
    // of a shuffled deck, at a random moment. Every clip plays once per round and a new round never starts
    // with the clip on screen, so a clip only returns after all the others. The next cut is prepared while
    // the light is on, so it is already seeked.
    clips.forEach(video => { video.loop = true })
    const randomMoment = (video: HTMLVideoElement) => {
      const length = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 5
      return .3 + Math.random() * Math.max(.1, length - 1.1)
    }
    const whenReady = (video: HTMLVideoElement, fn: () => void) => {
      if (video.readyState >= 1) fn()
      else video.addEventListener('loadedmetadata', () => { if (scene.alive()) fn() }, { once: true })
    }
    let current: HTMLVideoElement | null = null
    let upcoming: HTMLVideoElement | null = null
    let deck: HTMLVideoElement[] = []
    const draw = () => {
      if (!deck.length) {
        deck = [...clips]
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]]
        }
        if (deck[0] === current) deck.push(deck.shift()!)
      }
      return deck.shift()!
    }
    const prepare = () => {
      const next = draw()
      upcoming = next
      attachVideo(next)
      whenReady(next, () => { if (upcoming === next) { try { next.currentTime = randomMoment(next) } catch { /* seek not ready */ } } })
    }
    const cut = () => {
      const next = upcoming ?? clips[0]
      const previous = current
      current = next
      clips.forEach(video => { if (video === next) video.dataset.show = ''; else delete video.dataset.show })
      void next.play().catch(() => {})
      if (previous && previous !== next) releaseVideo(previous)
      prepare()
    }
    upcoming = draw()
    attachVideo(upcoming)
    const first = upcoming
    whenReady(first, () => { if (upcoming === first) { try { first.currentTime = randomMoment(first) } catch { /* seek not ready */ } } })
    scene.later(() => { cut(); light.dataset.on = ''; scene.listen(light, 'animationiteration', cut) }, 1600)
    return () => clips.forEach(releaseVideo)
  })
  return <BriefingPage state={state} className={s.p1} label="The device">
    <div ref={film} className={s.film} role="img" aria-label="Under a slow, pulsing light, each time it goes dark the screen cuts to another moment of Multiverse Console footage: hands tuning a real Console into a world, a dial tuned to a robot library, a forest fairy and a starry hillside.">
      {CONSOLE_CLIPS.map(clip => <video key={clip.src} data-src={clip.src} poster={clip.poster} muted playsInline preload="auto" />)}
      <span ref={lamp} className={s.lamp} />
      <canvas ref={canvas} className={s.fx} />
    </div>
    <div className={`${s.copy} ${s.p1Copy} ${s.gut}`}>
      <Kicker text="THE DEVICE" />
      <Headline text="We own a device that can see into parallel worlds." large />
      <p className={`${s.lede} ${s.rise}`} style={rise(2700)}>It is called the Multiverse Console.</p>
    </div>
  </BriefingPage>
}

/* 2 · The Collective: brand wordmark, then EXPLORE / OBSERVE / INTERVENE with their own footage. */
const VERBS = ['EXPLORE.', 'OBSERVE.', 'INTERVENE.']
const VERB_HOLD = [3600, 2800, 4600]

export function CollectivePage({ state }: { state: PageState }) {
  const media = useRef<HTMLDivElement>(null)
  const verbs = useRef<HTMLUListElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  useScene(state.active, (scene, reduced) => {
    const layers = (Array.from(media.current!.children) as HTMLElement[]).slice(0, VERBS.length)
    const london = layers[0] as HTMLVideoElement, press = layers[2] as HTMLVideoElement
    const items = Array.from(verbs.current!.children) as HTMLElement[]
    const list = verbs.current!
    const { ctx, w, h } = fitCanvas(canvas.current!)
    ctx.clearRect(0, 0, w, h)
    attachVideo(london)
    const show = (k: number) => {
      layers.forEach((layer, i) => { if (i === k) layer.dataset.show = ''; else delete layer.dataset.show })
      items.forEach((item, i) => { if (i === k) item.dataset.current = ''; else delete item.dataset.current })
    }
    if (reduced) { show(0); delete list.dataset.cycling; return }
    let ripple: number | null = null
    const step = (k: number) => {
      show(k)
      list.dataset.cycling = ''
      if (k === 0) void london.play().catch(() => {})
      if (k === 1) attachVideo(press)
      if (k === 2) {
        attachVideo(press)
        try { press.currentTime = 0 } catch { /* not ready */ }
        void press.play().catch(() => {})
        scene.later(() => { ripple = performance.now() }, 2500)
      }
      scene.later(() => step((k + 1) % VERBS.length), VERB_HOLD[k])
    }
    show(0)
    delete list.dataset.cycling
    scene.later(() => step(0), 900)
    scene.loop(() => {
      ctx.clearRect(0, 0, w, h)
      if (ripple === null) return
      const t = performance.now() - ripple
      for (let i = 0; i < 3; i++) {
        const u = clamp((t - i * 170) / 1200)
        if (u <= 0 || u >= 1) continue
        ctx.strokeStyle = `rgba(${ORANGE},${(1 - u) * .9})`
        ctx.lineWidth = 3 * (1 - u) + 1
        ctx.beginPath(); ctx.arc(w * .5, h * .6 * .58, 20 + easeOut(u) * Math.max(w, h) * .6, 0, Math.PI * 2); ctx.stroke()
      }
      if (t > 1700) ripple = null
    })
    return () => { releaseVideo(london); releaseVideo(press) }
  })
  return <BriefingPage state={state} className={s.p2} label="The Collective">
    <div ref={media} className={s.p2Media} aria-hidden>
      <video data-src={`${MEDIA}/london-device.mp4`} poster={`${MEDIA}/london-device.jpg`} muted playsInline loop preload="auto" />
      <span><SmartImage src={`${MEDIA}/robot-library.jpg`} alt="" sizes="(min-width: 460px) 460px, 100vw" className={s.cover} preload /></span>
      <video data-src={`${MEDIA}/console-press.mp4`} poster={`${MEDIA}/console-press.jpg`} muted playsInline preload="auto" />
      <span className={s.scrim} data-show="" />
    </div>
    <canvas ref={canvas} className={s.fx} />
    <div className={`${s.brand} ${s.gut}`}>
      {state.visit > 0 && <FlipWordmark key={state.visit} maxWidth={420} fill={0.88} playbackRate={2} replayable={false} />}
      {/* eslint-disable-next-line @next/next/no-img-element -- original brand asset at its own proportions */}
      <img className={s.brandIcon} src="/assets/vi-icon.png" alt="" width={96} height={54} />
    </div>
    <div className={`${s.p2Content} ${s.gut}`}>
      <h2 className="sr-only">We are Multiverse Collective.</h2>
      <ul ref={verbs} className={s.verbs} aria-label="We explore, observe and intervene">
        {VERBS.map((verb, k) => <li key={verb} className={k === 2 ? s.hot : undefined} style={{ '--k': k } as CSSProperties}>{verb}</li>)}
      </ul>
      <p className={`${s.p2Lede} ${s.rise}`} style={rise(2600)}>An organization that explores parallel worlds, observes them, and tries to intervene in them.</p>
    </div>
  </BriefingPage>
}

/* 3 · Members: the counts are unknown; real S26 members surface one at a time. */
const SLOTS = [[22, 10], [64, 6], [86, 32], [40, 30], [14, 52], [62, 54], [88, 76], [34, 78]] as const
type Slot = { member: number; shown: boolean; dx: number; dy: number }

export function MembersPage({ state, members, onProfile }: { state: PageState; members: InitiationPublicMember[]; onProfile: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const counters = useRef<HTMLDivElement>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [profile, setProfile] = useState<string | null>(null)
  useScene(state.active, (scene, reduced) => {
    const cells = Array.from(counters.current!.querySelectorAll<HTMLElement>('[data-cell]'))
    const { ctx, w, h } = fitCanvas(canvas.current!)
    const count = Math.min(SLOTS.length, members.length)
    if (reduced) {
      cells.forEach(cell => { cell.textContent = '?' })
      scene.later(() => setSlots(Array.from({ length: count }, (_, i) => ({ member: i, shown: true, dx: 0, dy: 0 }))), 0)
      return
    }
    cells.forEach((cell, i) => {
      scene.every(() => { if (cell.dataset.spin) cell.textContent = String(Math.floor(Math.random() * 10)) }, 55)
      cell.dataset.spin = '1'
      scene.later(() => { delete cell.dataset.spin; cell.textContent = '?' }, 600 + Math.floor(i / 3) * 250 + (i % 3) * 150)
    })
    const dots = Array.from({ length: 150 }, () => ({ x: Math.random() * w, y: 30 + Math.random() * (h - 100), size: .8 + Math.random() * 1.2, alpha: .1 + Math.random() * .35, phase: Math.random() * 6.28, speed: .0006 + Math.random() * .001 }))
    scene.loop(t => {
      ctx.clearRect(0, 0, w, h)
      for (const dot of dots) {
        ctx.fillStyle = `rgba(${STAR},${dot.alpha * clamp(t / 900) * (.55 + .45 * Math.sin(dot.phase + t * dot.speed))})`
        ctx.fillRect(dot.x, dot.y, dot.size, dot.size)
      }
    })
    if (!count) return
    const used = new Set<number>()
    const pick = () => {
      const free = members.map((_, i) => i).filter(i => !used.has(i))
      const choice = free[Math.floor(Math.random() * free.length)] ?? 0
      used.add(choice)
      return choice
    }
    scene.later(() => setSlots(Array.from({ length: count }, (_, i) => ({ member: i, shown: false, dx: 0, dy: 0 }))), 0)
    const cycle = (slot: number, previous: number | null) => {
      if (previous !== null) used.delete(previous)
      const member = pick()
      const dx = Math.random() * 6 - 3, dy = Math.random() * 4 - 2
      setSlots(current => current.map((item, i) => i === slot ? { member, shown: false, dx, dy } : item))
      scene.later(() => setSlots(current => current.map((item, i) => i === slot ? { ...item, shown: true } : item)), 40)
      scene.later(() => {
        setSlots(current => current.map((item, i) => i === slot ? { ...item, shown: false } : item))
        scene.later(() => cycle(slot, member), 1400 + Math.random() * 1400)
      }, 5200 + Math.random() * 3000)
    }
    for (let slot = 0; slot < count; slot++) scene.later(() => cycle(slot, null), 1000 + slot * 380)
  })
  return <BriefingPage state={state} className={s.p3} label="The members">
    <canvas ref={canvas} className={s.fx} />
    <div ref={counters} className={`${s.p3Top} ${s.gut}`}>
      <div className={s.counts}>
        {['MEMBERS WORLDWIDE', 'DEVICES WORLDWIDE'].map(label => <div key={label} className={s.flap} role="img" aria-label={`${label.split(' ')[0].toLowerCase()} count unknown`}>
          <div className={s.cells} aria-hidden>{[0, 1, 2].map(i => <span key={i} data-cell className={s.cell}>?</span>)}</div>
          <span className={s.flapLabel} aria-hidden>{label}</span>
        </div>)}
      </div>
    </div>
    <div className={s.network} aria-label="Some S26 Voyagers">
      {slots.map((slot, i) => {
        const member = members[slot.member]
        if (!member) return null
        return <div key={i} className={s.node} data-show={slot.shown || undefined} style={{ left: `${SLOTS[i][0] + slot.dx}%`, top: `${SLOTS[i][1] + slot.dy}%` }}>
          <button type="button" className={s.memberButton} tabIndex={slot.shown ? 0 : -1} aria-haspopup="dialog" aria-label={`View ${member.displayName}'s profile`}
            onClick={() => { setProfile(member.id); onProfile() }}>
            <span className={s.avatar} aria-hidden>{memberInitials(member.displayName)}{member.avatarUrl && <SmartImage src={member.avatarUrl} alt="" sizes="52px" width={52} height={52} preload onError={event => { event.currentTarget.style.display = 'none' }} />}</span>
            <span className={s.memberName}>{member.displayName}</span>
          </button>
        </div>
      })}
    </div>
    <div className={`${s.copy} ${s.p3Copy} ${s.gut}`} style={{ '--base': '2200ms', '--kicker-delay': '1900ms' } as CSSProperties}>
      <Kicker text="THE MEMBERS" />
      <Headline text="No one knows how many of us there are." base={2200} />
      <p className={`${s.lede} ${s.rise}`} style={rise(2900)}>But some of us are here, and you can meet them.</p>
    </div>
    {profile && <MemberProfileSheet profileId={profile} onClose={() => setProfile(null)} />}
  </BriefingPage>
}

/* 4 · Recruiting: the Voyager badge, ringed by the batch's seats. */
export function RecruitingPage({ state, batch, capacity, initiated }: { state: PageState; batch: string; capacity: number; initiated: number | null }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const seats = briefingSeats(capacity, initiated)
  useScene(state.active, (scene, reduced) => {
    const { ctx, w, h } = fitCanvas(canvas.current!)
    const cx = w * .485, cy = h * .507, radius = w * .315 + 16
    ctx.font = '700 12px "Courier Prime", monospace'
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      const rotation = !reduced && t > 2900 ? (t - 2900) * (Math.PI * 2 / 90000) : 0
      const angle = (i: number) => -Math.PI / 2 + i / Math.max(1, seats.total) * Math.PI * 2 + rotation
      for (let i = 0; i < seats.total; i++) {
        const appear = reduced ? 1 : clamp((t - 500 - i * 7) / 200)
        if (!appear) continue
        const x = cx + radius * Math.cos(angle(i)), y = cy + radius * Math.sin(angle(i))
        const taken = i < seats.taken && (reduced || t > 1300 + i * 24), mine = i === seats.next && (reduced || t > 2450)
        ctx.beginPath(); ctx.arc(x, y, (mine ? 5.5 : 3.6) * appear, 0, Math.PI * 2)
        if (mine) { ctx.fillStyle = `rgb(${ORANGE})`; ctx.fill() }
        else if (taken) { ctx.fillStyle = `rgba(${STAR},.9)`; ctx.fill() }
        else { ctx.strokeStyle = `rgba(${STAR},${.55 * appear})`; ctx.lineWidth = 1.2; ctx.stroke() }
      }
      if (seats.next === null || (!reduced && t < 2450)) return
      const a = angle(seats.next), x = cx + radius * Math.cos(a), y = cy + radius * Math.sin(a)
      if (!reduced) {
        const u = ((t - 2450) % 2200) / 2200
        ctx.strokeStyle = `rgba(${ORANGE},${(1 - u) * .9})`; ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(x, y, 6 + u * 22, 0, Math.PI * 2); ctx.stroke()
      }
      const label = 'YOUR SEAT?', width = ctx.measureText(label).width + 12
      let lx = x + Math.cos(a) * 20
      lx = Math.cos(a) >= 0 ? lx : lx - width
      lx = clamp(lx, 8, w - width - 8)
      const ly = clamp(y + Math.sin(a) * 20 - 10, 8, h - 28)
      ctx.globalAlpha = reduced ? 1 : clamp((t - 2550) / 300)
      ctx.fillStyle = `rgb(${ORANGE})`; ctx.fillRect(lx, ly, width, 20)
      ctx.fillStyle = '#10162D'; ctx.fillText(label, lx + 6, ly + 14)
      ctx.globalAlpha = 1
    }
    if (reduced) draw(1e9)
    else scene.loop(draw)
  })
  return <BriefingPage state={state} className={s.p4} label="Recruiting">
    <div className={s.badge}>
      <SmartImage src={`${MEDIA}/voyager-badge.jpg`} alt="The orange Voyager badge standing beside a Multiverse Collective box" sizes="290px" preload />
      <canvas ref={canvas} className={s.fx} />
    </div>
    <div className={`${s.copy} ${s.p4Copy} ${s.gut}`} style={{ '--base': '1500ms', '--kicker-delay': '1200ms' } as CSSProperties}>
      <Kicker text={`RECRUITING · BATCH ${batch}`} />
      <Headline text="We are recruiting a new batch of Voyagers." base={1500} />
      <p className={`${s.meta} ${s.rise}`} style={rise(2300)}>{seats.total} seats · {seats.known ? `${seats.taken} initiated` : 'count not yet available'}</p>
    </div>
  </BriefingPage>
}

/* 5 · Classified: a flashlight travels between the archive's questions. */
const QUESTIONS = [{ x: .30, y: .21 }, { x: .33, y: .80 }, { x: .76, y: .50 }]

export function ClassifiedPage({ state }: { state: PageState }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const record = useRef<HTMLSpanElement>(null)
  useScene(state.active, (scene, reduced) => {
    const { ctx, w, h } = fitCanvas(canvas.current!)
    const image = new Image()
    image.src = `${MEDIA}/intel-questions.jpg`
    const HOLD = 2600, MOVE = 1400, SEGMENT = HOLD + MOVE
    const start = () => {
      if (!scene.alive()) return
      if (!w || !h || !image.naturalHeight) return
      const scale = h * 1.12 / image.naturalHeight, iw = image.naturalWidth * scale, ih = image.naturalHeight * scale
      const camera = (q: { x: number; y: number }) => ({ x: clamp(q.x * iw - w / 2, 0, iw - w), y: clamp(q.y * ih - h / 2, 0, ih - h) })
      let shown = -1
      const draw = (t: number) => {
        const k = Math.floor(t / SEGMENT) % 3, n = (k + 1) % 3, u = reduced ? 0 : ease(clamp((t % SEGMENT - HOLD) / MOVE))
        const a = camera(QUESTIONS[k]), b = camera(QUESTIONS[n])
        const camX = lerp(a.x, b.x, u), camY = lerp(a.y, b.y, u)
        const fx = lerp(QUESTIONS[k].x * iw, QUESTIONS[n].x * iw, u) - camX, fy = lerp(QUESTIONS[k].y * ih, QUESTIONS[n].y * ih, u) - camY
        ctx.clearRect(0, 0, w, h)
        ctx.drawImage(image, -camX, -camY, iw, ih)
        const dark = reduced ? .35 : lerp(.97, .74, clamp((t - 300) / 900))
        const r = reduced ? w : 150 * clamp((t - 300) / 700) + 1
        ctx.fillStyle = `rgba(8,12,32,${dark})`
        ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.arc(fx, fy, r, 0, Math.PI * 2, true); ctx.fill()
        const soft = ctx.createRadialGradient(fx, fy, r * .55, fx, fy, r)
        soft.addColorStop(0, 'rgba(8,12,32,0)'); soft.addColorStop(1, `rgba(8,12,32,${dark})`)
        ctx.fillStyle = soft; ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill()
        const current = u > .5 ? n : k
        if (current !== shown && record.current) { shown = current; record.current.textContent = `CLASSIFIED RECORD ${current + 1} OF 3` }
      }
      if (reduced) draw(0)
      else scene.loop(draw)
    }
    if (image.complete && image.naturalWidth) start()
    else scene.listen(image, 'load', start)
  })
  return <BriefingPage state={state} className={s.p5} label="Classified">
    <div className={`${s.copy} ${s.p5Copy} ${s.gut}`}>
      <Kicker text="CLASSIFIED" />
      <Headline text="Voyagers see what the Collective keeps hidden." />
    </div>
    <div className={s.view} role="img" aria-label="Archive notes asking: How long has the Collective existed? Who were the first Voyagers? What did they discover?">
      <canvas ref={canvas} className={s.fx} />
      <span className={s.stamp}>VOYAGERS ONLY</span>
      <span ref={record} className={s.record}>CLASSIFIED RECORD 1 OF 3</span>
    </div>
  </BriefingPage>
}

/* 6 · Votes: proposals pictured on the Initiation page open in turn. Percentages are illustrative. */
const PROPOSALS = [
  { question: 'Which world should we observe next?', options: [['The robot library', 44], ['The shepherd’s valley', 39], ['The starry meadow', 17]] },
  { question: 'How many new Voyagers should join?', options: [['100', 52], ['250', 31], ['500', 17]] },
  { question: 'Should we reveal our device locations?', options: [['Yes', 36], ['No', 64]] },
  { question: 'Investigate a new antenna organization?', options: [['Yes', 71], ['No', 29]] },
] as const

export function VotesPage({ state }: { state: PageState }) {
  const [open, setOpen] = useState(0)
  useScene(state.active, (scene, reduced) => {
    scene.later(() => setOpen(0), 0)
    if (reduced) return
    let k = 0
    const step = () => { k = (k + 1) % PROPOSALS.length; setOpen(k); scene.later(step, 4000) }
    scene.later(step, 4200)
  })
  return <BriefingPage state={state} className={s.p6} label="Member votes">
    <div className={`${s.p6Head} ${s.gut}`}>
      <SmartImage src="/assets/voyager-initiation/participation-questions.png" alt="" sizes="(min-width: 460px) 460px, 100vw" className={s.cover} preload />
      <span className={s.scrim} />
      <div className={s.copy}>
        <Kicker text="MEMBER VOTES" />
        <Headline text="Help shape what the Collective decides." />
      </div>
    </div>
    <ul className={`${s.proposals} ${s.gut}`} aria-label="Example member proposals">
      {PROPOSALS.map((proposal, k) => {
        const lead = Math.max(...proposal.options.map(([, value]) => value))
        return <li key={proposal.question} className={s.proposal} data-open={open === k || undefined} style={{ '--k': k } as CSSProperties}>
          <div className={s.question}>{proposal.question}<span>PROPOSAL</span></div>
          <div className={s.tally}><div><div className={s.options}>
            {proposal.options.map(([label, value]) => <div key={label} className={`${s.option} ${value === lead ? s.lead : ''}`} style={{ '--p': `${value}%` } as CSSProperties}>
              <div className={s.optionRow}><b>{label}</b><span>{value}%</span></div>
              <div className={s.track}><i /></div>
            </div>)}
          </div></div></div>
        </li>
      })}
    </ul>
  </BriefingPage>
}

/* 7 · The front line: the Console film and each region's published phase. */
const GLYPHS = '█▓▒░#%&@$*'

export function FrontLinePage({ state, regions }: { state: PageState; regions: BriefingRegion[] }) {
  const video = useRef<HTMLVideoElement>(null)
  const list = useRef<HTMLUListElement>(null)
  useScene(state.active, (scene, reduced) => {
    const reel = video.current!
    if (!reduced) { attachVideo(reel); void reel.play().catch(() => {}) }
    const locked = Array.from(list.current?.querySelectorAll<HTMLElement>('[data-scramble]') ?? [])
    if (!reduced) scene.every(() => locked.forEach(el => {
      const text = el.dataset.scramble ?? ''
      el.textContent = Array.from(text).map(c => Math.random() < .35 ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : c).join('')
    }), 120)
    return () => { releaseVideo(reel); locked.forEach(el => { el.textContent = el.dataset.scramble ?? '' }) }
  })
  return <BriefingPage state={state} className={s.p7} label="The front line">
    <video ref={video} className={s.reel} data-src={`${MEDIA}/console-reel.mp4`} poster="/assets/device-reel-v2-20261016-poster.jpg" muted playsInline loop preload="auto"
      aria-label="A hand turns the dial of a Multiverse Console until a parallel world appears on its screen" />
    <div className={`${s.copy} ${s.p7Panel}`}>
      <Kicker text="THE FRONT LINE" />
      <Headline text="Above all, a Console of your own." base={600} />
    </div>
    {regions.length > 0 && <ul ref={list} className={s.regions} aria-label="Console regions">
      {regions.map((region, k) => <li key={region.name} className={region.open ? undefined : s.locked} style={{ '--k': k } as CSSProperties}>
        <div className={s.regionRow}><b>{region.name}</b>
          {region.open ? <span className={`${s.regionState} ${s.regionOpen}`}>OPEN TO CLAIM</span>
            : <span className={s.regionState} data-scramble="CLASSIFIED" aria-label="Classified">CLASSIFIED</span>}
        </div>
        {region.open && <>
          <div className={s.phases} style={{ '--phases': region.phases } as CSSProperties} aria-hidden>
            {Array.from({ length: region.phases }, (_, i) => <i key={i} data-done={i < region.phase - 1 || undefined} data-now={i === region.phase - 1 || undefined} />)}
          </div>
          <span className={s.meta}>Phase {region.phase} of {region.phases} · {region.phaseLabel}</span>
        </>}
      </li>)}
    </ul>}
  </BriefingPage>
}

/* 8 · Packs: the Console leads; tap any month to see that pack. */
const PACKS = [
  { month: 'OCT', meta: 'PACK 1 · OCT 2026', title: 'Initial Voyager Pack', short: 'Initial Pack', image: `${MEDIA}/pack-1.jpg`, focus: '50% 75%', alt: 'A welcome letter and Voyager badge on a desk', description: 'Welcome letter and exclusive member badge. A physical invitation into the Collective.' },
  { month: 'NOV', meta: 'PACK 2 · NOV 2026', title: ANTENNA.firstMention, short: ANTENNA.name, image: ANTENNA.image, alt: ANTENNA.imageAlt, description: ANTENNA.briefingDescription },
  { month: 'DEC', meta: 'PACK 3 · DEC 2026', title: 'Multiverse Console', short: 'Console', image: `${MEDIA}/console-workshop.jpg`, alt: 'A Multiverse Console on a workshop bench, its screen showing a parallel world', description: 'Your own device for exploring and interacting with parallel worlds.' },
  { month: 'JAN', meta: 'PACK 4 · JAN 2027', title: 'A Fourth Delivery', short: 'Fourth delivery', image: `${MEDIA}/pack-4.jpg`, alt: 'A sealed envelope awaiting its reveal', description: 'A future shipment for this cohort. Contents to be announced.' },
]

export function PacksPage({ state, onPack }: { state: PageState; onPack: (index: number) => void }) {
  const [selected, setSelected] = useState(2)
  const pack = PACKS[selected]
  return <BriefingPage state={state} className={s.p8} label="Your packs">
    <div className={`${s.copy} ${s.p8Copy} ${s.gut}`}>
      <Kicker text="YOUR PACKS" />
      <Headline text="Four packs come to your door." />
    </div>
    <div className={s.gut}>
      <div className={s.packCard}>
        <div className={`${s.packHero} ${selected === 1 ? s.antennaHero : ''}`}>
          <span key={pack.image} className={s.packImage}><SmartImage src={pack.image} alt={pack.alt} sizes="(min-width: 460px) 430px, 92vw" preload style={pack.focus ? { objectPosition: pack.focus } : undefined} /></span>
        </div>
        <div className={s.packCaption} aria-live="polite"><span>{pack.meta}</span><b>{pack.title}</b><p>{pack.description}</p>{selected === 1 && <><p>{ANTENNA.requirement} {ANTENNA.initialExclusion}</p><p>{ANTENNA.imageCaption}</p></>}</div>
      </div>
      <div className={s.packStrip}>
        {PACKS.map((item, k) => <button key={item.month} type="button" className={s.packThumb} aria-pressed={selected === k} style={{ '--k': k } as CSSProperties}
          onClick={() => { setSelected(k); onPack(k) }}>
          <SmartImage src={item.image} alt="" sizes="96px" width={96} height={96} preload style={item.focus ? { objectPosition: item.focus } : undefined} />
          <span>{item.month}</span><b>{item.short}</b>
        </button>)}
      </div>
    </div>
    <p className={`${s.meta} ${s.p8Note} ${s.gut} ${s.rise}`} style={rise(1900)}>Tap a pack to see what is inside. One a month; contiguous US only, shipping and taxes included.</p>
  </BriefingPage>
}

/* 9 · Join: the same offers as the checkout panel. */
export function JoinPage({ state, offers, busy, unavailable, onChoose, onLearnMore }: {
  state: PageState; offers: BriefingOffer[]; busy: boolean; unavailable: string | null
  onChoose: (offer: BriefingOffer['id']) => void; onLearnMore: () => void
}) {
  return <BriefingPage state={state} className={s.p9} label="Voyager Initiation">
    <div className={s.p9Media} aria-hidden>
      <SmartImage src={`${MEDIA}/welcome-desk.jpg`} alt="" sizes="(min-width: 460px) 460px, 100vw" className={s.cover} preload />
      <span className={s.scrim} />
    </div>
    <div className={`${s.p9Content} ${s.gut}`}>
      <Kicker text="BECOME A VOYAGER" />
      <Headline text="Voyager Initiation" large />
      <div className={s.offers} style={{ '--count': offers.length } as CSSProperties}>
        {offers.map((offer, k) => <div key={offer.id} className={`${s.offer} ${offer.recommended ? s.offerRecommended : ''} ${s.rise}`} style={rise(1100 + k * 200)}>
          <span className={s.offerLabel}>{offer.label}</span>
          <h3>{offer.title}</h3>
          <span className={s.price}>${offer.price}</span>
          <ul>{offer.points.map(point => <li key={point}><Check size={12} strokeWidth={3} aria-hidden />{point}</li>)}</ul>
          <span className={s.offerNote}>{offer.note}</span>
          <button type="button" className={s.choose} disabled={busy || !!unavailable} onClick={() => onChoose(offer.id)}>
            {offer.id === 'legacy_upgrade' ? `UPGRADE $${offer.price}` : `CHOOSE $${offer.price}`}
          </button>
        </div>)}
      </div>
      {unavailable && <p className={s.meta} role="status">{unavailable}</p>}
      <div className={`${s.p9Foot} ${s.rise}`} style={rise(1600)}>
        <button type="button" className={s.more} onClick={onLearnMore}>Learn more <ArrowRight size={16} aria-hidden /></button>
        <span className={s.meta}>One payment · No subscription</span>
      </div>
    </div>
  </BriefingPage>
}
