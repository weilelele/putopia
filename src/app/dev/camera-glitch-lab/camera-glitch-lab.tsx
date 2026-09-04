'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { buildCameraEmbedUrl, type DeviceCameraSource } from '@/lib/device-camera'
import styles from './camera-glitch-lab.module.css'

type EffectId = 'clean' | 'signal-decay' | 'chromatic' | 'glitch-art' | 'static-noise'
type Settings = {
  strength: number
  jitter: number
  noise: number
  scanlines: number
  colorShift: number
  flutter: number
  interval: number
  duration: number
}

const subscribe = () => () => {}
const originSnapshot = () => window.location.origin
const serverOriginSnapshot = () => ''
const presets: Record<EffectId, { label: string; note: string; settings: Settings }> = {
  clean: { label: 'CLEAN', note: 'Untreated reference frame.', settings: { strength: 0, jitter: 0, noise: 0, scanlines: 0, colorShift: 0, flutter: 0, interval: 60, duration: 920 } },
  'signal-decay': { label: 'SIGNAL DECAY', note: 'Full-frame grain, scan loss and unstable contrast.', settings: { strength: 58, jitter: 4, noise: 34, scanlines: 30, colorShift: 10, flutter: 12, interval: 42, duration: 980 } },
  chromatic: { label: 'CHROMATIC', note: 'Offset colour ghosting with a saturated signal wash.', settings: { strength: 64, jitter: 7, noise: 16, scanlines: 10, colorShift: 62, flutter: 9, interval: 36, duration: 760 } },
  'glitch-art': { label: 'GLITCH ART', note: 'Horizontal frame tearing, colour ghosting and hard jumps.', settings: { strength: 82, jitter: 14, noise: 28, scanlines: 16, colorShift: 48, flutter: 20, interval: 48, duration: 1120 } },
  'static-noise': { label: 'STATIC NOISE', note: 'Heavy full-frame static over a drained signal.', settings: { strength: 74, jitter: 3, noise: 56, scanlines: 38, colorShift: 6, flutter: 18, interval: 28, duration: 880 } },
}
const controls: { key: keyof Settings; label: string; min: number; max: number; step: number; suffix: string }[] = [
  { key: 'strength', label: 'EFFECT STRENGTH', min: 0, max: 100, step: 1, suffix: '%' },
  { key: 'jitter', label: 'FRAME JITTER', min: 0, max: 16, step: 1, suffix: 'px' },
  { key: 'noise', label: 'NOISE', min: 0, max: 60, step: 1, suffix: '%' },
  { key: 'scanlines', label: 'SCANLINES', min: 0, max: 60, step: 1, suffix: '%' },
  { key: 'colorShift', label: 'COLOUR SHIFT', min: 0, max: 100, step: 1, suffix: '%' },
  { key: 'flutter', label: 'FLUTTER', min: 0, max: 40, step: 1, suffix: '%' },
  { key: 'interval', label: 'BURST INTERVAL', min: 5, max: 120, step: 1, suffix: 's' },
  { key: 'duration', label: 'BURST DURATION', min: 200, max: 2000, step: 20, suffix: 'ms' },
]

export function CameraGlitchLab({ source }: { source: DeviceCameraSource }) {
  const parentOrigin = useSyncExternalStore(subscribe, originSnapshot, serverOriginSnapshot)
  const [effect, setEffect] = useState<EffectId>('signal-decay')
  const [settings, setSettings] = useState<Settings>(presets['signal-decay'].settings)
  const [burst, setBurst] = useState(false)
  const [automatic, setAutomatic] = useState(true)
  const [rendererQuality, setRendererQuality] = useState('starting')
  const iframe = useRef<HTMLIFrameElement>(null)
  const previewStart = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const previewFinish = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => {
    clearTimeout(previewStart.current)
    clearTimeout(previewFinish.current)
  }, [])

  useEffect(() => {
    if (!automatic || effect === 'clean') return
    let trigger: ReturnType<typeof setTimeout>
    let finish: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      trigger = setTimeout(() => {
        setBurst(true)
        finish = setTimeout(() => { setBurst(false); schedule() }, settings.duration)
      }, settings.interval * 1000)
    }
    schedule()
    return () => { clearTimeout(trigger); clearTimeout(finish) }
  }, [automatic, effect, settings.duration, settings.interval])

  const iframeUrl = useMemo(() => (parentOrigin ? buildCameraEmbedUrl(source, parentOrigin, { effects: true }) : ''), [parentOrigin, source])
  const effectMessage = useMemo(
    () => ({
      type: 'cosmo.embed.effects',
      version: 1,
      channelId: source.binding.channelId,
      bandId: source.binding.bandId,
      effect,
      strength: settings.strength,
      jitter: settings.jitter,
      noise: settings.noise,
      scanlines: settings.scanlines,
      colorShift: settings.colorShift,
      flutter: settings.flutter,
      burst,
    }),
    [burst, effect, settings, source.binding.bandId, source.binding.channelId],
  )
  const sendEffects = useCallback(() => {
    iframe.current?.contentWindow?.postMessage(effectMessage, source.embedOrigin)
  }, [effectMessage, source.embedOrigin])
  useEffect(sendEffects, [sendEffects])
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== source.embedOrigin || event.source !== iframe.current?.contentWindow) return
      const message = event.data as Record<string, unknown> | null
      if (message?.type === 'cosmo.embed.effects-status' && message.version === 1 && message.channelId === source.binding.channelId && message.bandId === source.binding.bandId && typeof message.quality === 'string') setRendererQuality(message.quality)
      if (message?.type === 'cosmo.embed.status' && message.version === 1) sendEffects()
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [sendEffects, source.binding.bandId, source.binding.channelId, source.embedOrigin])
  const output = JSON.stringify({ renderer: 'webgl-auto', effect, ...settings }, null, 2)

  function chooseEffect(id: EffectId) {
    setEffect(id)
    setSettings(presets[id].settings)
    setBurst(false)
  }

  function previewBurst() {
    clearTimeout(previewStart.current)
    clearTimeout(previewFinish.current)
    setBurst(false)
    previewStart.current = setTimeout(() => {
      setBurst(true)
      previewFinish.current = setTimeout(() => setBurst(false), settings.duration)
    }, 0)
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><span>LOCAL DEVELOPMENT TOOL</span><h1>CAMERA GLITCH LAB</h1></div>
      <p>REAL COSMO EMBED · 宇宙飞船舱 · SETTINGS ARE NOT SAVED</p>
    </header>

    <section className={styles.stage}>
      {iframeUrl ? <iframe allow="autoplay" className={styles.embed} referrerPolicy="no-referrer"
        onLoad={sendEffects} ref={iframe} sandbox="allow-scripts allow-same-origin" src={iframeUrl}
        title="Cosmo WebGL glitch preview" /> : null}
      <span className={styles.badge}>PREVIEW · {presets[effect].label} · {rendererQuality.toUpperCase()}</span>
    </section>

    <section className={styles.workspace}>
      <div className={styles.presets}>
        <h2>EFFECT</h2>
        <div className={styles.presetGrid}>
          {(Object.keys(presets) as EffectId[]).map((id) => <button aria-pressed={effect === id}
            className={styles.preset} key={id} onClick={() => chooseEffect(id)} type="button">
            <strong>{presets[id].label}</strong><span>{presets[id].note}</span>
          </button>)}
        </div>
      </div>

      <div className={styles.parameters}>
        <div className={styles.sectionHead}><h2>PARAMETERS</h2><span>{automatic ? 'AUTO BURST ON' : 'AUTO BURST OFF'}</span></div>
        <div className={styles.controlGrid}>
          {controls.map((control) => <ArchiveField htmlFor={`glitch-${control.key}`} key={control.key} label={control.label}>
            <div className={styles.rangeRow}><input id={`glitch-${control.key}`} max={control.max} min={control.min}
              onChange={(event) => setSettings((current) => ({ ...current, [control.key]: Number(event.target.value) }))}
              step={control.step} type="range" value={settings[control.key]} />
              <output htmlFor={`glitch-${control.key}`}>{settings[control.key]}{control.suffix}</output></div>
          </ArchiveField>)}
        </div>
        <div className={styles.actions}>
          <ArchiveButton onClick={previewBurst}>TRIGGER BURST</ArchiveButton>
          <ArchiveButton aria-pressed={automatic} onClick={() => setAutomatic((value) => !value)} variant="secondary">{automatic ? 'STOP AUTO BURST' : 'START AUTO BURST'}</ArchiveButton>
        </div>
      </div>

      <div className={styles.output}>
        <h2>SELECTED CONFIGURATION</h2>
        <pre>{output}</pre>
        <p>Share this JSON when you choose a direction. Applying it to Device remains a separate reviewed change.</p>
      </div>
    </section>
  </main>
}
