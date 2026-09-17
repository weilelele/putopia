'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Plus, HelpCircle } from 'lucide-react'
import type { McFunction } from '@/types/database'
import { ArchiveSheet } from './archive-sheet'
import SmartImage from './smart-image'
import styles from './mc-console-panel.module.css'

const WORLDS = [
  { file: 'library', position: '85% center' },
  { file: 'meadow', position: '0% center' },
  { file: 'night', position: 'center' },
]
const DETAILS: Record<string, string> = {
  'Worlds Detection': 'Observe parallel worlds.',
  'Audio Collection': 'Receive and send sound.',
}

/** Procedural signal noise, confined to the physical screen. */
function SignalSnow({ animated }: { animated: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    const pixels = context.createImageData(180, 180)
    const draw = () => {
      for (let i = 0; i < pixels.data.length; i += 4) {
        const tone = 35 + Math.floor(Math.random() * 180)
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = tone
        pixels.data[i + 3] = 255
      }
      context.putImageData(pixels, 0, 0)
    }
    draw()
    if (!animated) return
    const timer = setInterval(draw, 120)
    return () => clearInterval(timer)
  }, [animated])
  return <canvas ref={canvas} width={180} height={180} className={styles.snow} aria-hidden="true" />
}

export function McConsolePanel({ mcFunctions }: { mcFunctions: McFunction[] }) {
  const [guideOpen, setGuideOpen] = useState(false)
  const [frame, setFrame] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(true)
  const [visible, setVisible] = useState(false)
  const [foreground, setForeground] = useState(true)
  const stage = useRef<HTMLDivElement>(null)
  const snow = frame % 2 === 0
  const worldIndex = Math.floor(frame / 2) % WORLDS.length
  const running = visible && foreground && !guideOpen && !reducedMotion

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(preference.matches)
    const visibility = () => setForeground(!document.hidden)
    sync()
    visibility()
    preference.addEventListener('change', sync)
    document.addEventListener('visibilitychange', visibility)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    if (stage.current) observer.observe(stage.current)
    return () => {
      observer.disconnect()
      preference.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  useEffect(() => {
    if (!running) return
    const timer = setTimeout(() => setFrame(value => (value + 1) % (WORLDS.length * 2)), snow ? 1400 : 6500)
    return () => clearTimeout(timer)
  }, [frame, snow, running])

  const groups = [
    { title: 'Confirmed', functions: mcFunctions.filter(fn => fn.status === 'active'), confirmed: true },
    { title: 'Unconfirmed', functions: mcFunctions.filter(fn => fn.status !== 'active'), confirmed: false },
  ]

  return (
    <section className={styles.panel} aria-label="About the Multiverse Console">
      <header className={styles.heading}>
        <h2>Multiverse<br />Console</h2>
        <p>Our collective&apos;s exclusive instrument for exploring parallel worlds.</p>
      </header>
      <div ref={stage} className={styles.device} role="img" aria-label="Multiverse Console in an archival workshop, receiving signals from parallel worlds">
        <SmartImage src="/assets/console-intro/scene.webp" alt="" width={1536} height={864} sizes="(min-width: 768px) 960px, 100vw" preload className={styles.deviceImage} />
        <div className={styles.screen} aria-hidden="true">
          {WORLDS.map((world, index) => <SmartImage key={world.file} src={`/assets/console-intro/${world.file}.webp`} alt="" width={640} height={640} sizes="(min-width: 768px) 320px, 130px" className={styles.world} style={{ opacity: !snow && index === worldIndex ? 1 : 0, objectPosition: world.position }} />)}
          {snow && <SignalSnow animated={running} />}
        </div>
      </div>
      <button className={styles.guideButton} type="button" onClick={() => setGuideOpen(true)} aria-haspopup="dialog">Explore the function <Plus size={20} aria-hidden /></button>
      <ArchiveSheet open={guideOpen} onClose={() => setGuideOpen(false)} title="Console functions" className={styles.functionModal}>
        {mcFunctions.length ? groups.map(group => <section className={styles.group} key={group.title} aria-label={group.title}>
          <h3>{group.title}</h3>
          {group.functions.length ? <ul>{group.functions.map(fn => <li key={fn.id}>
            {group.confirmed ? <span className={styles.confirmedIcon}><Check size={19} aria-hidden /></span> : <HelpCircle className={styles.unknownIcon} size={32} aria-hidden />}
            <div><h4>{fn.name}</h4><p>{group.confirmed ? (DETAILS[fn.name] || 'Confirmed capability.') : fn.status === 'in_development' ? 'In development' : 'Unconfirmed'}</p></div>
          </li>)}</ul> : <p>No functions recorded in this category.</p>}
        </section>) : <p>Function details are currently unavailable.</p>}
      </ArchiveSheet>
    </section>
  )
}
