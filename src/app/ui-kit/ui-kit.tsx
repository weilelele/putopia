'use client'
import { DashboardVoyagerHeader } from '@/components/dashboard-voyager-header'
import { DashboardStats } from '@/components/dashboard-stats'
import { ArchiveInput, ArchiveSelect, ArchiveTextarea } from '@/components/archive-input'
import { useState } from 'react'
import Link from 'next/link'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveTabs } from '@/components/archive-tabs'
import { ArchiveSheet } from '@/components/archive-sheet'
import { UpdateTimeline, EventRail } from '@/components/dashboard-content'
import { PrimaryNavigation } from '@/components/primary-navigation'

type Result = 'ready' | 'submitting' | 'success' | 'unknown'
export function UiKit() {
  const [view, setView] = useState('dashboard')
  const [source, setSource] = useState('dashboard')
  const [sheet, setSheet] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [name, setName] = useState('')
  const [draftName, setDraftName] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result>('ready')
  const [scenario, setScenario] = useState('success')
  const [buttonBusy, setButtonBusy] = useState(false)
  const [selection, setSelection] = useState('public')
  const [live, setLive] = useState('loading')
  const submit = async () => {
    if (!name.trim()) { setError('Enter a display name.'); document.getElementById('kit-name')?.focus(); return }
    setError(''); setResult('submitting')
    await new Promise(resolve => setTimeout(resolve, 800))
    setResult(scenario === 'success' ? 'success' : 'unknown')
  }
  return <main className="uk-root">
    <header className="uk-header"><h1>UI Kit · 2.3</h1><p>Current implementation reference. All examples use local fixture data and shared product components.</p><Link href="https://multiverse-ui-guide.pufflele.chatgpt.site/?doc=interactions">Read the interaction specification</Link></header>
    <div className="uk-grid">
      <section className="uk-section uk-span"><h2>NAV-01 · Primary tabs</h2><p>Dashboard / Intel / Devices / Worlds / Voyagers. Select a preview below.</p>
        <ArchiveTabs ariaLabel="Page preview" activeId={['logs','profile'].includes(view) ? 'voyagers' : view} items={['dashboard','intel','devices','worlds','voyagers'].map(id => ({ id, label: id.toUpperCase() }))} onChange={setView} mode="filter" />
        <div className={`uk-phone ${view === 'intel' ? 'archive-intel-page' : ''}`}>
          {!['logs','profile'].includes(view) ? <><h2 className="sr-only">{view.toUpperCase()}</h2></> : <><ArchiveButton type="submit" variant="ghost" className="back-link" onClick={() => setView(source)}>← Back to {source}</ArchiveButton><h2 className="uk-page-title">{view === 'logs' ? 'VOYAGER LOGS' : 'MY PROFILE'}</h2></>}
          {view === 'dashboard' ? <><DashboardVoyagerHeader voyager={{role:'voyager',name:'Mira',avatarUrl:null,awaitingYou:8,deviceDays:0}} /><DashboardStats stats={{ worlds: 128, voyagers: 640 }} /><h3>UPDATES</h3><UpdateTimeline updates={[{id:'fixture-intel',occurredAt:'2026-09-09T08:00:00Z',category:'Intel',title:'A new signal has arrived',description:'A timestamped update using a reference asset.',image:'/assets/ui-kit/signal-check-mineral-plain.png',href:'#nav-02'}]} /><h3>EVENTS</h3><EventRail events={[{id:'fixture-vote',kind:'Collective vote',title:'Choose the next signal',description:'All open events are visible before login.',href:'#submit-01',action:'View fixture'},{id:'fixture-dream',kind:'Dreamcatcher',image:'/assets/ui-kit/world-records-antenna.png',title:'Describe a world',description:'The next card remains visible.',href:'#shell-01',action:'Open fixture'}]} /></> : view === 'intel' ? <><div className="archive-root-actions"><ArchiveButton variant="ghost" onClick={() => setSheet(true)}>VOTING HUB →</ArchiveButton></div><ArchiveTabs mode="filter" activeId={selection} ariaLabel="Intel visibility" items={[{id:'all',label:'ALL'},{id:'public',label:'PUBLIC'},{id:'classified',label:'CLASSIFIED'}]} onChange={setSelection} /><article className="intel-lead"><span className="intel-entry-meta">NOTICE · 09 SEP 2026</span><h2>New dispatch from the Collective</h2><p className="intel-author">Mira · fixture</p><p className="intel-summary">Read the full dispatch in its detail view.</p><ArchiveButton variant="primary" fullWidth onClick={() => setSheet(true)}>READ INTEL →</ArchiveButton></article><h3 className="archive-list-heading">RECENT</h3><a className="intel-recent-row" href="#form-01"><div><span className="intel-entry-meta">NOTICE · 08 SEP 2026</span><h3>A signal has been recorded</h3></div><span aria-hidden>→</span></a></> : view === 'devices' ? <ArchiveCard><h3>Console · fixture</h3><p>Camera offline</p><p>Connection status is separate from shipment progress.</p><ol><li>Confirmed</li><li>Preparing · current</li><li>Shipping</li><li>Delivered</li></ol><ArchiveButton variant="secondary" onClick={() => setLive('ready')}>Retry camera fixture</ArchiveButton></ArchiveCard> : view === 'worlds' ? <ArchiveCard><h3>Dreamcatcher · fixture</h3><p>Ready to accept a dream</p><ArchiveButton onClick={() => setSheet(true)}>Open submission fixture</ArchiveButton><details><summary>How it works</summary><p>A real queue and its current availability come from the service. Offline mode keeps saved content read only.</p></details></ArchiveCard> : view === 'voyagers' ? <><div className="archive-root-actions"><ArchiveButton className="uk-profile-entry" variant="ghost" onClick={() => { setSource(view); setView('profile') }}>MY PROFILE →</ArchiveButton></div><article className="voyager-directory-row"><div className="voyager-directory-identity"><span className="voyager-directory-portrait">MI</span><div><h3>Mira · fixture</h3><p>VOYAGER</p><p>128 observation days</p></div></div><details className="voyager-directory-details"><summary>Worlds &amp; observations</summary><p>2 worlds · profile details remain available.</p></details></article></> : view === 'profile' ? <ArchiveField htmlFor="kit-profile-name" label="DISPLAY NAME"><ArchiveInput id="kit-profile-name" value={name} onChange={event => setName(event.target.value)} /></ArchiveField> : <ArchiveCard><h3>Voyager Log · fixture</h3><p>Secondary pages use a back control and title, with no brand header.</p></ArchiveCard>}
          {view === 'voyagers' && <ArchiveButton fullWidth variant="primary" onClick={() => { setSource(view); setView('logs') }}>VOYAGER LOGS →</ArchiveButton>}
        </div>
        <div className="uk-nav-preview"><PrimaryNavigation variant="bottom" activePath={view === 'dashboard' ? '/console' : view === 'worlds' ? '/worlds/live' : `/${view}`} onNavigate={href => setView(href === '/console' ? 'dashboard' : href === '/worlds/live' ? 'worlds' : href.slice(1))} /></div>
      </section>
      <section className="uk-section"><h2>Buttons and states</h2><div className="uk-stack"><ArchiveButton onClick={() => setButtonBusy(value => !value)}>Toggle loading example</ArchiveButton><ArchiveButton loading={buttonBusy}>Primary action</ArchiveButton><ArchiveButton variant="secondary">Secondary action</ArchiveButton><ArchiveButton variant="ghost">Tertiary action</ArchiveButton><ArchiveButton variant="destructive" onClick={() => setConfirmDelete(true)}>Delete sample record</ArchiveButton><ArchiveButton disabled>Disabled action</ArchiveButton><ArchiveButton size="compact" variant="secondary">Compact · 44px target</ArchiveButton></div></section>
      <section className="uk-section" id="nav-02"><h2>NAV-02 · Return context</h2><p>Open Logs from the bottom of Voyagers, then return to the same list.</p><Link href="/logs">Open real Voyager Logs</Link></section>
      <ArchiveSheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete sample record?"><p>This affects only this local example.</p><ArchiveButton variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</ArchiveButton><ArchiveButton variant="destructive" onClick={() => { setDeleted(true); setConfirmDelete(false) }}>Delete sample record</ArchiveButton></ArchiveSheet>{deleted && <p role="status">Sample record deleted. No product data was changed.</p>}
      <section className="uk-section" id="shell-01"><h2>SHELL-01 · Modal and draft</h2><p>Focus stays in the sheet. Escape, close and backdrop protect an edited draft.</p><ArchiveButton onClick={() => setSheet(true)}>Open edit sheet</ArchiveButton><ArchiveSheet open={sheet} onClose={() => { setSheet(false); setDraftName('') }} title="Edit display name" dirty={!!draftName.trim()}><ArchiveField htmlFor="kit-sheet-name" label="DISPLAY NAME"><ArchiveInput id="kit-sheet-name" value={draftName} onChange={event => setDraftName(event.target.value)} /></ArchiveField></ArchiveSheet></section>
      <section className="uk-section" id="form-01"><h2>FORM-01 · Validation</h2><ArchiveField htmlFor="kit-name" label="DISPLAY NAME" helpText="Required. Visible to the Collective." error={error}><ArchiveInput id="kit-name" value={name} onChange={event => { setName(event.target.value); setError(''); setResult('ready') }} /></ArchiveField><ArchiveButton onClick={() => { if (!name.trim()) { setError('Enter a display name.'); document.getElementById('kit-name')?.focus() } else setError('') }}>Validate</ArchiveButton></section>
      <section className="uk-section" id="form-controls"><h2>FORM-02 · Native controls</h2><p>These are the same fields used by product forms. Values stay in this preview.</p>
        <ArchiveField htmlFor="kit-email" label="EMAIL"><ArchiveInput id="kit-email" type="email" placeholder="name@example.com" /></ArchiveField>
        <ArchiveField htmlFor="kit-note" label="NOTE"><ArchiveTextarea id="kit-note" rows={3} placeholder="Write a note" /></ArchiveField>
        <ArchiveField htmlFor="kit-category" label="CATEGORY"><ArchiveSelect id="kit-category" defaultValue="signal"><option value="signal">Signal</option><option value="world">World</option></ArchiveSelect></ArchiveField>
        <label><ArchiveInput type="checkbox" defaultChecked /> Include this item</label>
        <fieldset><legend>Visibility</legend><label><ArchiveInput type="radio" name="kit-visibility" value="public" defaultChecked /> Public</label><label><ArchiveInput type="radio" name="kit-visibility" value="private" /> Private</label></fieldset>
        <ArchiveField htmlFor="kit-range" label="VOLUME"><ArchiveInput id="kit-range" type="range" min={0} max={100} defaultValue={50} /></ArchiveField>
        <ArchiveField htmlFor="kit-file" label="LOCAL FILE"><ArchiveInput id="kit-file" type="file" /></ArchiveField>
        <ArchiveField htmlFor="kit-disabled" label="READ ONLY"><ArchiveInput id="kit-disabled" disabled value="Unavailable in this state" /></ArchiveField>
      </section>
      <section className="uk-section" id="submit-01"><h2>SUBMIT-01 · Result certainty</h2><ArchiveTabs mode="filter" ariaLabel="Submission scenario" activeId={scenario} items={[{id:'success',label:'SUCCESS'},{id:'unknown',label:'UNKNOWN'}]} onChange={setScenario} /><p>Uses the display name from FORM-01. No request is sent.</p><ArchiveButton loading={result === 'submitting'} disabled={result === 'success' || result === 'unknown'} onClick={submit}>Save fixture</ArchiveButton><div role="status">{result === 'success' ? 'Saved successfully.' : result === 'unknown' ? 'Result unconfirmed. Check the saved record before trying again.' : result === 'submitting' ? 'Saving…' : ''}</div>{result === 'unknown' && <ArchiveButton variant="secondary" onClick={() => setResult('success')}>Check saved record</ArchiveButton>}</section>
      <section className="uk-section uk-span"><h2>LIVE-01 · Loading and offline states</h2><ArchiveTabs mode="filter" ariaLabel="Live state" activeId={live} items={['loading','empty','error','offline','ready'].map(id => ({id,label:id.toUpperCase()}))} onChange={setLive} /><div className="uk-state" role="status" aria-busy={live === 'loading'}>{({loading:'Loading the latest signal…',empty:'No signals have been published yet.',error:'This feed could not be loaded.',offline:'Offline. Saved content is read only; reconnect to participate.',ready:'The latest signal is ready.'})[live]}</div>{['error','offline'].includes(live) && <ArchiveButton variant="secondary" onClick={() => setLive('ready')}>Retry fixture</ArchiveButton>}</section>
      <section className="uk-section uk-span"><h2>Launch · Playback + 3 seconds</h2><p>The protected flip wordmark plays at entry. Tap anywhere to enter Dashboard immediately, or stay for 3 seconds after playback finishes. Reduced motion shows the original static wordmark.</p><Link href="/welcome">Preview startup screen</Link></section>
    </div>
  </main>
}
