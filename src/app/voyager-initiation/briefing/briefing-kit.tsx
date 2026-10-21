'use client'

import { Fragment, useEffect, useEffectEvent, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import s from './briefing.module.css'

/** Everything a page scene schedules belongs to that activation and stops when the page changes. */
export type Scene = {
  later: (fn: () => void, ms: number) => void
  every: (fn: () => void, ms: number) => void
  loop: (draw: (t: number) => void) => void
  listen: (target: EventTarget, type: string, fn: () => void) => void
  alive: () => boolean
}

const REDUCED = '(prefers-reduced-motion: reduce)'
function subscribeReduced(notify: () => void) {
  const media = matchMedia(REDUCED)
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}
export function useReducedMotion() {
  return useSyncExternalStore(subscribeReduced, () => matchMedia(REDUCED).matches, () => false)
}

export function useScene(active: boolean, run: (scene: Scene, reduced: boolean) => void | (() => void)) {
  const start = useEffectEvent(run)
  useEffect(() => {
    if (!active) return
    let alive = true
    const timers = new Set<number>()
    const intervals = new Set<number>()
    const listeners: [EventTarget, string, () => void][] = []
    const scene: Scene = {
      later(fn, ms) { const id = window.setTimeout(() => { timers.delete(id); if (alive) fn() }, ms); timers.add(id) },
      every(fn, ms) { intervals.add(window.setInterval(() => { if (alive) fn() }, ms)) },
      loop(draw) {
        const begin = performance.now()
        // rAF timestamps are frame starts and can precede `begin`; scenes always see a non-negative clock.
        const tick = (now: number) => { if (!alive) return; draw(Math.max(0, now - begin)); requestAnimationFrame(tick) }
        requestAnimationFrame(tick)
      },
      listen(target, type, fn) { const wrapped = () => { if (alive) fn() }; target.addEventListener(type, wrapped); listeners.push([target, type, wrapped]) },
      alive: () => alive,
    }
    const cleanup = start(scene, matchMedia(REDUCED).matches)
    return () => {
      alive = false
      timers.forEach(id => clearTimeout(id))
      intervals.forEach(id => clearInterval(id))
      listeners.forEach(([target, type, fn]) => target.removeEventListener(type, fn))
      cleanup?.()
    }
  }, [active])
}

/** Videos carry their source in data-src and only hold a network connection while they are needed. */
export function attachVideo(video: HTMLVideoElement) {
  video.muted = true
  const src = video.dataset.src
  if (src && video.getAttribute('src') !== src) { video.src = src; video.load() }
}
export function releaseVideo(video: HTMLVideoElement) {
  video.pause()
  if (video.getAttribute('src')) { video.removeAttribute('src'); video.load() }
}

export function fitCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.max(1, Math.round(rect.width * dpr))
  canvas.height = Math.max(1, Math.round(rect.height * dpr))
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, w: rect.width, h: rect.height }
}

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
export const ease = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export type PageState = { active: boolean; leaving: boolean; dir: number; visit: number }

export function BriefingPage({ state, className, label, children }: { state: PageState; className: string; label: string; children: ReactNode }) {
  return <section className={`${s.page} ${className}`} data-active={state.active || undefined} data-leaving={state.leaving || undefined}
    style={{ '--dir': state.dir } as CSSProperties} aria-label={label} aria-hidden={!state.active} inert={!state.active}>
    {children}
  </section>
}

export function Kicker({ text }: { text: string }) {
  return <p className={s.kicker} style={{ '--n': text.length } as CSSProperties}>{text}</p>
}

/** Words rise one by one; screen readers get the sentence once. */
export function Headline({ text, large = false, base }: { text: string; large?: boolean; base?: number }) {
  return <h2 className={`${s.headline} ${large ? s.headlineLarge : ''}`} aria-label={text} style={base === undefined ? undefined : { '--base': `${base}ms` } as CSSProperties}>
    {text.split(' ').map((word, index) => <Fragment key={index}>{index > 0 && ' '}<span className={s.word} aria-hidden><span style={{ '--i': index } as CSSProperties}>{word}</span></span></Fragment>)}
  </h2>
}

export function rise(delay: number): CSSProperties {
  return { '--d': `${delay}ms` } as CSSProperties
}
