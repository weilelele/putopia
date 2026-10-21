'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'
import { BRIEFING_SOUND_KEY, BRIEFING_THEME, briefingLoopWindow, briefingSoundOn } from '@/lib/initiation-briefing'

const FADE_IN = 2, FADE_OUT = .4
// Browsers only let audio start inside one of these; the first that lands in the briefing starts the theme.
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'] as const

const subscribeNever = () => () => {}
function readStored() {
  try { return localStorage.getItem(BRIEFING_SOUND_KEY) } catch { return null }
}
const serverStored = () => null

type ThemePlayer = { want: (on: boolean) => void; sync: () => void; hidden: (hidden: boolean) => void; dispose: () => void }

/** Decodes the theme once and loops it gaplessly through Web Audio (an <audio loop> leaves a gap at the MP3 seam). */
function createThemePlayer(): ThemePlayer | null {
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Context) return null
  const ctx = new Context()
  const gain = ctx.createGain()
  gain.gain.value = 0
  gain.connect(ctx.destination)
  const abort = new AbortController()
  let buffer: AudioBuffer | null = null, source: AudioBufferSourceNode | null = null
  let wanted = false, closed = false, quiet = 0

  const ramp = (to: number, seconds: number) => {
    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(to, now + seconds)
  }
  const sync = () => {
    if (closed) return
    clearTimeout(quiet)
    if (!wanted) {
      if (ctx.state !== 'running') return
      ramp(0, FADE_OUT)
      quiet = window.setTimeout(() => { if (!wanted && !closed) void ctx.suspend() }, FADE_OUT * 1000 + 50)
      return
    }
    if (document.hidden) return
    // A suspended context resumes only inside a gesture (or after one on this site); `statechange` calls back here.
    if (ctx.state !== 'running') { void ctx.resume().catch(() => {}); return }
    if (!buffer) return
    if (!source) {
      const { start, end } = briefingLoopWindow(buffer.getChannelData(0), buffer.sampleRate, BRIEFING_THEME.loopSeconds)
      source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      source.loopStart = start
      source.loopEnd = end
      source.connect(gain)
      source.start(0, start)
    }
    ramp(BRIEFING_THEME.volume, FADE_IN)
  }
  ctx.addEventListener('statechange', sync)
  fetch(BRIEFING_THEME.src, { signal: abort.signal })
    .then(response => response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status))))
    .then(data => ctx.decodeAudioData(data))
    .then(decoded => { buffer = decoded; sync() })
    .catch(() => { /* The briefing works without its soundtrack. */ })

  return {
    want(on) { wanted = on; sync() },
    sync,
    hidden(hidden) {
      if (!hidden) { sync(); return }
      gain.gain.cancelScheduledValues(ctx.currentTime)
      gain.gain.value = 0
      if (ctx.state === 'running') void ctx.suspend()
    },
    dispose() {
      if (ctx.state === 'running') ramp(0, FADE_OUT)
      closed = true
      clearTimeout(quiet)
      abort.abort()
      ctx.removeEventListener('statechange', sync)
      window.setTimeout(() => void ctx.close().catch(() => {}), FADE_OUT * 1000 + 50)
    },
  }
}

/** The briefing's background theme: on by default, faded in by the first gesture, and silenced for good once muted here. */
export function useBriefingSound(root: RefObject<HTMLElement | null>) {
  const stored = useSyncExternalStore(subscribeNever, readStored, serverStored)
  const [choice, setChoice] = useState<boolean | null>(null)
  const on = choice ?? briefingSoundOn(stored)
  const player = useRef<ThemePlayer | null>(null)

  useEffect(() => {
    const element = root.current
    const theme = element && createThemePlayer()
    if (!element || !theme) return
    player.current = theme
    // The toggle decides for itself, so tapping it first never starts the music it is about to mute.
    const gesture = (event: Event) => { if (!(event.target as Element | null)?.closest?.('[data-sound-toggle]')) theme.sync() }
    const visibility = () => theme.hidden(document.hidden)
    GESTURES.forEach(type => element.addEventListener(type, gesture, true))
    document.addEventListener('visibilitychange', visibility)
    return () => {
      GESTURES.forEach(type => element.removeEventListener(type, gesture, true))
      document.removeEventListener('visibilitychange', visibility)
      theme.dispose()
      player.current = null
    }
  }, [root])

  useEffect(() => { player.current?.want(on) }, [on])

  /** Runs inside the click, which is what lets a muted-then-unmuted context resume. */
  function toggle() {
    const next = !on
    player.current?.want(next)
    setChoice(next)
    try { localStorage.setItem(BRIEFING_SOUND_KEY, next ? 'on' : 'off') } catch { /* Storage is a convenience only. */ }
    return next
  }

  return { on, toggle }
}
