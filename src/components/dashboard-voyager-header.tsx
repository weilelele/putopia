'use client'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import SmartImage from './smart-image'
import { ArchiveButton } from './archive-button'
import { ArchiveLinkButton } from './archive-link-button'
import { ArchiveSheet } from './archive-sheet'
export interface DashboardVoyager { role: string; name: string; avatarUrl: string | null; awaitingYou: number | null; deviceDays: number }
/** Account summary is dashboard content; profile editing remains in Voyagers. */
export function DashboardVoyagerHeader({ voyager }: { voyager: DashboardVoyager }) {
  const [deviceOpen, setDeviceOpen] = useState(false)
  return <section className="dashboard-voyager" aria-label="Your Voyager status">
    {voyager.role !== 'applicant' && <div className="dashboard-voyager-welcome"><p>WELCOME,</p><h2>VOYAGER</h2><p className="dashboard-voyager-intro">YOU HAVE BEEN SELECTED TO EXPLORE<br />THE MYSTERIES OF PARALLEL WORLDS.</p></div>}
    <div className="dashboard-voyager-board">
      <div className="dashboard-voyager-identity">
        <span className="dashboard-voyager-avatar">{voyager.avatarUrl ? <SmartImage src={voyager.avatarUrl} alt={voyager.name} width={44} height={44} sizes="44px" /> : <span aria-label={voyager.name}>{voyager.name.slice(0,2).toUpperCase()}</span>}</span>
        <ArchiveLinkButton href="/voyager-path" variant="ghost"><span><strong>{voyager.role.toUpperCase()}</strong><span>VIEW YOUR PATH</span></span><ArrowRight aria-hidden size={18} /></ArchiveLinkButton>
      </div>
      <div className="dashboard-voyager-metrics">
        <ArchiveLinkButton href="/signal" variant="ghost" className="dashboard-voyager-dispatch"><span>SIGNAL DISPATCH</span><span><strong>{voyager.awaitingYou ?? '—'}</strong> awaiting you</span></ArchiveLinkButton>
        <ArchiveButton variant="ghost" className="dashboard-voyager-days" onClick={() => setDeviceOpen(true)} aria-label={`${voyager.deviceDays} Console holding days`}><SmartImage src="/assets/vi-icon.png" alt="" width={40} height={24} sizes="40px" /><span><strong>{voyager.deviceDays}</strong><span>DAYS</span></span></ArchiveButton>
      </div>
    </div>
    <ArchiveSheet open={deviceOpen} onClose={() => setDeviceOpen(false)} title="Multiverse Console"><p>{voyager.deviceDays} days held</p><p>No holding days recorded.</p><ArchiveLinkButton href="/devices" variant="primary" fullWidth>View Consoles <ArrowRight aria-hidden size={20} /></ArchiveLinkButton></ArchiveSheet>
  </section>
}
