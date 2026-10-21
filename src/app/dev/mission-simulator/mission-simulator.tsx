'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveSelect, ArchiveTextarea } from '@/components/archive-input'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { audioClarity, bandClarity, worldDefinitions } from '@/lib/mission-demo'
import { useMissionDemo } from '@/lib/mission-demo/store'
import { MissionEventFrame } from '@/lib/mission-demo/event-frame'
import styles from './simulator.module.css'

export function MissionSimulator() {
  const { state, dispatch, ready } = useMissionDemo()
  const [previewRuleId, setPreviewRuleId] = useState(40)
  const [bandId, setBandId] = useState('b1'), [text, setText] = useState(''), [charge, setCharge] = useState(0), [charged, setCharged] = useState(false)
  const [audioStatus, setAudioStatus] = useState('No recording. Transcript simulation is available.'), [recording, setRecording] = useState(false), [hasAudio, setHasAudio] = useState(false)
  const [playback, setPlayback] = useState(false), [peak, setPeak] = useState(false), [chargeTarget, setChargeTarget] = useState('')
  const chargeStart = useRef<number | null>(null), chargeTimer = useRef<ReturnType<typeof setInterval> | null>(null), recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), recordingBlob = useRef<Blob | null>(null), context = useRef<AudioContext | null>(null), peakTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const world = worldDefinitions.find(w => w.id === state.activeWorldId) ?? worldDefinitions[0], ws = state.worlds[world.id], device = state.devices[state.activeDeviceId], personal = device.worlds[world.id]
  const available = world.bands.filter(b => personal.downlink >= b.unlockDownlink)
  const band = available.find(b => b.id === bandId) ?? available[0], clarity = bandClarity(band, personal.downlink), audio = audioClarity(world, personal.uplink)
  const currentTarget = `${world.id}:${device.id}:${band.id}`, isCharged = charged && chargeTarget === currentTarget
  useEffect(() => () => { if (chargeTimer.current) clearInterval(chargeTimer.current); if (peakTimer.current) clearTimeout(peakTimer.current); stream.current?.getTracks().forEach(t => t.stop()); void context.current?.close() }, [])
  function cancelCharge() { if (chargeTimer.current) clearInterval(chargeTimer.current); chargeTimer.current = null; chargeStart.current = null; setCharge(0) }
  function disarm() { cancelCharge(); setCharged(false); setChargeTarget('') }
  function beginCharge() {
    if (!ready || band.remarks || device.energy < 1 || isCharged || chargeStart.current !== null) return
    setCharged(false); setChargeTarget(currentTarget)
    chargeStart.current = performance.now()
    chargeTimer.current = setInterval(() => { const progress = Math.min(100, (performance.now() - (chargeStart.current ?? performance.now())) / 30); setCharge(progress); if (progress >= 100) { if (chargeTimer.current) clearInterval(chargeTimer.current); chargeStart.current = null; setCharged(true) } }, 40)
  }
  async function record() {
    if (recording) { recorder.current?.stop(); return }
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Recording unavailable')
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks: BlobPart[] = [], rec = new MediaRecorder(stream.current); recorder.current = rec
      rec.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      rec.onstop = () => { recordingBlob.current = new Blob(chunks, { type: rec.mimeType }); setHasAudio(true); setRecording(false); stream.current?.getTracks().forEach(t => t.stop()); setAudioStatus('Recorded locally. Enter its transcript below; automatic speech recognition is not connected.') }
      rec.start(); setRecording(true); setHasAudio(false); recordingBlob.current = null; setAudioStatus('Recording locally. Stop before sending. Audio stays in this tab.')
    } catch { setAudioStatus('Microphone unavailable or permission denied. Use the clearly marked transcript simulation below.'); setRecording(false) }
  }
  async function playDistorted(clarityValue: number) {
    if (!recordingBlob.current || playback) return
    try {
      await context.current?.close(); const ctx = new AudioContext(); context.current = ctx
      const decoded = await ctx.decodeAudioData(await recordingBlob.current.arrayBuffer()), source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain()
      source.buffer = decoded; filter.type = 'lowpass'; filter.frequency.value = 350 + 7650 * clarityValue / 100; gain.gain.value = 0.15 + clarityValue / 150
      source.connect(filter).connect(gain).connect(ctx.destination)
      const noiseBuffer = ctx.createBuffer(1, decoded.length, decoded.sampleRate), data = noiseBuffer.getChannelData(0)
      const random = crypto.getRandomValues(new Uint32Array(4096))
      for (let i = 0; i < data.length; i++) data[i] = (random[i % random.length] / 4294967295 * 2 - 1) * (1 - clarityValue / 100) * 0.12
      const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer; noise.connect(ctx.destination); setPlayback(true)
      source.onended = () => { setPlayback(false); void ctx.close() }; await ctx.resume(); source.start(); noise.start()
    } catch { setPlayback(false); setAudioStatus('Audio playback is unavailable. Transcript simulation still uses the same clarity probability.') }
  }
  function launchTone() {
    try {
      const ctx = new AudioContext(), oscillator = ctx.createOscillator(), gain = ctx.createGain()
      oscillator.frequency.setValueAtTime(220, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.16)
      gain.gain.setValueAtTime(0.06, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      oscillator.connect(gain).connect(ctx.destination)
      oscillator.onended = () => { void ctx.close() }
      oscillator.start(); oscillator.stop(ctx.currentTime + 0.2)
    } catch { /* A blocked audio output does not change transmission settlement. */ }
  }
  function fire() {
    if (!isCharged || recording || band.remarks) return
    launchTone()
    dispatch({ type: 'send-energy', worldId: world.id, bandId: band.id, text }); disarm(); setPeak(true)
    if (peakTimer.current) clearTimeout(peakTimer.current); peakTimer.current = setTimeout(() => setPeak(false), 4000)
    if (recordingBlob.current && audio > 0) void playDistorted(audio)
  }
  const tx = state.lastTransmission
  const showPeak = peak && tx?.worldId === world.id && tx.deviceId === device.id
  const displayDownlink = showPeak ? Math.max(0, tx.before.downlink + (tx.after.downlink - tx.before.downlink) * 3) : personal.downlink
  const displayClarity = bandClarity(band, displayDownlink)
  return <main className={styles.page}>
    <ArchivePageHeader title="Mission simulator" action={<Link className={styles.link} href="/dev/mission-observe">Open Observe ↗</Link>} />
    <p className={styles.caption}>LOCAL DEMO · Same browser and origin only · No production services</p>
    {!ready && <p role="status">{state.feedback} Loading or browser storage unavailable.</p>}
    <div className={styles.columns}><section className={styles.player} aria-label="Console player">
      <ArchiveField htmlFor="world" label="World"><ArchiveSelect id="world" value={world.id} disabled={!ready} onChange={e => { disarm(); dispatch({ type: 'select-world', worldId: e.target.value }) }} >{worldDefinitions.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</ArchiveSelect></ArchiveField>
      <section className={styles.preview} aria-label="Rule previews"><h2>Preview a rule</h2><p>Choose a rule to see its image, settled values and Observe report immediately. Replaces this world’s test history.</p><ArchiveField htmlFor="preview-rule" label="Rule to preview"><ArchiveSelect id="preview-rule" value={previewRuleId} onChange={e => setPreviewRuleId(Number(e.target.value))}>{world.rules.map(rule => <option key={rule.id} value={rule.id}>#{rule.id} {rule.title}</option>)}</ArchiveSelect></ArchiveField><p>{world.rules.find(rule => rule.id === previewRuleId)?.body}</p><ArchiveButton disabled={!ready} onClick={() => { disarm(); setPeak(false); setBandId('b1'); dispatch({ type: 'preview-rule', worldId: world.id, ruleId: previewRuleId }) }}>Preview selected rule</ArchiveButton></section>
      <div className={styles.bandList} aria-label="Accessible Bands">{available.map(b => <ArchiveButton key={b.id} variant={b.id === band.id ? 'primary' : 'secondary'} aria-pressed={b.id === band.id} onClick={() => { disarm(); setBandId(b.id) }}>{b.name}</ArchiveButton>)}</div>
      {band.remarks ? <section className={styles.remarks}><h2>Remarks</h2><p>{world.description}</p>{ws.reports.length === 0 ? <p>No rule has produced a report yet. Explore an observation Band.</p> : ws.reports.map(r => <article key={r.id}><h3>{r.title}</h3><p>{r.body}</p><p className={styles.caption}>{r.userName} · {r.deviceId} · Rule {r.ruleId} · <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</time></p></article>)}</section> : <>
        <div className={styles.screen}><MissionEventFrame worldId={world.id} eventId={ws.currentEventId} title={ws.currentEventTitle} /><svg className={styles.noise} style={{ opacity: (100 - displayClarity) / 140 }} aria-hidden="true" viewBox="0 0 320 220"><filter id="mission-noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="8" /></filter><rect width="320" height="220" filter="url(#mission-noise)" /></svg></div>
        <p className={styles.caption}>Generated event still · Fixed reference camera across all Bands in this prototype. Event poses change; additional camera views and animation are not produced yet.</p>
        <h2>{ws.currentEventTitle}</h2><p>Shared event: {ws.currentEventId} · Actual image clarity {clarity}%{showPeak ? ` · transient display ${displayClarity}%` : ''}</p>
        <div className={styles.values}><p>Personal<br /><strong>↑ {personal.uplink} / ↓ {personal.downlink}</strong></p><p>Collective<br /><strong>↑ {ws.uplink} / ↓ {ws.downlink}</strong></p></div>
        {showPeak && <p role="status">Transient display ×3: ↑ {Math.max(0, tx.before.uplink + (tx.after.uplink - tx.before.uplink) * 3).toFixed(1)} / ↓ {Math.max(0, tx.before.downlink + (tx.after.downlink - tx.before.downlink) * 3).toFixed(1)}. Settles to actual values above after 4s. Never unlocks Bands.</p>}
        <p>Energy {device.energy}/10 · Audio {audio > 0 ? `${audio}% clarity` : `unavailable (needs uplink ${world.audioUnlock})`}</p>
        <p className={styles.caption}>Interference {personal.uplink >= world.interferenceUnlock ? 'available' : `needs ${world.interferenceUnlock}`} · Physical {personal.uplink >= world.physicalUnlock ? 'available' : `needs ${world.physicalUnlock}`}</p>
        <ArchiveField htmlFor="transcript" label="Transcript simulation (optional)" helpText="Text stands in for speech recognition, including recorded speech. Keyword parsing still uses audio clarity probability."><ArchiveTextarea id="transcript" rows={2} value={text} onChange={e => setText(e.target.value)} disabled={audio === 0} /></ArchiveField>
        <div className={styles.actions}><ArchiveButton variant="secondary" disabled={audio === 0} onClick={() => void record()}>{recording ? 'Stop recording' : 'Record locally'}</ArchiveButton><ArchiveButton variant="ghost" disabled={!hasAudio || playback || audio === 0} onClick={() => void playDistorted(audio)}>{playback ? 'Playing distortion…' : 'Hear distorted playback'}</ArchiveButton></div><p className={styles.caption} role="status">{audioStatus}</p>
        <ArchiveButton fullWidth disabled={!ready || device.energy < 1 || recording} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); beginCharge() }} onPointerUp={cancelCharge} onPointerCancel={disarm} onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); beginCharge() } }} onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cancelCharge() } }} onBlur={cancelCharge}>{isCharged ? 'Charged — ready to send' : `Hold to charge · ${Math.floor((chargeTarget === currentTarget ? charge : 0) / 100 * 3)} / 3 seconds`}</ArchiveButton>
        <progress className={styles.progress} aria-label="Three second charge" max={100} value={isCharged ? 100 : chargeTarget === currentTarget ? charge : 0} />
        <div className={styles.actions}><ArchiveButton disabled={!isCharged || !ready || recording || device.energy < 1} onClick={fire}>Send 1 energy</ArchiveButton><ArchiveButton variant="ghost" disabled={!isCharged} onClick={disarm}>Cancel charge</ArchiveButton></div>
        <p className={styles.caption}>Demo convention: hold 3s, release, then Send. Early release cancels without cost. Changing target cancels. Idle recovery: 1 energy per 60s, checked on next operation.</p>
      </>}
      <p role="status" aria-live="polite" className={styles.feedback}>{state.feedback}</p>
    </section><aside className={styles.testing} aria-label="Independent test tools"><h2>Test tools</h2><p>These tools accelerate or replace local state. They are not Console controls. Fixture loading clears both worlds and reports in every linked tab.</p>
      <ArchiveField htmlFor="device" label="Simulated identity"><ArchiveSelect id="device" value={device.id} disabled={!ready} onChange={e => { disarm(); dispatch({ type: 'select-device', deviceId: e.target.value }) }}>{Object.values(state.devices).map(d => <option key={d.id} value={d.id}>{d.name} · {d.userName}</option>)}</ArchiveSelect></ArchiveField>
      <ArchiveButton variant="secondary" disabled={!ready} onClick={() => { disarm(); dispatch({ type: 'add-device' }) }}>Add a fresh Unit</ArchiveButton>
      <p className={styles.caption}>Identities and world selection sync across tabs. Notes are editable only by the active simulated owner; this is not production authentication.</p>
      <ArchiveField htmlFor="sample" label="Audio probability sample"><ArchiveSelect id="sample" value={state.probabilitySample === null ? 'random' : String(state.probabilitySample)} onChange={e => dispatch({ type: 'set-sample', sample: e.target.value === 'random' ? null : Number(e.target.value) })}><option value="random">Random per transmission</option><option value="0">0.00 — pass if audio is open</option><option value="0.99">0.99 — fail at all demo clarities</option><option value="0.4">0.40 — boundary sample</option></ArchiveSelect></ArchiveField>
      <p>Simulation clock: <time>{new Date(state.now).toISOString()}</time></p><ArchiveButton variant="secondary" disabled={!ready} onClick={() => { disarm(); dispatch({ type: 'advance-time', seconds: 61 }) }}>Advance 61s / recover energy</ArchiveButton>
      <h3>Load an explicit fixture</h3><div className={styles.fixtures}>{(['fresh', 'audio', 'catch-up', 'overload'] as const).map(scenario => <ArchiveButton key={scenario} variant="secondary" disabled={!ready} onClick={() => { disarm(); dispatch({ type: 'load-scenario', scenario }); setBandId('b1') }}>{scenario}</ArchiveButton>)}</div>
      <p className={styles.caption}>fresh: initial links. audio: U10 / D12, noticed event, no reports. catch-up: personal U4 / D12, collective 12 / 12. overload: both Units 12 / 12 and three recent transmissions; one more triggers retreat. Fixtures are for the shepherdess world.</p>
      <details><summary>Executable demo configuration</summary><p>Latest unique-rule policy overrides the older content drafts. This is a reduced event-state scenario, not the complete 24h schedule. All thresholds are reachable (maximum link 20). Only actual personal values unlock access.</p>{world.rules.map(rule => <p key={rule.id}>#{rule.id} {rule.title} · {rule.oneShot ? 'once' : 'repeatable'} · report limit {rule.reportLimit}{rule.keyword ? ` · keyword: “${rule.keyword}”` : ''}{rule.eventIds ? ` · events: ${rule.eventIds.join(', ')}` : ''}{rule.minUplink !== undefined ? ` · uplink ≥ ${rule.minUplink}` : ''}{rule.minCollective !== undefined ? ` · collective/min ≥ ${rule.minCollective}` : ''}{rule.maxCollective !== undefined ? ` · collective/min ≤ ${rule.maxCollective}` : ''}</p>)}</details>
      <ArchiveButton variant="secondary" disabled={!ready} onClick={() => { disarm(); dispatch({ type: 'reset' }) }}>Reset all local demo data</ArchiveButton>
    </aside></div>
  </main>
}
