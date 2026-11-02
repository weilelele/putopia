'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SmartImage from '@/components/smart-image'
import { ANTENNA } from '@/lib/antenna-copy'
import { FlipWordmark } from '@/components/flip-wordmark'
import { MemberProfileSheet } from '@/components/member-profile-sheet'
import { memberInitials } from '@/lib/member-initials'
import { briefingSeats, type BriefingRegion } from '@/lib/initiation-briefing'
import { PARALLAX_ARRAY_EXAMPLES, PARALLAX_ARRAY_ROUNDS, PARALLAX_ARRAY_UNITS, parallaxArrayCaption, parallaxArrayDissolve, parallaxArrayFrame, parallaxArraySignal, parallaxArrayVotes, PARALLAX_ARRAY_VOTE_MARKS, type ParallaxArrayFrame } from '@/lib/parallax-array'
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
    <div ref={film} className={s.film} data-briefing-target="media" role="img" aria-label="Under a slow, pulsing light, each time it goes dark the screen cuts to another moment of Multiverse Console footage: hands tuning a real Console into a world, a dial tuned to a robot library, a forest fairy and a starry hillside.">
      {CONSOLE_CLIPS.map(clip => <video key={clip.src} data-src={clip.src} poster={clip.poster} muted playsInline preload="auto" />)}
      <span ref={lamp} className={s.lamp} />
      <canvas ref={canvas} className={s.fx} />
    </div>
    <div className={`${s.copy} ${s.p1Copy} ${s.gut}`} data-briefing-target="copy">
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
      <p className={`${s.p2Lede} ${s.rise}`} style={rise(2600)}>An organization that explores parallel worlds, observes them, and tries to intervene in them. Voyagers help decide what comes next.</p>
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

/* 6 · Parallax Array: the London device listens through an aged, swaying feed. The observation dissolves into static as
   it is sent; each round a small lens gathers more fragments of the world, and Voyager votes light up around it between
   rounds. The picture never resolves completely. Examples rotate slowly. */
const EXAMPLE_LENGTHS = PARALLAX_ARRAY_EXAMPLES.map(example => example.text.length)
const LENS = 124
const LENS_BOX = 208
/** The device feed keeps one middling resolution throughout: soft and aged, never crisp, never breaking up. */
const FEED_WIDTH = 240

function refreshStatic(noise: HTMLCanvasElement, image: ImageData) {
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = Math.random() * 255
    data[i + 3] = 255
  }
  noise.getContext('2d')!.putImageData(image, 0, 0)
}

export function ParallaxArrayPage({ state }: { state: PageState }) {
  const root = useRef<HTMLDivElement>(null)
  const sky = useRef<HTMLCanvasElement>(null)
  const film = useRef<HTMLDivElement>(null)
  const feed = useRef<HTMLCanvasElement>(null)
  const port = useRef<HTMLCanvasElement>(null)
  const ring = useRef<HTMLCanvasElement>(null)
  const caption = useRef<SVGTextPathElement>(null)
  const quote = useRef<HTMLSpanElement>(null)
  const reporter = useRef<HTMLSpanElement>(null)
  const dormant = useRef<HTMLSpanElement>(null)
  const arcId = useId()
  const city = PARALLAX_ARRAY_UNITS.find(unit => unit.online)?.city ?? 'LONDON'
  useScene(state.active, (scene, reduced) => {
    const wrap = root.current!, video = film.current!.querySelector('video')!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    // Sized from layout, not getBoundingClientRect, so an entrance transform can never measure a canvas at zero.
    const sized = (canvas: HTMLCanvasElement, size: number) => {
      canvas.width = canvas.height = Math.round(size * dpr)
      const context = canvas.getContext('2d')!
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      return context
    }
    const pctx = sized(port.current!, LENS), rctx = sized(ring.current!, LENS_BOX)
    const { ctx, w, h } = fitCanvas(sky.current!)
    const box = wrap.getBoundingClientRect(), filmRect = film.current!.getBoundingClientRect()
    const device = { x: filmRect.left - box.left + filmRect.width / 2, y: filmRect.top - box.top + filmRect.height * .45 }
    // The feed is drawn small and scaled up, like the Worlds live rooms: soft without a blur filter, then grained.
    const feedCanvas = feed.current!, fctx = feedCanvas.getContext('2d', { alpha: false })!
    const aspect = film.current!.offsetHeight / Math.max(1, film.current!.offsetWidth)
    const poster = new Image()
    poster.src = `${MEDIA}/london-device.jpg`
    const filmGrain = document.createElement('canvas')
    filmGrain.width = 96; filmGrain.height = Math.max(32, Math.round(96 * aspect))
    const filmGrainImage = filmGrain.getContext('2d')!.createImageData(filmGrain.width, filmGrain.height)
    let lastFeed = -100
    const drawFeed = (now: number) => {
      if (now - lastFeed < 66) return
      lastFeed = now
      const source = video.readyState >= 2 ? video : poster.complete && poster.naturalWidth ? poster : null
      if (!source) return
      const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth, sh = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight
      const width = FEED_WIDTH, height = Math.max(1, Math.round(width * aspect))
      if (feedCanvas.width !== width || feedCanvas.height !== height) { feedCanvas.width = width; feedCanvas.height = height }
      const scale = Math.max(width / sw, height / sh), cw = width / scale, ch = height / scale
      fctx.imageSmoothingEnabled = true; fctx.imageSmoothingQuality = 'high'
      fctx.globalAlpha = 1
      fctx.drawImage(source, (sw - cw) / 2, (sh - ch) * .4, cw, ch, 0, 0, width, height)
      fctx.globalAlpha = .08
      fctx.imageSmoothingEnabled = false
      fctx.drawImage(filmGrain, 0, 0, width, height)
      fctx.globalAlpha = 1
    }
    const images = PARALLAX_ARRAY_EXAMPLES.map(item => { const image = new Image(); image.src = item.image; return image })
    const small = document.createElement('canvas'), smallCtx = small.getContext('2d')!
    const pix = document.createElement('canvas')
    pix.width = pix.height = LENS
    const pixCtx = pix.getContext('2d')!
    const noise = document.createElement('canvas')
    noise.width = noise.height = 64
    const noiseImage = noise.getContext('2d')!.createImageData(64, 64)
    refreshStatic(noise, noiseImage)
    const CELLS = 9
    let ranks: number[] = [], shownExample = -1, shownKey = '', lastNoise = -100
    const ripples: { start: number }[] = []

    const drawLens = (frame: ParallaxArrayFrame, t: number) => {
      const signal = parallaxArraySignal(frame), image = images[frame.example]
      pctx.clearRect(0, 0, LENS, LENS)
      pctx.save()
      pctx.beginPath(); pctx.arc(LENS / 2, LENS / 2, LENS / 2, 0, Math.PI * 2); pctx.clip()
      pctx.fillStyle = '#000'; pctx.fillRect(0, 0, LENS, LENS)
      pctx.imageSmoothingEnabled = false
      pctx.globalAlpha = .45; pctx.drawImage(noise, 0, 0, LENS, LENS); pctx.globalAlpha = 1
      if (signal.reveal > 0 && image.complete && image.naturalWidth) {
        // The world drifts slowly inside the lens, rendered at the round's coarse grain, one fragment at a time.
        const side = Math.min(image.naturalWidth, image.naturalHeight) * .78
        const sx = (image.naturalWidth - side) / 2 + Math.sin(t / 4200) * side * .06, sy = (image.naturalHeight - side) / 2 + Math.cos(t / 5100) * side * .05
        if (small.width !== signal.grain) { small.width = signal.grain; small.height = signal.grain }
        smallCtx.drawImage(image, sx, sy, side, side, 0, 0, signal.grain, signal.grain)
        pixCtx.imageSmoothingEnabled = false
        pixCtx.clearRect(0, 0, LENS, LENS)
        pixCtx.drawImage(small, 0, 0, signal.grain, signal.grain, 0, 0, LENS, LENS)
        const cell = LENS / CELLS
        ranks.forEach((rank, i) => {
          const alpha = clamp((signal.reveal - rank) / .12)
          if (!alpha) return
          const cx = (i % CELLS) * cell, cy = Math.floor(i / CELLS) * cell
          pctx.globalAlpha = alpha
          pctx.drawImage(pix, cx, cy, cell, cell, cx, cy, cell, cell)
        })
        pctx.globalAlpha = 1
      }
      pctx.globalAlpha = signal.noise * .5; pctx.drawImage(noise, 0, 0, LENS, LENS); pctx.globalAlpha = 1
      pctx.restore()
    }

    const drawRing = (frame: ParallaxArrayFrame, t: number) => {
      const c = LENS_BOX / 2, votes = parallaxArrayVotes(frame)
      rctx.clearRect(0, 0, LENS_BOX, LENS_BOX)
      rctx.strokeStyle = `rgba(${STAR},.22)`; rctx.lineWidth = 1
      rctx.beginPath(); rctx.arc(c, c, LENS / 2 + 4, 0, Math.PI * 2); rctx.stroke()
      if (frame.stage === 'round') {
        // A slow scan travels the rim while the round is received.
        const a = t / 900
        rctx.strokeStyle = `rgba(${ORANGE},.9)`; rctx.lineWidth = 2
        rctx.beginPath(); rctx.arc(c, c, LENS / 2 + 4, a, a + Math.PI / 3.5); rctx.stroke()
      }
      // Vote marks, like the recruiting seats: each Voyager vote lights one.
      for (let i = 0; i < PARALLAX_ARRAY_VOTE_MARKS; i++) {
        const angle = -Math.PI / 2 + i / PARALLAX_ARRAY_VOTE_MARKS * Math.PI * 2
        const x = c + (LENS / 2 + 14) * Math.cos(angle), y = c + (LENS / 2 + 14) * Math.sin(angle)
        const lit = clamp(votes - i)
        rctx.beginPath(); rctx.arc(x, y, 1.6 + lit * 1.2, 0, Math.PI * 2)
        if (lit > 0) { rctx.fillStyle = `rgba(${ORANGE},${.35 + lit * .65})`; rctx.fill() }
        else { rctx.strokeStyle = `rgba(${STAR},.3)`; rctx.lineWidth = 1; rctx.stroke() }
      }
    }

    const draw = (now: number, frame: ParallaxArrayFrame) => {
      if (frame.example !== shownExample) { shownExample = frame.example; ranks = Array.from({ length: CELLS * CELLS }, () => Math.random() * .98) }
      const key = `${frame.example}:${frame.stage}:${frame.round}`
      if (key !== shownKey) {
        if (shownKey && frame.stage === 'round') ripples.push({ start: now })
        shownKey = key
        wrap.dataset.stage = frame.stage
        wrap.dataset.round = String(frame.round)
        caption.current!.textContent = parallaxArrayCaption(frame, city)
      }
      // The report and its byline appear, dissolve and return together.
      const example = PARALLAX_ARRAY_EXAMPLES[frame.example], text = example.text, byline = `VOYAGER REPORT FROM ${example.from.toUpperCase()}`
      const dissolve = (line: string) => Array.from(line, (char, i) => {
        const state = parallaxArrayDissolve(i, line.length, frame.progress)
        return state === 'kept' || char === ' ' ? char : state === 'static' ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : ' '
      }).join('')
      quote.current!.textContent = frame.stage === 'release' ? dissolve(text) : text.slice(0, frame.typed)
      reporter.current!.textContent = frame.stage === 'release' ? dissolve(byline) : byline
      if (frame.stage === 'typing' && !frame.typed) reporter.current!.dataset.empty = ''
      else delete reporter.current!.dataset.empty
      if (now - lastNoise >= 80) {
        lastNoise = now
        refreshStatic(noise, noiseImage)
        refreshStatic(filmGrain, filmGrainImage)
      }
      drawFeed(now)
      drawLens(frame, now)
      drawRing(frame, now)
      ctx.clearRect(0, 0, w, h)
      for (let k = ripples.length - 1; k >= 0; k--) {
        const age = now - ripples[k].start
        if (age > 2400) { ripples.splice(k, 1); continue }
        for (let i = 0; i < 2; i++) {
          const u = clamp((age - i * 300) / 1900)
          if (u <= 0 || u >= 1) continue
          ctx.strokeStyle = `rgba(${ORANGE},${(1 - u) * .5})`; ctx.lineWidth = 1.5 * (1 - u) + .6
          ctx.beginPath(); ctx.arc(device.x, device.y, 20 + easeOut(u) * w * .45, 0, Math.PI * 2); ctx.stroke()
        }
      }
    }

    const glyphs = dormant.current!, dormantText = glyphs.dataset.scramble ?? ''
    if (reduced) {
      const settled = { example: 0, typed: EXAMPLE_LENGTHS[0], stage: 'continue', round: PARALLAX_ARRAY_ROUNDS, progress: 0 } as const
      const show = () => { shownKey = ''; draw(0, settled); ctx.clearRect(0, 0, w, h) }
      show()
      if (!images[0].complete) scene.listen(images[0], 'load', show)
      return
    }
    scene.every(() => { glyphs.textContent = Array.from(dormantText).map(c => c !== ' ' && Math.random() < .15 ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : c).join('') }, 160)
    attachVideo(video)
    void video.play().catch(() => {})
    draw(0, parallaxArrayFrame(0, EXAMPLE_LENGTHS))
    // The scene rises in over the first second; the observation starts typing once it is on screen.
    scene.later(() => { const begin = performance.now(); scene.loop(() => { const now = performance.now(); draw(now, parallaxArrayFrame(now - begin, EXAMPLE_LENGTHS)) }) }, 1200)
    return () => { releaseVideo(video); glyphs.textContent = dormantText }
  })
  const arc = LENS / 2 + 30, mid = LENS_BOX / 2
  return <BriefingPage state={state} className={s.p6} label="Parallax Array">
    <div ref={root} className={s.p6Scene} data-stage="typing">
      <div className={`${s.copy} ${s.p6Copy} ${s.gut}`}>
        <Kicker text="PARALLAX ARRAY" />
        <Headline text="Describe a world you believe. We’d go looking for it." />
      </div>
      <div ref={film} className={s.p6Film}>
        <span className={s.p6Sway}>
          <video data-src={`${MEDIA}/london-device.mp4`} muted playsInline loop preload="none" aria-hidden />
          <canvas ref={feed} className={s.p6Feed} role="img" aria-label={`A remote feed of the ${city} Parallax Array, listening`} />
        </span>
        <span className={s.p6Live}><i className={s.liveDot} aria-hidden /><b>{city}</b> LISTENING</span>
      </div>
      <div className={s.lens} style={{ '--lens': `${LENS}px`, '--lens-box': `${LENS_BOX}px` } as CSSProperties}>
        <canvas ref={port} className={s.porthole} role="img" aria-label="A small round window gathering fragments of the observed world over three rounds" />
        <canvas ref={ring} className={s.fx} aria-hidden />
        <svg className={s.fx} viewBox={`0 0 ${LENS_BOX} ${LENS_BOX}`} aria-hidden>
          <path id={arcId} d={`M ${mid - arc} ${mid} A ${arc} ${arc} 0 0 0 ${mid + arc} ${mid}`} fill="none" />
          <text className={s.lensCaption}><textPath ref={caption} href={`#${arcId}`} startOffset="50%" textAnchor="middle">{city} · LISTENING</textPath></text>
        </svg>
      </div>
      <div className={`${s.p6Report} ${s.gut}`} aria-hidden>
        <span ref={reporter} className={s.p6ReportLabel} data-empty />
        <p className={s.p6Quote}><span ref={quote} /><span className={s.caret} /></p>
      </div>
      <ul className={`${s.p6Units} ${s.gut}`} aria-label="Parallax Array locations">
        {PARALLAX_ARRAY_UNITS.filter(unit => !unit.online).map(unit => <li key={unit.city}>
          <b>{unit.city}</b><span ref={dormant} data-scramble="NOT YET ONLINE" aria-label="Not yet online">NOT YET ONLINE</span>
        </li>)}
      </ul>
      <canvas ref={sky} className={s.fx} aria-hidden />
    </div>
    <ul className="sr-only">{PARALLAX_ARRAY_EXAMPLES.map(item => <li key={item.image}>Example observation from {item.from}: {item.text}</li>)}</ul>
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
  { month: 'OCT', meta: 'PACK 1 · OCT 2026', title: 'Initial Voyager Pack', short: 'Initial Pack', image: `${MEDIA}/pack-1.jpg`, focus: '50% 75%', alt: 'A welcome letter and Voyager badge on a desk', description: 'A welcome letter and exclusive Voyager badge.' },
  { month: 'NOV', meta: 'PACK 2 · NOV 2026', title: ANTENNA.firstMention, short: ANTENNA.name, image: ANTENNA.image, alt: ANTENNA.imageAlt, description: ANTENNA.packDescription },
  { month: 'DEC', meta: 'PACK 3 · DEC 2026', title: 'Multiverse Console', short: 'Console', image: `${MEDIA}/console-workshop.jpg`, alt: 'A Multiverse Console on a workshop bench, its screen showing a parallel world', description: 'Your own device for exploring and interacting with parallel worlds.' },
  { month: 'JAN', meta: 'PACK 4 · JAN 2027', title: 'A Fourth Delivery', short: 'Fourth delivery', image: `${MEDIA}/pack-4.jpg`, alt: 'A sealed envelope awaiting its reveal', description: 'Contents to be announced.' },
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
        <div className={s.packCaption} aria-live="polite"><span>{pack.meta}</span><b>{pack.title}</b><p>{pack.description}</p></div>
      </div>
      <div className={s.packStrip}>
        {PACKS.map((item, k) => <button key={item.month} type="button" className={s.packThumb} aria-pressed={selected === k} style={{ '--k': k } as CSSProperties}
          onClick={() => { setSelected(k); onPack(k) }}>
          <SmartImage src={item.image} alt="" sizes="96px" width={96} height={96} preload style={item.focus ? { objectPosition: item.focus } : undefined} />
          <span>{item.month}</span><b>{item.short}</b>
        </button>)}
      </div>
    </div>
    <p className={`${s.meta} ${s.p8Note} ${s.gut} ${s.rise}`} style={rise(1900)}>Tap a pack to see what is inside.</p>
  </BriefingPage>
}

/* 9 · Join: a flashback through every page under a drifting torch, each cut through a dark lamp like page 1, landing
   on a Console at its desk as the lights come up. Two equal ways out: the Dashboard, or the packs on the Initiation page. */
const MEMORIES = [
  { label: 'THE DEVICE', src: `${MEDIA}/flashback-device.jpg`, from: [.42, .3], to: [.58, .36] },
  { label: 'THE COLLECTIVE', src: `${MEDIA}/flashback-library.jpg`, from: [.5, .24], to: [.5, .34] },
  { label: 'THE MEMBERS', src: null, from: [.3, .26], to: [.66, .34] },
  { label: 'RECRUITING', src: `${MEDIA}/flashback-badge.jpg`, from: [.56, .38], to: [.44, .3] },
  { label: 'CLASSIFIED', src: `${MEDIA}/flashback-intel.jpg`, from: [.36, .26], to: [.6, .34] },
  { label: 'PARALLAX ARRAY', src: `${MEDIA}/flashback-flooded.jpg`, from: [.62, .3], to: [.42, .36] },
  { label: 'THE FRONT LINE', src: '/assets/device-reel-wasteland-20261021-poster.jpg', from: [.4, .34], to: [.54, .28] },
  { label: 'YOUR PACKS', src: `${MEDIA}/flashback-antenna.jpg`, from: [.5, .36], to: [.6, .3] },
] as const
/** The closing still is portrait; `focus` is the Console's screen, where the lights come up from. */
const DESK = { label: 'YOUR DESK', src: `${MEDIA}/console-desk.jpg`, focus: [.564, .29] }
const CUTS = [760, 680, 600, 540, 480, 420, 380, 340]
const FLASHBACK_DELAY = 400
const LIGHTS_UP = 1100
/** Memories cover only the upper part of the screen, where the torch travels, so stills are never blown up past ~1.5×. */
const MEMORY_ZONE = .62
const MEMBER_FACES = 24

export function JoinPage({ state, members, warm, legacy, onExplore, onPacks }: {
  state: PageState; members: InitiationPublicMember[]; warm: boolean; legacy: boolean; onExplore: () => void; onPacks: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const index = useRef<HTMLElement>(null)
  const title = useRef<HTMLSpanElement>(null)
  const faces = useRef<HTMLDivElement>(null)
  // Members with a picture first; the rest fill in with their initials.
  const crowd = [...members.filter(member => member.avatarUrl), ...members.filter(member => !member.avatarUrl)].slice(0, MEMBER_FACES)
  // Warm the cache once the briefing is well under way, so the first cuts are never empty.
  useEffect(() => { if (warm) for (const src of [...MEMORIES.map(memory => memory.src), DESK.src]) if (src) new Image().src = src }, [warm])
  useScene(state.active, (scene, reduced) => {
    const { ctx, w, h } = fitCanvas(canvas.current!)
    const memories = MEMORIES.map(memory => { if (!memory.src) return null; const image = new Image(); image.src = memory.src; return image })
    const desk = new Image()
    desk.src = DESK.src
    const zone = h * MEMORY_ZONE
    const dots = Array.from({ length: 110 }, () => ({ x: Math.random() * w, y: Math.random() * zone, size: .8 + Math.random() * 1.4, alpha: .2 + Math.random() * .5 }))
    // The members' faces scatter over a loose grid and drift upward through their cut.
    const columns = 4, rows = Math.max(1, Math.ceil(crowd.length / columns))
    const people = crowd.map((member, i) => ({
      member, picture: faces.current!.querySelector<HTMLImageElement>(`[data-member="${CSS.escape(member.id)}"] img`),
      x: ((i % columns) + .5 + (Math.random() - .5) * .5) / columns * w,
      y: (Math.floor(i / columns) + .5 + (Math.random() - .5) * .4) / rows * zone * .9 + zone * .08,
      size: 40 + Math.random() * 22,
    }))
    const ready = (image: HTMLImageElement | null) => !!image && image.complete && image.naturalWidth > 0
    let shown = -1
    const label = (k: number) => {
      if (k === shown) return
      shown = k
      index.current!.textContent = String(k + 1).padStart(2, '0')
      title.current!.textContent = k < MEMORIES.length ? MEMORIES[k].label : DESK.label
    }
    // The zone's lower edge melts into the black page, like the torch's own soft rim.
    const fadeZone = () => {
      const edge = ctx.createLinearGradient(0, zone * .72, 0, zone)
      edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, '#000')
      ctx.fillStyle = edge; ctx.fillRect(0, zone * .72, w, zone * .28)
      ctx.fillStyle = '#000'; ctx.fillRect(0, zone, w, h - zone)
    }
    const drawMembers = (u: number) => {
      for (const dot of dots) { ctx.fillStyle = `rgba(${STAR},${dot.alpha})`; ctx.fillRect(dot.x, dot.y, dot.size, dot.size) }
      ctx.font = '700 14px "Courier Prime", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      for (const person of people) {
        const r = person.size / 2, x = person.x, y = person.y - u * 18
        ctx.save()
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip()
        ctx.fillStyle = '#10162D'; ctx.fillRect(x - r, y - r, r * 2, r * 2)
        if (ready(person.picture)) {
          const image = person.picture!, side = Math.min(image.naturalWidth, image.naturalHeight)
          ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, x - r, y - r, r * 2, r * 2)
        } else {
          ctx.fillStyle = '#F2783E'; ctx.fillText(memberInitials(person.member.displayName), x, y + 1)
        }
        ctx.restore()
        ctx.strokeStyle = `rgba(${STAR},.3)`; ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke()
      }
    }
    // Each memory covers the upper zone at close to its own resolution and pans a little across its cut.
    const drawMemory = (k: number, u: number) => {
      const image = memories[k]
      if (!image) { drawMembers(u); fadeZone(); return }
      if (!ready(image)) return
      const scale = Math.max(w / image.naturalWidth, zone / image.naturalHeight) * 1.04
      const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale
      ctx.drawImage(image, lerp(0, w - iw, lerp(.35, .65, u)), (zone - ih) / 2, iw, ih)
      fadeZone()
    }
    const deskFrame = (push: number) => {
      const scale = Math.max(w / desk.naturalWidth, h / desk.naturalHeight)
      const iw = desk.naturalWidth * scale, ih = desk.naturalHeight * scale
      return { x: (w - iw) / 2 + DESK.focus[0] * iw, y: DESK.focus[1] * ih, iw: iw * push, ih: ih * push }
    }
    // The Console stands at the top of the frame; the desk runs down behind the copy. It slowly pushes in once the lights are up.
    const drawDesk = (push: number) => {
      if (!ready(desk)) return
      const { x, y, iw, ih } = deskFrame(push)
      ctx.drawImage(desk, x - DESK.focus[0] * iw, y - DESK.focus[1] * ih, iw, ih)
    }
    const torch = (x: number, y: number, r: number, dark: number) => {
      ctx.fillStyle = `rgba(8,12,32,${dark})`
      ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.arc(x, y, r, 0, Math.PI * 2, true); ctx.fill()
      const soft = ctx.createRadialGradient(x, y, r * .55, x, y, r)
      soft.addColorStop(0, 'rgba(8,12,32,0)'); soft.addColorStop(1, `rgba(8,12,32,${dark})`)
      ctx.fillStyle = soft; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    }
    const settled = (since: number) => {
      ctx.clearRect(0, 0, w, h)
      drawDesk(1 + .05 * (1 - Math.cos(since / 18000 * Math.PI)) / 2)
      ctx.fillStyle = 'rgba(8,12,32,.5)'; ctx.fillRect(0, 0, w, h)
    }
    if (reduced) {
      label(MEMORIES.length)
      settled(0)
      if (!ready(desk)) scene.listen(desk, 'load', () => settled(0))
      return
    }
    const radius = Math.min(170, w * .42)
    const ends = CUTS.map((_, k) => FLASHBACK_DELAY + CUTS.slice(0, k + 1).reduce((a, b) => a + b, 0))
    const flashback = ends[ends.length - 1]
    label(0)
    scene.loop(t => {
      if (t >= flashback + LIGHTS_UP) { settled(t - flashback - LIGHTS_UP); return }
      ctx.clearRect(0, 0, w, h)
      if (t < FLASHBACK_DELAY) return
      if (t >= flashback) {
        // Lights up: the torch opens from the Console's screen until the whole desk shows under an even scrim.
        label(MEMORIES.length)
        const u = ease(clamp((t - flashback) / LIGHTS_UP))
        drawDesk(1)
        const focus = deskFrame(1)
        torch(focus.x, focus.y, lerp(radius * .6, Math.hypot(w, h), u), .86)
        ctx.fillStyle = `rgba(8,12,32,${.5 * u})`; ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = `rgba(0,0,0,${1 - clamp((t - flashback) / 260)})`; ctx.fillRect(0, 0, w, h)
        return
      }
      const k = ends.findIndex(end => t < end), memory = MEMORIES[k]
      const u = clamp((t - (ends[k] - CUTS[k])) / CUTS[k])
      label(k)
      drawMemory(k, u)
      torch(lerp(memory.from[0], memory.to[0], u) * w, lerp(memory.from[1], memory.to[1], u) * h, radius, .86)
      // The lamp: every cut rises out of the dark and falls back into it before the next.
      const lamp = u < .3 ? 1 - u / .3 : u > .8 ? (u - .8) / .2 : 0
      ctx.fillStyle = `rgba(0,0,0,${lamp})`; ctx.fillRect(0, 0, w, h)
    })
  })
  return <BriefingPage state={state} className={s.p9} label="Briefing complete">
    <canvas ref={canvas} className={s.fx} data-briefing-target="media" role="img"
      aria-label="A flashback through the briefing under a torch: the Console, a robot library, the members' faces, the Voyager badge, the classified archive, a flooded world, the front line and the packs, ending on a Multiverse Console on a desk with a Voyager badge and an envelope." />
    <div ref={faces} className={s.p9Faces} aria-hidden>
      {crowd.map(member => member.avatarUrl && <span key={member.id} data-member={member.id}><SmartImage src={member.avatarUrl} alt="" sizes="64px" width={64} height={64} preload /></span>)}
    </div>
    <p className={s.p9Tag} aria-hidden><b ref={index}>01</b> · <span ref={title}>{MEMORIES[0].label}</span></p>
    <div className={`${s.p9Content} ${s.gut}`}>
      <Kicker text="BRIEFING COMPLETE" />
      <Headline text="Now you know the Collective." large base={800} />
      <p className={`${s.p9Lede} ${s.rise}`} style={rise(1500)}>{legacy ? 'Look around first, or activate the rest of your packs.' : 'Look around first, or start your Voyager Packs.'}</p>
      <div className={`${s.p9Actions} ${s.rise}`} style={rise(1900)}>
        <Link className={s.p9Action} href="/console" onClick={onExplore}>Explore the Collective <ArrowRight size={18} aria-hidden /></Link>
        <button type="button" className={s.p9Action} onClick={onPacks}>{legacy ? 'Activate Packs 3–4' : 'Get the Voyager Packs'} <ArrowRight size={18} aria-hidden /></button>
      </div>
    </div>
  </BriefingPage>
}
