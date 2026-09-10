'use client'
import { RootBrandHeader } from '@/components/root-brand-header'
import { ArchiveInput, ArchiveTextarea } from '@/components/archive-input'
import { useSessionPreference } from '@/lib/use-session-preference'

import { useState, useRef, useEffect, useCallback } from 'react'
import { getAllVoyagers, updateProfile, uploadAvatar } from '@/lib/actions/profile'
import { useAuth } from '@/lib/auth-context'
import { ArchiveSheet } from '@/components/archive-sheet'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { ArchiveStatStrip, type ArchiveStatItem } from '@/components/archive-stat-strip'
import { BatchTabs } from '@/components/batch-tabs'
import { SectionTracker } from '@/components/section-tracker'
import { ArchiveRouteError, ArchiveRouteLoading } from '@/components/archive-route-state'
import { Camera, ArrowRight } from 'lucide-react'
import type { VoyagerProfile, UserRole } from '@/types/database'

// ── Platform icons ─────────────────────────────────────────────────────────
const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.848L2.25 2.25h6.928l4.27 5.64zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)
const InstagramIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
)
const LinkedInIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

// ── Deterministic accent color from display_name ───────────────────────────
const ACCENT_COLORS = [
  '#E8A020', '#D4601A', '#FF8A5C', '#FFB020',
  '#C43020', '#C4A96A', '#B5430A', '#E35205', '#C84406',
]
function accentColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length]
}
function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
function formatJoinDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

// ── Edit form type ─────────────────────────────────────────────────────────
type EditForm = {
  display_name: string
  location: string
  bio: string
  social_x: string
  social_instagram: string
  social_linkedin: string
  observation_days: string
  worlds_discovered: string
}

function profileToForm(v: VoyagerProfile): EditForm {
  return {
    display_name:     v.display_name,
    location:         v.location ?? '',
    bio:              v.bio ?? '',
    social_x:         v.social_x ?? '',
    social_instagram: v.social_instagram ?? '',
    social_linkedin:  v.social_linkedin ?? '',
    observation_days: String(v.observation_days),
    worlds_discovered: String(v.worlds_discovered),
  }
}

const BIO_LIMIT = 240
const DEFAULT_BATCH = 'Original Batch'
const BATCH_COLLAPSE = 6

// ── Page ───────────────────────────────────────────────────────────────────
export default function VoyagersPage() {
  const { user, isAtLeast } = useAuth()
  const [voyagers, setVoyagers] = useState<VoyagerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // ── Edit modal state ───────────────────────────────────────────────────
  const [editing, setEditing] = useState<VoyagerProfile | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [profileUnknown, setProfileUnknown] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const modalFileRef = useRef<HTMLInputElement>(null)

  // ── Batch selector state ────────────────────────────────────────────────
  const [activeBatch, setActiveBatch] = useSessionPreference<string | null>('mc:view:voyagers:batch:s2-default', null)
  const [batchExpanded, setBatchExpanded] = useState(false)
  const selectBatch = (label: string) => { setActiveBatch(label); setBatchExpanded(false) }

  const refresh = useCallback(async () => {
    const data = await getAllVoyagers()
    setVoyagers(data)
  }, [])

  const loadVoyagers = useCallback(async () => {
    await Promise.resolve()
    setLoading(true)
    setLoadError(false)
    try {
      await refresh()
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [refresh])

  useEffect(() => {
    void Promise.resolve().then(loadVoyagers)
  }, [loadVoyagers])

  const openEdit = (v: VoyagerProfile) => {
    setEditing(v)
    setProfileUnknown(false)
    setForm(profileToForm(v))
    setAvatarFile(null)
    setAvatarPreview(null)
    setSaveMsg(null)
  }
  const closeEdit = () => { setEditing(null); setForm(null) }

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    if (e.target) e.target.value = ''
  }

  const handleSave = async () => {
    if (!form || !editing || saving || profileUnknown) return
    setSaving(true); setSaveMsg(null)

    try {
    // 1. Upload avatar if changed
    if (avatarFile) {
      const fd = new FormData()
      fd.append('avatar', avatarFile)
      const { error } = await uploadAvatar(fd)
      if (error) { setSaveMsg({ text: `Avatar upload failed: ${error}`, ok: false }); setSaving(false); return }
    }

    // 2. Update profile fields
    const result = await updateProfile({
      display_name:      form.display_name.trim() || editing.display_name,
      location:          form.location.trim() || null,
      bio:               form.bio.slice(0, BIO_LIMIT) || null,
      social_x:          form.social_x.trim()         || null,
      social_instagram:  form.social_instagram.trim() || null,
      social_linkedin:   form.social_linkedin.trim()  || null,
      observation_days:  Math.max(0, parseInt(form.observation_days)  || 0),
      worlds_discovered: Math.max(0, parseInt(form.worlds_discovered) || 0),
    })

    setSaving(false)
    if (result?.error) {
      setSaveMsg({ text: result.error, ok: false })
    } else {
      setSaveMsg({ text: 'Saved ✓', ok: true })
      await refresh()
      setTimeout(() => { closeEdit() }, 600)
    }
    } catch { setProfileUnknown(true); setSaveMsg({ text: 'Result unconfirmed. Review your profile before saving again.', ok: false }) } finally { setSaving(false) }
  }

  const setF = (k: keyof EditForm, v: string) =>
    setForm(f => f ? { ...f, [k]: v } : f)

  const architects     = voyagers.filter(v => v.role === 'architect')
  const activeVoyagers = voyagers.filter(v => v.role === 'voyager')

  // ── Group active voyagers into batches (preserve join-order appearance) ──
  const batchMap = new Map<string, VoyagerProfile[]>()
  for (const v of activeVoyagers) {
    const label = v.batch_label || DEFAULT_BATCH
    if (!batchMap.has(label)) batchMap.set(label, [])
    batchMap.get(label)!.push(v)
  }
  const batches = [...batchMap.entries()].map(([label, members]) => ({ label, members }))
  const currentLabel = batches.find(b => b.label === activeBatch)?.label ?? batches.find(b => /\bS2\b/i.test(b.label))?.label ?? batches[0]?.label
  const currentBatch = batches.find(b => b.label === currentLabel)
  const currentMembers = currentBatch?.members ?? []
  const shownMembers = batchExpanded ? currentMembers : currentMembers.slice(0, BATCH_COLLAPSE)
  const hasMoreBatchMembers = currentMembers.length > BATCH_COLLAPSE

  // Newest batch (getAllVoyagers is ordered by joined_at asc, so it's the last one).
  const latestBatch = batches[batches.length - 1]

  // Stat-board click: jump to a section, optionally selecting a batch first.
  const jumpTo = (id: string, batchLabel?: string) => {
    if (batchLabel) selectBatch(batchLabel)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const statItems: ArchiveStatItem[] = [
    { value: loading ? '—' : architects.length, label: 'ARCHITECTS', onSelect: () => jumpTo('section-architects') },
    { value: loading ? '—' : latestBatch?.members.length ?? 0, label: 'NEW BATCH', onSelect: () => jumpTo('section-voyagers', latestBatch?.label) },
    { value: loading ? '—' : voyagers.length, label: 'ALL VOYAGERS', onSelect: () => jumpTo('section-voyagers') },
  ]


  return (
    <main className="main pilot-archive-page pilot-voyagers-page">
      <SectionTracker section="voyagers" />


      <h1 className="sr-only">Voyagers</h1>
      <RootBrandHeader><ArchiveLinkButton variant="ghost" href={user.role === 'guest' ? '/login?redirect=%2Fprofile' : '/profile'}>MY PROFILE <ArrowRight aria-hidden size={18} /></ArchiveLinkButton></RootBrandHeader>

      {/* ── Stat board — Architect Council / new Voyagers / total Voyagers ── */}
      <ArchiveStatStrip items={statItems} />

      {loading ? (
        <ArchiveRouteLoading className="archive-state-page archive-route-state-section" label="LOADING VOYAGER REGISTRY" />
      ) : loadError ? (
        <ArchiveRouteError
          className="archive-state-page archive-route-state-section"
          title="REGISTRY UNAVAILABLE"
          description="The Voyager registry could not be retrieved."
          onRetry={loadVoyagers}
        />
      ) : (
        <>
          {architects.length > 0 && (
            <section id="section-architects" style={{ marginBottom: '2.5rem', scrollMarginTop: '1rem' }}>
              <ArchiveSectionLabel>ARCHITECTS</ArchiveSectionLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {architects.map(v => (
                  <VoyagerCard key={v.id} voyager={v} user={user} isAtLeast={isAtLeast}
                    onEditClick={openEdit} isArchitect />
                ))}
              </div>
            </section>
          )}

          {activeVoyagers.length > 0 && (
            <section id="section-voyagers" style={{ scrollMarginTop: '1rem' }}>
              <style>{`.batch-rail::-webkit-scrollbar{display:none}.batch-rail{scrollbar-width:none}`}</style>

              {/* Batch selector — horizontal scroll rail */}
              <ArchiveSectionLabel>VOYAGER BATCHES</ArchiveSectionLabel>

              <BatchTabs activeId={currentLabel ?? ''} items={batches.map(({label,members}) => ({id:label,label,count:members.length}))} onChange={selectBatch} />

              {/* Selected batch members — full cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {shownMembers.map(v => (
                  <VoyagerCard key={v.id} voyager={v} user={user} isAtLeast={isAtLeast}
                    onEditClick={openEdit} />
                ))}
              </div>

              {hasMoreBatchMembers && (
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <ArchiveButton onClick={() => setBatchExpanded(e => !e)} variant="ghost">
                    {batchExpanded ? '▲ COLLAPSE' : `▼ SHOW ALL (${currentMembers.length})`}
                  </ArchiveButton>
                </div>
              )}
            </section>
          )}
        </>
      )}

      <ArchiveLinkButton variant="primary" className="voyager-logs-entry" fullWidth href="/logs">VOYAGER LOGS <ArrowRight aria-hidden size={20} /></ArchiveLinkButton>

      {/* ── Edit Modal ── */}
      {editing && form && (
        <ArchiveSheet open title="Edit profile" onClose={closeEdit} busy={saving} dirty={!profileUnknown && !saveMsg?.ok && (!!avatarFile || JSON.stringify(form) !== JSON.stringify(profileToForm(editing)))}>
            {/* Header */}


            {/* Avatar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div
                  onClick={() => modalFileRef.current?.click()}
                  style={{
                    width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', cursor: 'pointer',
                    background: avatarPreview || editing.avatar_url ? 'transparent' : `${accentColor(editing.display_name)}18`,
                    border: `2px solid ${accentColor(editing.display_name)}60`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: accentColor(editing.display_name), fontSize: 'var(--fs-title)', fontWeight: 'bold',
                  }}
                >
                  {(avatarPreview || editing.avatar_url)
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={avatarPreview ?? editing.avatar_url!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials(editing.display_name)}
                </div>
                <div
                  onClick={() => modalFileRef.current?.click()}
                  style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '24px', height: '24px', borderRadius: '50%', background: '#151B3A', border: '1px solid #C84406', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#C84406' }}
                >
                  <Camera size={11} />
                </div>
              </div>
              <ArchiveInput ref={modalFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
            </div>

            {/* Fields */}
            <FieldGroup>
              <ArchiveField htmlFor="voyager-display-name" label="DISPLAY NAME">
                <ArchiveInput id="voyager-display-name" value={form.display_name} onChange={e => setF('display_name', e.target.value)} />
              </ArchiveField>
              <ArchiveField htmlFor="voyager-location" label="LOCATION">
                <ArchiveInput id="voyager-location" value={form.location} onChange={e => setF('location', e.target.value)} placeholder="City, Country" />
              </ArchiveField>
            </FieldGroup>

            <ArchiveField
              error={form.bio.length >= BIO_LIMIT ? 'Character limit reached' : undefined}
              htmlFor="voyager-bio"
              label={`BIO (${form.bio.length} / ${BIO_LIMIT})`}
            >
              <ArchiveTextarea
                id="voyager-bio"
                value={form.bio}
                maxLength={BIO_LIMIT}
                onChange={e => setF('bio', e.target.value)}
                placeholder="A short description of your role in the Collective..."
              />
            </ArchiveField>

            <ArchiveSectionLabel className="voyagers-modal-section-label">SOCIAL LINKS</ArchiveSectionLabel>
            <FieldGroup>
              <ArchiveField htmlFor="voyager-x" label="X / TWITTER (FULL URL)">
                <ArchiveInput id="voyager-x" value={form.social_x} onChange={e => setF('social_x', e.target.value)} placeholder="https://x.com/yourhandle" />
              </ArchiveField>
              <ArchiveField htmlFor="voyager-instagram" label="INSTAGRAM (FULL URL)">
                <ArchiveInput id="voyager-instagram" value={form.social_instagram} onChange={e => setF('social_instagram', e.target.value)} placeholder="https://instagram.com/yourhandle" />
              </ArchiveField>
              <ArchiveField htmlFor="voyager-linkedin" label="LINKEDIN (FULL URL)">
                <ArchiveInput id="voyager-linkedin" value={form.social_linkedin} onChange={e => setF('social_linkedin', e.target.value)} placeholder="https://linkedin.com/in/yourhandle" />
              </ArchiveField>
            </FieldGroup>

            <ArchiveSectionLabel className="voyagers-modal-section-label">FIELD DATA</ArchiveSectionLabel>
            <FieldGroup cols={2}>
              <ArchiveField htmlFor="voyager-observation-days" label="OBSERVATION DAYS">
                <ArchiveInput id="voyager-observation-days" type="number" min="0" value={form.observation_days} onChange={e => setF('observation_days', e.target.value)} />
              </ArchiveField>
              <ArchiveField htmlFor="voyager-worlds" label="WORLDS DISCOVERED">
                <ArchiveInput id="voyager-worlds" type="number" min="0" value={form.worlds_discovered} onChange={e => setF('worlds_discovered', e.target.value)} />
              </ArchiveField>
            </FieldGroup>

            {saveMsg && (
              <div style={{ marginBottom: '12px', padding: '7px 10px', background: saveMsg.ok ? 'rgba(32,216,144,0.08)' : 'rgba(232,48,48,0.08)', border: `1px solid ${saveMsg.ok ? '#20D890' : '#E83030'}`, color: saveMsg.ok ? '#20D890' : '#E83030', fontSize: 'var(--fs-label)', letterSpacing: '0.05em' }}>
                {saveMsg.text}
              </div>
            )}

            {profileUnknown && <ArchiveButton variant="secondary" onClick={() => window.location.reload()}>Reload and review profile</ArchiveButton>}
            <div className="voyagers-modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <ArchiveButton
                onClick={handleSave}
                disabled={saving || profileUnknown}
              >
                {saving ? 'SAVING...' : 'SAVE'}
              </ArchiveButton>
            </div>
          </ArchiveSheet>
      )}
    </main>
  )
}

function FieldGroup({ cols = 1, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px', marginBottom: '10px' }}>
      {children}
    </div>
  )
}

// ── Batch rail helpers ─────────────────────────────────────────────────────
// ── Card component ─────────────────────────────────────────────────────────
function VoyagerCard({
  voyager, user, isAtLeast, onEditClick, isArchitect = false,
}: {
  voyager: VoyagerProfile
  user: { id?: string } | null
  isAtLeast: (role: UserRole) => boolean
  onEditClick: (v: VoyagerProfile) => void
  isArchitect?: boolean
}) {
  const isOwn = isAtLeast('voyager') && user?.id === voyager.id
  const links = [
    voyager.social_x && { key: 'X', icon: <XIcon />, href: voyager.social_x },
    voyager.social_instagram && { key: 'Instagram', icon: <InstagramIcon />, href: voyager.social_instagram },
    voyager.social_linkedin && { key: 'LinkedIn', icon: <LinkedInIcon />, href: voyager.social_linkedin },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; href: string }[]
  return <article className={`voyager-directory-row${isArchitect ? ' voyager-directory-row--architect' : ''}`}>
    <div className="voyager-directory-identity">
      <div className="voyager-directory-portrait">{voyager.avatar_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={voyager.avatar_url} alt={voyager.display_name} />
        : <span>{getInitials(voyager.display_name)}</span>}</div>
      <div><h3>{voyager.display_name}</h3>{isArchitect && <p>ARCHITECT</p>}{voyager.location && <p>{voyager.location}</p>}<p>{voyager.observation_days} observation days</p>
    <details className="voyager-directory-details"><summary>Worlds &amp; observations <ArrowRight aria-hidden size={16} /></summary>
      <div><p>{voyager.worlds_discovered} worlds · Joined {formatJoinDate(voyager.joined_at)}</p>{voyager.bio && <p>{voyager.bio}</p>}
      {links.length > 0 && <div className="voyager-directory-social">{links.map(({key,icon,href})=><a key={key} href={href} aria-label={`${voyager.display_name} on ${key}`} target="_blank" rel="noopener noreferrer">{icon}</a>)}</div>}
      {isOwn && <ArchiveButton variant="secondary" onClick={() => onEditClick(voyager)}>Edit profile</ArchiveButton>}</div>
    </details></div>
    </div>
  </article>
}
