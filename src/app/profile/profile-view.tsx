'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Camera, Check, Compass, LockKeyhole, LogOut, Orbit, Pencil } from 'lucide-react'
import { ArchiveSheet } from '@/components/archive-sheet'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveInput, ArchiveTextarea } from '@/components/archive-input'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveRouteError, ArchiveRouteLoading } from '@/components/archive-route-state'
import { BackLink } from '@/components/back-link'
import { AVATAR_MAX_BYTES } from '@/lib/profile-validation'
import type { VoyagerProfile, VoyagerProfileUpdate, UserRole } from '@/types/database'
import styles from './profile.module.css'

export type ProfileServices = {
  load: () => Promise<VoyagerProfile | null>
  stages: () => Promise<{ consoleBound: boolean; accessRole: UserRole }>
  save: (updates: VoyagerProfileUpdate) => Promise<{ error: string | null }>
  upload: (data: FormData) => Promise<{ error: string | null; url: string | null }>
  logout: () => Promise<void>
}

function DeviceMark() {
  return <span className={styles.deviceMark} aria-hidden="true" />
}

type Stage = 'applicant' | 'voyager' | 'holder'
const stages = [
  { id: 'applicant', label: 'APPLICANT', icon: Compass, description: 'First connection to the Collective.', permissions: ['Public intel and world archives', 'Signal submit.'] },
  { id: 'voyager', label: 'VOYAGER', icon: Orbit, description: 'A lasting place in the Collective.', permissions: ['Classified intel', 'Member votes and priority participation', 'Initiation packs and Console claim access'] },
  { id: 'holder', label: 'CONSOLE HOLDER', icon: DeviceMark, description: 'Your own instrument for exploring parallel worlds.', permissions: ['Access to your Console and its observations', 'A chance to change the course of parallel worlds.'] },
] as const

function editFields(profile: VoyagerProfile) {
  return { display_name: profile.display_name ?? '', location: profile.location ?? '', bio: profile.bio ?? '', social_x: profile.social_x ?? '', social_instagram: profile.social_instagram ?? '', social_linkedin: profile.social_linkedin ?? '' }
}

export function ProfileView({ services, accountSafety }: { services: ProfileServices; accountSafety?: ReactNode }) {
  const [profile, setProfile] = useState<VoyagerProfile | null>(null)
  const [form, setForm] = useState<ReturnType<typeof editFields> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [bound, setBound] = useState<boolean | null>(null)
  const [accessRole, setAccessRole] = useState<UserRole | null>(null)
  const [stageError, setStageError] = useState(false)
  const [selected, setSelected] = useState<Stage | null>(null)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadStages = useCallback(async () => {
    setStageError(false)
    try { const stages = await services.stages(); setBound(stages.consoleBound); setAccessRole(stages.accessRole) }
    catch { setBound(null); setAccessRole(null); setStageError(true) }
  }, [services])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const result = await services.load()
      setProfile(result)
      setForm(result ? editFields(result) : null)
      if (result) await loadStages()
    } catch { setLoadError(true) }
    finally { setLoading(false) }
  }, [services, loadStages])

  useEffect(() => { void Promise.resolve().then(load) }, [load])
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  const member = accessRole === 'voyager' || accessRole === 'architect'
  const current: Stage = bound ? 'holder' : member ? 'voyager' : 'applicant'
  const activeStage = selected ?? current
  const detail = stages.find(stage => stage.id === activeStage)!
  const unlocked = (stage: Stage) => stage === 'applicant' || (stage === 'voyager' ? member : bound === true)
  const dirty = !!avatar || (!!form && !!profile && JSON.stringify(form) !== JSON.stringify(editFields(profile)))

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const guardLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || link.hash && link.pathname === location.pathname) return
      if (link.href === location.href) return
      if (!window.confirm('Discard unsaved profile changes and leave?')) { event.preventDefault(); event.stopImmediatePropagation() }
    }
    window.addEventListener('beforeunload', warn)
    document.addEventListener('click', guardLink, true)
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', guardLink, true) }
  }, [dirty])

  const save = async () => {
    if (!form || !profile || saving) return
    setSaving(true)
    setMessage(null)
    try {
      const updates: VoyagerProfileUpdate = member ? {
        display_name: form.display_name.trim(), location: form.location.trim() || null,
        bio: form.bio.trim() || null, social_x: form.social_x.trim() || null,
        social_instagram: form.social_instagram.trim() || null, social_linkedin: form.social_linkedin.trim() || null,
      } : { display_name: form.display_name.trim() }
      const result = await services.save(updates)
      if (result.error) { setMessage(result.error); return }
      const saved = { ...profile, ...updates }
      setProfile(saved)
      setForm(editFields(saved))
      if (avatar) {
        const data = new FormData()
        data.append('avatar', avatar)
        const upload = await services.upload(data)
        if (upload.error || !upload.url) { setMessage(`Name and details saved. ${upload.error ?? 'Avatar could not be saved.'}`); return }
        setProfile({ ...saved, avatar_url: upload.url })
        setAvatar(null)
        setPreview(null)
      }
      setMessage('Profile saved.')
      setEditing(false)
    } catch { setMessage('Your changes could not be confirmed. Please reload before trying again.') }
    finally { setSaving(false) }
  }

  if (loading) return <ArchiveRouteLoading label="LOADING PROFILE" />
  if (loadError) return <ArchiveRouteError title="PROFILE UNAVAILABLE" description="Your profile could not be retrieved." onRetry={load} returnHref="/console" returnLabel="DASHBOARD" />
  if (!profile || !form) return <div className={`main ${styles.page}`}><h1>MY PROFILE</h1><ArchiveLinkButton href="/login?redirect=%2Fprofile">SIGN IN</ArchiveLinkButton></div>

  const setField = (key: keyof typeof form, value: string) => { setForm({ ...form, [key]: value }); setMessage(null) }
  return (
    <div className={`main ${styles.page}`}>
      <header className={styles.header}>
        <div><BackLink href="/voyagers" label="VOYAGERS" /><h1>MY PROFILE</h1></div>
      </header>

      <section className={styles.identity} aria-label="Your identity">
        <div className={`${styles.avatar} ${styles.staticAvatar}`}>
          {profile.avatar_url
            // eslint-disable-next-line @next/next/no-img-element -- User-uploaded avatar URLs are dynamic.
            ? <img src={profile.avatar_url} alt="" />
            : <span>{profile.display_name.slice(0, 2).toUpperCase()}</span>}
        </div>
        <div className={styles.identityText}>
          <p className={styles.eyebrow}>{accessRole === 'architect' ? 'ARCHITECT' : stages.find(stage => stage.id === current)!.label.toUpperCase()}{member && profile.batch_label ? ` · ${profile.batch_label}` : ''}</p>
          <div className={styles.nameRow}><h2>{profile.display_name}</h2><ArchiveButton variant="ghost" onClick={() => { setForm(editFields(profile)); setAvatar(null); setPreview(null); setMessage(null); setEditing(true) }} aria-label="Edit profile"><Pencil size={16} /> EDIT</ArchiveButton></div>
          <p className={styles.hint}>Just your identity in the collective.</p>
        </div>
      </section>



      <section className={styles.initiation}>
        {!member ? <><p className={styles.eyebrow}>YOUR NEXT STEP</p><ArchiveLinkButton href="/voyager-initiation" variant="primary" fullWidth>VOYAGER INITIATION <ArrowRight size={18} /></ArchiveLinkButton></>
          : <><h2>Voyager Initiation</h2><p>Your access, packs and delivery progress.</p><ArchiveLinkButton href="/voyager-initiation" fullWidth>VIEW INITIATION <ArrowRight size={18} /></ArchiveLinkButton></>}
      </section>

      <section className={styles.access} aria-labelledby="profile-access">
        <div className={styles.sectionHeading}><h2 id="profile-access">YOUR PLACE IN THE COLLECTIVE</h2></div>
        <div className={styles.rail} aria-label="Identity stages">
          {stages.map(({ id, label, icon: Icon }, index) => <div className={styles.step} key={id}>
            {index > 0 && <span className={styles.connector} aria-hidden="true" />}
            <button type="button" aria-pressed={activeStage === id} aria-controls="profile-permissions" className={styles.stage} onClick={() => setSelected(id)}>
              <span className={styles.stageIcon}><Icon size={25} /></span>
              <span id={`profile-stage-${id}`} className={styles.stageLabel}>{label}</span>
              <span className={styles.stageStatus}>{id === 'holder' && bound === null ? 'Unverified' : current === id ? <><Check size={12} /> Current</> : unlocked(id) ? 'Unlocked' : <><LockKeyhole size={12} /> Locked</>}</span>
            </button>
          </div>)}
        </div>
        <div className={styles.permissions} id="profile-permissions" role="region" aria-labelledby={`profile-stage-${activeStage}`} aria-live="polite">
          <p>{detail.description}</p>
          <ul>{detail.permissions.map(permission => <li key={permission}>{permission}</li>)}</ul>
          {stageError && <p className={styles.hint}>Membership and device status could not be verified.</p>}
          {stageError && <ArchiveButton variant="ghost" onClick={() => void loadStages()}>RETRY ACCESS STATUS</ArchiveButton>}
          {activeStage === 'holder' && bound && <Link className={styles.textLink} href="/devices/my-consoles">MY CONSOLES <ArrowRight size={16} /></Link>}
        </div>
      </section>
      <ArchiveSheet open={editing} headerless title="Edit profile" dirty={dirty} busy={saving} onClose={() => { setEditing(false); setForm(editFields(profile)); setAvatar(null); setPreview(null); setMessage(null) }}>
        <h2 className={styles.editorTitle}>EDIT PROFILE</h2>
      <form className={styles.edit} onSubmit={event => { event.preventDefault(); void save() }}>
        <fieldset disabled={saving}>
          <div className={styles.editAvatar}>
        <button className={styles.avatar} type="button" disabled={saving} onClick={() => fileRef.current?.click()} aria-label="Change profile photo">
          {preview || profile.avatar_url
            // eslint-disable-next-line @next/next/no-img-element -- User-uploaded avatar URLs are dynamic.
            ? <img src={preview ?? profile.avatar_url!} alt="" />
            : <span>{profile.display_name.slice(0, 2).toUpperCase()}</span>}
          <span className={styles.camera}><Camera size={16} /></span>
        </button>
        <input ref={fileRef} className="hidden" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={event => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          if (file.size > AVATAR_MAX_BYTES || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) { setMessage('Choose a PNG, JPEG, GIF or WebP image up to 5 MB.'); return }
          setAvatar(file); setPreview(URL.createObjectURL(file)); setMessage(null)
        }} />
          </div>
          <ArchiveField htmlFor="profile-name" label="DISPLAY NAME"><ArchiveInput id="profile-name" required maxLength={60} value={form.display_name} onChange={event => setField('display_name', event.target.value)} /></ArchiveField>
          {member && <details className={styles.more}>
            <summary>BIO & LINKS</summary>
            <div className={styles.fields}>
              <ArchiveField htmlFor="profile-location" label="LOCATION"><ArchiveInput id="profile-location" maxLength={500} value={form.location} onChange={event => setField('location', event.target.value)} /></ArchiveField>
              <ArchiveField htmlFor="profile-bio" label="BIO"><ArchiveTextarea id="profile-bio" maxLength={240} value={form.bio} onChange={event => setField('bio', event.target.value)} /></ArchiveField>
              {(['social_x', 'social_instagram', 'social_linkedin'] as const).map(key => <ArchiveField key={key} htmlFor={`profile-${key}`} label={key === 'social_x' ? 'X / TWITTER' : key.replace('social_', '').toUpperCase()}><ArchiveInput id={`profile-${key}`} type="url" maxLength={500} placeholder="https://" value={form[key]} onChange={event => setField(key, event.target.value)} /></ArchiveField>)}
            </div>
          </details>}
          <div className={styles.saveRow}><p role="status">{message}</p><ArchiveButton type="submit" variant="secondary" disabled={!dirty || saving}>{saving ? 'SAVING…' : 'SAVE CHANGES'}</ArchiveButton></div>
        </fieldset>
      </form>
      </ArchiveSheet>
      {accountSafety}
      <footer className={styles.footer}>
        <ArchiveButton variant="ghost" aria-label="Log out" disabled={saving} onClick={() => { if (!dirty || window.confirm('Discard unsaved profile changes and log out?')) void services.logout() }}><LogOut size={16} /><span>LOG OUT</span></ArchiveButton>
      </footer>
    </div>
  )
}
