'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveSelect, ArchiveTextarea } from '@/components/archive-input'
import { ArchiveSheet } from '@/components/archive-sheet'
import { MissionEventFrame } from '@/lib/mission-demo/event-frame'
import { LazyImage } from '@/components/lazy-image'
import { bandClarity, worldDefinitions } from '@/lib/mission-demo'
import { useMissionDemo } from '@/lib/mission-demo/store'

type Demo = ReturnType<typeof useMissionDemo>
type Report = Demo['state']['worlds'][string]['reports'][number]
type Device = Demo['state']['devices'][string]

function timestamp(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString().replace('T', ' ').replace('.000Z', ' UTC')
}

function newest(reports: Report[]) {
  // Stable sorting preserves the store's newest-first order for simultaneous events.
  return [...reports].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

function Participant({ name, onClick }: { name: string; onClick: () => void }) {
  return <button className="mo-participant" onClick={onClick} type="button" aria-label={`View simulated participant ${name}`}>
    <span className="mo-avatar" aria-hidden>{name.slice(0, 2).toUpperCase()}</span>
    <span>{name}</span>
  </button>
}

function NoteEditor({ report, own, dispatch, onClose }: {
  report: Report; own: boolean; dispatch: Demo['dispatch']; onClose: () => void
}) {
  const [draft, setDraft] = useState(report.note)
  const [submitted, setSubmitted] = useState(false)
  const dirty = draft !== report.note
  return <ArchiveSheet open title="Your discovery note" onClose={onClose} dirty={own && dirty}
    footer={own ? <ArchiveButton fullWidth disabled={!dirty} onClick={() => {
      dispatch({ type: 'add-note', worldId: report.worldId, reportId: report.id, note: draft })
      setSubmitted(true)
    }}>Save note</ArchiveButton> : undefined}>
    <p className="mo-muted">Notes add context to a system discovery. They do not create or change its event.</p>
    {own ? <ArchiveField htmlFor="discovery-note" label="Personal note" helpText="Saved with this report in this browser. Up to 1,000 characters.">
      <ArchiveTextarea id="discovery-note" rows={5} maxLength={1000} value={draft} onChange={event => { setDraft(event.target.value); setSubmitted(false) }} />
    </ArchiveField> : <p>This report belongs to another simulated Unit. Only its active device identity can edit the note.</p>}
    <p role="status">{submitted ? !dirty ? 'Note saved.' : 'Waiting for the shared state to confirm your note.' : ''}</p>
  </ArchiveSheet>
}

export function MissionObserve({ worldId }: { worldId?: string }) {
  const { state, dispatch, ready } = useMissionDemo()
  const storageBlocked = /cannot coordinate|unavailable|could not be saved|invalid demo snapshot/i.test(state.feedback)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [bandId, setBandId] = useState('')
  const device = state.devices[state.activeDeviceId]
  const definition = worldDefinitions.find(world => world.id === worldId)
  const world = definition ? state.worlds[definition.id] : undefined
  const personal = definition ? device?.worlds[definition.id] : undefined
  const accessible = definition?.bands.filter(band => !band.remarks && personal && personal.downlink >= band.unlockDownlink) ?? []
  const frame = accessible.find(band => band.id === bandId) ?? accessible[0]
  const reports = newest(world?.reports ?? [])
  const note = reports.find(report => report.id === noteId)
  const profile: Device | undefined = profileId ? state.devices[profileId] : undefined
  const profileReports = profile ? Object.values(state.worlds).flatMap(item => item.reports).filter(report => report.deviceId === profile.id) : []
  const orderedWorlds = [...worldDefinitions].sort((a, b) => {
    const latestA = newest(state.worlds[a.id]?.reports ?? [])[0]
    const latestB = newest(state.worlds[b.id]?.reports ?? [])[0]
    return (latestB ? Date.parse(latestB.createdAt) : 0) - (latestA ? Date.parse(latestA.createdAt) : 0) || a.id.localeCompare(b.id)
  })

  return <main className="main mo-page">
    <header className="mo-header">
      <p className="mo-label">Simulation Preview</p>
      <h1>{definition ? definition.name : worldId ? 'World unavailable' : 'Observe worlds'}</h1>
      <p className="mo-muted">Local simulation · No live world or account data.</p>
      <nav className="mo-actions" aria-label="Demo navigation">
        {worldId ? <ArchiveLinkButton href="/dev/mission-observe">← All worlds</ArchiveLinkButton> : null}
        <ArchiveLinkButton href="/dev/mission-simulator" target="_blank" rel="noopener noreferrer">Open simulator ↗</ArchiveLinkButton>
      </nav>
    </header>

    {!ready ? <section aria-busy={!storageBlocked} className="mo-empty"><h2>{storageBlocked ? 'Local simulation unavailable' : 'Restoring local discoveries'}</h2><p>{storageBlocked ? state.feedback : 'Loading the shared world state and device identity.'}</p>{storageBlocked ? <p>Use a browser with local storage and Web Locks enabled, then reload this page.</p> : null}</section> : <>
      <section className="mo-identity" aria-label="Simulation identity">
        <ArchiveField htmlFor="observe-device" label="Active demo Unit" helpText="Shared with the simulator and other tabs. This is a local identity selector, not account authentication.">
          <ArchiveSelect id="observe-device" value={state.activeDeviceId} onChange={event => dispatch({ type: 'select-device', deviceId: event.target.value })}>
            {Object.values(state.devices).map(item => <option key={item.id} value={item.id}>{item.userName} · {item.name}</option>)}
          </ArchiveSelect>
        </ArchiveField>
      </section>

      {worldId && !definition ? <section className="mo-empty"><h2>World unavailable</h2><p>This world is not part of the simulation. Return to the world list.</p></section> : definition && world ? <>
        {accessible.length ? <ArchiveField htmlFor="observe-band" label="Accessible signal" helpText="Only signals currently available to this Unit appear here.">
          <ArchiveSelect id="observe-band" value={frame?.id ?? ''} onChange={event => setBandId(event.target.value)}>
            {accessible.map(band => <option key={band.id} value={band.id}>{band.name}</option>)}
          </ArchiveSelect>
        </ArchiveField> : null}
        <figure className="mo-frame">
          <div className="mo-frame-image">{frame ? <MissionEventFrame worldId={definition.id} eventId={world.currentEventId} title={world.currentEventTitle} /> : <p>No accessible signal for this Unit. Explore in the simulator.</p>}</div>
          <figcaption>{frame ? `Fixed camera · ${frame.name} · Signal clarity ${bandClarity(frame, personal!.downlink).toFixed(0)}%` : 'No accessible signal'} · Generated event still shown without signal degradation; fixed reference camera.</figcaption>
        </figure>
        <section className="mo-section" aria-labelledby="world-state-title">
          <p className="mo-label">Current world state</p><h2 id="world-state-title">{world.currentEventTitle}</h2>
          <p>{definition.description}</p>
          <dl className="mo-stats">
            <div><dt>Collective uplink</dt><dd>{world.uplink.toFixed(1)}</dd></div><div><dt>Collective downlink</dt><dd>{world.downlink.toFixed(1)}</dd></div>
            <div><dt>This Unit uplink</dt><dd>{personal?.uplink.toFixed(1) ?? 'Unavailable'}</dd></div><div><dt>This Unit downlink</dt><dd>{personal?.downlink.toFixed(1) ?? 'Unavailable'}</dd></div>
          </dl>
          <p className="mo-muted">Actual settled values. Temporary signal peaks do not unlock access.</p>
          <ArchiveLinkButton href="/dev/mission-simulator" target="_blank" rel="noopener noreferrer" onClick={() => dispatch({ type: 'select-world', worldId: definition.id })}>Explore this world in simulator ↗</ArchiveLinkButton>
        </section>
        <section className="mo-section" aria-labelledby="discoveries-title">
          <div className="mo-section-heading"><h2 id="discoveries-title">Discoveries</h2><span>{reports.length} reports</span></div>
          <p className="mo-muted">Automatically recorded when a rule first takes effect. Latest event first.</p>
          <p className="mo-update" role="status" aria-live="polite">{reports.length ? `${reports.length} system discoveries. Latest: ${reports[0].title}.` : 'No discoveries recorded yet.'}</p>
          {!reports.length ? <div className="mo-empty"><h3>The first discovery is still ahead</h3><p>Send energy to an accessible signal in the simulator. A successful rule may create its first report here.</p><p>Repeated fixed effects can change values without creating another report.</p></div> : <ol className="mo-reports">{reports.map(report => <li key={report.id} id={`report-${report.id}`}>
            <p className="mo-label">System discovery · Rule {report.ruleId}</p><h3>{report.title}</h3>
            <Participant name={report.userName} onClick={() => setProfileId(report.deviceId)} />
            <p className="mo-meta">Triggered by {state.devices[report.deviceId]?.name ?? report.deviceId} · <time dateTime={report.createdAt}>{timestamp(report.createdAt)}</time></p>
            <p>{report.body}</p>
            {report.before && report.after ? <dl className="mo-changes" aria-label="This Unit at discovery">
              <div><dt>Unit uplink</dt><dd>{report.before.uplink.toFixed(1)} → {report.after.uplink.toFixed(1)}</dd></div>
              <div><dt>Unit downlink</dt><dd>{report.before.downlink.toFixed(1)} → {report.after.downlink.toFixed(1)}</dd></div>
            </dl> : null}
            {report.collectiveBefore && report.collectiveAfter ? <dl className="mo-changes" aria-label="Collective at discovery">
              <div><dt>Collective uplink</dt><dd>{report.collectiveBefore.uplink.toFixed(1)} → {report.collectiveAfter.uplink.toFixed(1)}</dd></div>
              <div><dt>Collective downlink</dt><dd>{report.collectiveBefore.downlink.toFixed(1)} → {report.collectiveAfter.downlink.toFixed(1)}</dd></div>
            </dl> : null}
            {report.eventId ? <p className="mo-meta">Event at discovery: {definition.events[report.eventId] ?? report.eventId}</p> : null}
            <p className="mo-meta">World {report.worldId} · Report {report.id}</p>
            {report.note ? <blockquote className="mo-note"><span className="mo-label">Participant note</span><p>{report.note}</p></blockquote> : null}
            {report.deviceId === state.activeDeviceId ? <ArchiveButton variant="secondary" size="compact" onClick={() => setNoteId(report.id)}>{report.note ? 'Edit your note' : 'Add your note'}</ArchiveButton> : <p className="mo-muted">Only the triggering Unit can add a note.</p>}
          </li>)}</ol>}
        </section>
      </> : <section aria-label="Observed worlds">
        <p className="mo-muted">Discoveries emerge from shared exploration. Open a world to follow its state and event history.</p>
        <ul className="mo-worlds">{orderedWorlds.map(item => {
          const current = state.worlds[item.id]
          const latest = newest(current?.reports ?? [])[0]
          return <li key={item.id}>
            <Link className="mo-world-link" href={`/dev/mission-observe?world=${encodeURIComponent(item.id)}`} onClick={() => dispatch({ type: 'select-world', worldId: item.id })}>
              <span className="mo-thumb"><LazyImage src={item.image} alt="" sizes="(min-width: 768px) 180px, 88px" style={{ objectFit: 'cover' }} /></span>
              <span className="mo-world-copy"><span className="mo-label">{item.id}</span><strong>{item.name}</strong><span>{current?.currentEventTitle ?? 'State unavailable'}</span><span className="mo-muted">{current?.reports.length ?? 0} discoveries · View world →</span></span>
            </Link>
            <p className="mo-latest">{latest ? <>Latest: {latest.title}<br /><time dateTime={latest.createdAt}>{timestamp(latest.createdAt)}</time></> : 'No discovery yet. Explore this world in the simulator.'}</p>
          </li>
        })}</ul>
      </section>}
      <footer className="mo-limits"><p>Simulation limits: local browser storage, simulated participants, preset event text and still imagery. Discoveries persist on this browser and sync across tabs on the same origin. No public discussion or real device connection.</p></footer>
    </>}

    {ready && note ? <NoteEditor key={`${note.id}-${state.activeDeviceId}`} report={note} own={note.deviceId === state.activeDeviceId} dispatch={dispatch} onClose={() => setNoteId(null)} /> : null}
    {ready && profile ? <ArchiveSheet open title="Simulated participant" onClose={() => setProfileId(null)}>
      <p className="mo-label">Local demo identity</p><h3>{profile.userName}</h3><p>{profile.name} · {profile.id}</p>
      <p>{profileReports.length} discoveries triggered across {new Set(profileReports.map(report => report.worldId)).size} worlds.</p>
      <p className="mo-muted">This participant exists only in the simulation. No real profile or external account is linked.</p>
    </ArchiveSheet> : null}
  </main>
}
