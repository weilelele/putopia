'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import type { McFunction, McFunctionStatus } from '@/types/database'
import { ArchiveSheet } from './archive-sheet'
import SmartImage from './smart-image'
import styles from './mc-console-panel.module.css'

const WORLDS = [
  { file: 'meadow', name: 'The quiet meadow', position: '25% center' },
  { file: 'library', name: 'The forgotten library', position: '85% center' },
  { file: 'night', name: 'A world after dark', position: 'center' },
]
const STATUS: Record<McFunctionStatus, string> = { active: 'Active', in_development: 'In development', unknown: 'Unconfirmed' }
const DETAILS: Record<string, string> = {
  'Worlds Detection': 'Tune into signals and observe scenes from parallel worlds.',
  'Audio Collection': 'Receive sounds from the other side and send sound back.',
  'Quantum Discharge': 'Send energy into a connected world.',
  'Inner Voice': 'Attempt to receive the inner voices of intelligent life in other worlds.',
}

export function McConsolePanel({ mcFunctions }: { mcFunctions: McFunction[] }) {
  const [guideOpen, setGuideOpen] = useState(false)
  const [frame, setFrame] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(true)
  const stage = useRef<HTMLDivElement>(null)
  const worldIndex = ((frame % WORLDS.length) + WORLDS.length) % WORLDS.length
  const world = WORLDS[worldIndex]

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(preference.matches)
    sync()
    preference.addEventListener('change', sync)
    return () => preference.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (paused || reducedMotion || guideOpen) return
    let visible = false
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    if (stage.current) observer.observe(stage.current)
    const timer = setInterval(() => {
      if (visible && !document.hidden) setFrame(value => value + 1)
    }, 6500)
    return () => { observer.disconnect(); clearInterval(timer) }
  }, [paused, reducedMotion, guideOpen])

  function move(direction: number) {
    setPaused(true)
    setFrame(value => value + direction)
  }

  return (
    <section className={styles.panel} aria-label="About the Multiverse Console">
      <div className={styles.layout}>
        <header className={styles.heading}>
          <h2>Multiverse Console</h2>
          <p className={styles.intro}>This device is an exclusive asset of our Collective — the instrument we use to explore this world.</p>
          <p className={styles.description}>Tune into parallel worlds. Watch their scenes. Listen and send sound.</p>
        </header>
        <div className={styles.viewer}>
          <div ref={stage} className={styles.device} role="img" aria-label={`Multiverse Console showing ${world.name}`}>
            <SmartImage src="/assets/console-intro/device.png" alt="" width={1536} height={1024} sizes="(min-width: 768px) 480px, 100vw" preload className={styles.deviceImage} />
            <div className={styles.screen} aria-hidden="true">
              {WORLDS.map((item, index) => (
                <SmartImage key={item.file} src={`/assets/console-intro/${item.file}.webp`} alt="" width={640} height={640} sizes="180px" className={styles.world} style={{ opacity: index === worldIndex ? 1 : 0, objectPosition: item.position }} />
              ))}
              {frame !== 0 && !reducedMotion && <span key={frame} className={styles.interference} />}
            </div>
          </div>
          <div className={styles.controls}>
            <button type="button" onClick={() => move(-1)} aria-label="Previous world"><ChevronLeft size={18} /></button>
            <span>{world.name}</span>
            {!reducedMotion && <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Play world previews' : 'Pause world previews'}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>}
            <button type="button" onClick={() => move(1)} aria-label="Next world"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>
      <button className={styles.guideButton} type="button" onClick={() => setGuideOpen(true)} aria-haspopup="dialog">How the Console works <ArrowRight size={18} aria-hidden /></button>
      <ArchiveSheet open={guideOpen} onClose={() => setGuideOpen(false)} title="How the Console works">
        <div className={styles.guide}>
          <p>The Console is our instrument for exploring parallel worlds.</p>
          <h3>How to explore</h3>
          <ol className={styles.steps}>
            <li><h4>Find a signal</h4><p>Turn the dial to search for a parallel world.</p></li>
            <li><h4>Observe a world</h4><p>Watch the scene through the central circular screen.</p></li>
            <li><h4>Try to make contact</h4><p>Listen to sounds from the other side and send sound back.</p></li>
          </ol>
          <h3>Console capabilities</h3>
          {mcFunctions.length ? <ul className={styles.functions}>{mcFunctions.map(fn => <li key={fn.id}><div><h4>{fn.name}</h4><span>{STATUS[fn.status]}</span></div>{DETAILS[fn.name] && <p>{DETAILS[fn.name]}</p>}</li>)}</ul> : <p>Capability details are currently unavailable. Please check back soon.</p>}
          <p className={styles.note}>Each batch records devices detected and found in one place. Follow its field records to learn what has been discovered.</p>
        </div>
      </ArchiveSheet>
    </section>
  )
}
