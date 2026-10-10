'use client'
import { MemberProfileContent } from '@/components/member-profile-content'
import { RootBrandHeader } from '@/components/root-brand-header'
import { ArchiveInput, ArchiveTextarea } from '@/components/archive-input'
import { memberInitials as getInitials } from '@/lib/member-initials'
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
import { createClientDataCache } from '@/lib/client-data-cache'
import { PrimaryTabLoading } from '@/components/primary-tab-loading'

const voyagersPageCache = createClientDataCache<VoyagerProfile[]>(5 * 60_000)

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
const ARCHITECT_COLLAPSE = 4

// ── Page ───────────────────────────────────────────────────────────────────
export default function VoyagersPage() {
  const { user, isAtLeast } = useAuth()
  const cachedVoyagers = voyagersPageCache.peek()
  const [voyagers, setVoyagers] = useState<VoyagerProfile[]>(() => cachedVoyagers ?? [])
  const [loading, setLoading] = useState(cachedVoyagers === undefined)
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
  const [architectsExpanded, setArchitectsExpanded] = useState(false)
  const selectBatch = (label: string) => { setActiveBatch(label); setBatchExpanded(false) }

  const refresh = useCallback(async (force = false) => {
    const data = await voyagersPageCache.load(getAllVoyagers, force)
    setVoyagers(data)
  }, [])

  const loadVoyagers = useCallback(async (force = false) => {
    await Promise.resolve()
    if (voyagersPageCache.peek() === undefined) setLoading(true)
    setLoadError(false)
    try {
      await refresh(force)
    } catch {
      if (voyagersPageCache.peek() === undefined) setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [refresh])

  useEffect(() => {
    void Promise.resolve().then(() => loadVoyagers())
  }, [loadVoyagers])

  if (loading && cachedVoyagers === undefined) return <PrimaryTabLoading kind="registry" />

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
      await refresh(true)
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
    <main className="main pilot-archive-page pilot-voyagers-page" data-route-scroll>
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
          onRetry={() => { void loadVoyagers(true) }}
        />
      ) : (
        <>
          {architects.length > 0 && (
            <section id="section-architects" style={{ scrollMarginTop: '1rem' }}>
              <ArchiveSectionLabel>ARCHITECTS</ArchiveSectionLabel>
              <div id="architect-directory" className="voyager-directory-list">
                {(architectsExpanded ? architects : architects.slice(0, ARCHITECT_COLLAPSE)).map(v => (
                  <VoyagerCard key={v.id} voyager={v} user={user} isAtLeast={isAtLeast}
                    onEditClick={openEdit} isArchitect />
                ))}
              </div>
              {architects.length > ARCHITECT_COLLAPSE && (
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <ArchiveButton variant="ghost" aria-expanded={architectsExpanded} aria-controls="architect-directory"
                    onClick={() => setArchitectsExpanded(expanded => !expanded)}>
                    {architectsExpanded ? '▲ COLLAPSE' : `▼ SHOW ALL (${architects.length})`}
                  </ArchiveButton>
                </div>
              )}
            </section>
          )}

          {activeVoyagers.length > 0 && (
            <section id="section-voyagers" style={{ scrollMarginTop: '1rem' }}>
              <style>{`.batch-rail::-webkit-scrollbar{display:none}.batch-rail{scrollbar-width:none}`}</style>

              {/* Batch selector — horizontal scroll rail */}
              <ArchiveSectionLabel>VOYAGER BATCHES</ArchiveSectionLabel>

              <BatchTabs activeId={currentLabel ?? ''} items={batches.map(({label,members}) => ({id:label,label,count:members.length}))} onChange={selectBatch} />

              {/* Selected batch members — full cards */}
              <div className="voyager-directory-list">
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
        <ArchiveSheet open title="Edit profile" onClose={closeEdit} busy={saving} dirty={!profileUnknown && !saveMsg?.ok && (!!avatarFile || JSON.stringify(form) !== JSON.stringify(profileToForm(editing)))} footer={<div className="archive-sheet__actions">
          {profileUnknown ? <ArchiveButton variant="secondary" onClick={() => window.location.reload()}>Reload and review profile</ArchiveButton> : <ArchiveButton onClick={handleSave} disabled={saving}>{saving ? 'SAVING...' : 'SAVE'}</ArchiveButton>}
        </div>}>
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
  const [profileOpen, setProfileOpen] = useState(false)
  const profileTrigger = useRef<HTMLButtonElement>(null)
  const closeProfile = () => {
    setProfileOpen(false)
    requestAnimationFrame(() => profileTrigger.current?.focus({ preventScroll: true }))
  }
  const isOwn = isAtLeast('voyager') && user?.id === voyager.id
  return <article className="voyager-directory-row">
    <button ref={profileTrigger} type="button" className="voyager-directory-trigger" aria-haspopup="dialog"
      aria-label={`View ${voyager.display_name}'s profile`} onClick={() => setProfileOpen(true)}>
      <span className="voyager-directory-portrait">{voyager.avatar_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={voyager.avatar_url} alt="" loading="lazy" />
        : <span>{getInitials(voyager.display_name)}</span>}</span>
      <span className="voyager-directory-copy">
        <span className="voyager-directory-name">{voyager.display_name}</span>
        <span className="voyager-directory-meta">{voyager.location || (isArchitect ? 'Architect' : 'Voyager')}</span>
      </span>
      <ArrowRight aria-hidden size={16} />
    </button>
    {profileOpen && <ArchiveSheet open title="Voyager profile" onClose={closeProfile} footer={isOwn ? <ArchiveButton variant="secondary" fullWidth onClick={() => { setProfileOpen(false); onEditClick(voyager) }}>Edit profile</ArchiveButton> : undefined}>
      <MemberProfileContent profile={voyager} />
    </ArchiveSheet>}
  </article>
}
