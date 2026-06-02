'use client'

import { useState, useRef, useEffect } from 'react'
import { getAllVoyagers, updateProfile, uploadAvatar } from '@/lib/actions/profile'
import { useAuth } from '@/lib/auth-context'
import { SectionTracker } from '@/components/section-tracker'
import { Camera, X as XClose } from 'lucide-react'
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
  '#C43020', '#C4A96A', '#B5430A', '#FF6B35', '#E85A00',
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

const BIO_LIMIT = 280

// ── Page ───────────────────────────────────────────────────────────────────
export default function VoyagersPage() {
  const { user, isAtLeast } = useAuth()
  const [voyagers, setVoyagers] = useState<VoyagerProfile[]>([])
  const [loading, setLoading] = useState(true)

  // ── Edit modal state ───────────────────────────────────────────────────
  const [editing, setEditing] = useState<VoyagerProfile | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const modalFileRef = useRef<HTMLInputElement>(null)

  const refresh = async () => {
    const data = await getAllVoyagers()
    setVoyagers(data)
  }

  useEffect(() => {
    getAllVoyagers().then(data => { setVoyagers(data); setLoading(false) })
  }, [])

  const openEdit = (v: VoyagerProfile) => {
    setEditing(v)
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
    if (!form || !editing) return
    setSaving(true); setSaveMsg(null)

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
  }

  const setF = (k: keyof EditForm, v: string) =>
    setForm(f => f ? { ...f, [k]: v } : f)

  const architects     = voyagers.filter(v => v.role === 'architect')
  const activeVoyagers = voyagers.filter(v => v.role === 'voyager')

  return (
    <div className="main">
      <SectionTracker section="voyagers" />
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> VOYAGERS</div>
        <div className="right">
          <div className="item">MEMBERS <span className="val">{loading ? '—' : voyagers.length}</span></div>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="h-eyebrow">// NETWORK</div>
          <h1>ACTIVE <span className="accent">VOYAGERS</span></h1>
          <p className="sub">
            {loading ? 'Loading registry...' : `Voyager Registry — ${voyagers.length} active members`}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#4A5570', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', padding: '60px 0', textAlign: 'center', letterSpacing: '0.15em' }}>
          LOADING REGISTRY...
        </div>
      ) : (
        <>
          {architects.length > 0 && (
            <section style={{ marginBottom: '2.5rem' }}>
              <div style={{ color: '#4A5570', fontSize: 'var(--fs-caption)', fontFamily: 'var(--font-mono)', letterSpacing: '0.25em', marginBottom: '1rem', paddingBottom: '8px', borderBottom: '1px solid rgba(255,107,53,0.16)' }}>
                // ARCHITECT COUNCIL
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {architects.map(v => (
                  <VoyagerCard key={v.id} voyager={v} user={user} isAtLeast={isAtLeast}
                    onEditClick={openEdit} isArchitect />
                ))}
              </div>
            </section>
          )}

          {activeVoyagers.length > 0 && (
            <section>
              <div style={{ color: '#4A5570', fontSize: 'var(--fs-caption)', fontFamily: 'var(--font-mono)', letterSpacing: '0.25em', marginBottom: '1rem', paddingBottom: '8px', borderBottom: '1px solid rgba(255,107,53,0.16)' }}>
                // ACTIVE VOYAGERS
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeVoyagers.map(v => (
                  <VoyagerCard key={v.id} voyager={v} user={user} isAtLeast={isAtLeast}
                    onEditClick={openEdit} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>VOYAGER REGISTRY</div>
      </div>

      {/* ── Edit Modal ── */}
      {editing && form && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(5,8,18,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={closeEdit}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0D1020', border: '1px solid #E85A00', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', fontFamily: 'var(--font-mono)' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ color: '#E85A00', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em' }}>// EDIT PROFILE</div>
              <button onClick={closeEdit} style={{ background: 'none', border: 'none', color: '#4A5570', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                <XClose size={16} />
              </button>
            </div>

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
                  style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '24px', height: '24px', borderRadius: '50%', background: '#111525', border: '1px solid #E85A00', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#E85A00' }}
                >
                  <Camera size={11} />
                </div>
              </div>
              <input ref={modalFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
            </div>

            {/* Fields */}
            <FieldGroup>
              <Field label="DISPLAY NAME">
                <input style={FIELD_INPUT} value={form.display_name} onChange={e => setF('display_name', e.target.value)} />
              </Field>
              <Field label="LOCATION">
                <input style={FIELD_INPUT} value={form.location} onChange={e => setF('location', e.target.value)} placeholder="City, Country" />
              </Field>
            </FieldGroup>

            <Field label={`BIO (${form.bio.length} / ${BIO_LIMIT})`}>
              <textarea
                style={{ ...FIELD_INPUT, minHeight: '80px', resize: 'vertical' }}
                value={form.bio}
                maxLength={BIO_LIMIT}
                onChange={e => setF('bio', e.target.value)}
                placeholder="A short description of your role in the Collective..."
              />
              {form.bio.length >= BIO_LIMIT && (
                <div style={{ color: '#E83030', fontSize: 'var(--fs-caption)', marginTop: '3px', letterSpacing: '0.05em' }}>Character limit reached</div>
              )}
            </Field>

            <div style={{ color: '#4A5570', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', margin: '16px 0 8px' }}>// SOCIAL LINKS</div>
            <FieldGroup>
              <Field label="X / TWITTER (full URL)">
                <input style={FIELD_INPUT} value={form.social_x} onChange={e => setF('social_x', e.target.value)} placeholder="https://x.com/yourhandle" />
              </Field>
              <Field label="INSTAGRAM (full URL)">
                <input style={FIELD_INPUT} value={form.social_instagram} onChange={e => setF('social_instagram', e.target.value)} placeholder="https://instagram.com/yourhandle" />
              </Field>
              <Field label="LINKEDIN (full URL)">
                <input style={FIELD_INPUT} value={form.social_linkedin} onChange={e => setF('social_linkedin', e.target.value)} placeholder="https://linkedin.com/in/yourhandle" />
              </Field>
            </FieldGroup>

            <div style={{ color: '#4A5570', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', margin: '16px 0 8px' }}>// FIELD DATA</div>
            <FieldGroup cols={2}>
              <Field label="OBSERVATION DAYS">
                <input style={FIELD_INPUT} type="number" min="0" value={form.observation_days} onChange={e => setF('observation_days', e.target.value)} />
              </Field>
              <Field label="WORLDS DISCOVERED">
                <input style={FIELD_INPUT} type="number" min="0" value={form.worlds_discovered} onChange={e => setF('worlds_discovered', e.target.value)} />
              </Field>
            </FieldGroup>

            {saveMsg && (
              <div style={{ marginBottom: '12px', padding: '7px 10px', background: saveMsg.ok ? 'rgba(32,216,144,0.08)' : 'rgba(232,48,48,0.08)', border: `1px solid ${saveMsg.ok ? '#20D890' : '#E83030'}`, color: saveMsg.ok ? '#20D890' : '#E83030', fontSize: 'var(--fs-label)', letterSpacing: '0.05em' }}>
                {saveMsg.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button onClick={closeEdit} className="btn-ghost" style={{ padding: '0.5rem 1.1rem', fontSize: 'var(--fs-caption)' }}>
                CANCEL
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-secondary"
                style={{ padding: '0.5rem 1.4rem', fontSize: 'var(--fs-caption)', opacity: saving ? 0.5 : 1 }}
              >
                {saving ? 'SAVING...' : 'SAVE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Small form helpers ─────────────────────────────────────────────────────
const FIELD_INPUT: React.CSSProperties = {
  width: '100%', background: '#111525', border: '1px solid rgba(255,107,53,0.16)', color: '#EDE8DE',
  padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', outline: 'none',
  boxSizing: 'border-box',
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', color: '#4A5570', fontSize: 'var(--fs-caption)', letterSpacing: '0.15em', marginBottom: '4px' }}>{label}</label>
      {children}
    </div>
  )
}
function FieldGroup({ cols = 1, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px', marginBottom: '10px' }}>
      {children}
    </div>
  )
}

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
  const color    = accentColor(voyager.display_name)
  const initStr  = getInitials(voyager.display_name)
  const isOwn    = isAtLeast('voyager') && user?.id === voyager.id
  const avatarSrc = voyager.avatar_url ?? null

  const links = [
    voyager.social_x         && { key: 'x',  icon: <XIcon />,         href: voyager.social_x },
    voyager.social_instagram && { key: 'ig', icon: <InstagramIcon />,  href: voyager.social_instagram },
    voyager.social_linkedin  && { key: 'li', icon: <LinkedInIcon />,   href: voyager.social_linkedin },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; href: string }[]

  return (
    <div
      onClick={isOwn ? () => onEditClick(voyager) : undefined}
      className="border p-4 transition-all duration-200"
      style={{
        background: '#111525',
        borderColor: isOwn ? `${color}55` : isArchitect ? 'rgba(232,90,0,0.18)' : 'rgba(255,107,53,0.16)',
        boxShadow: isOwn ? `0 0 12px ${color}15` : 'inset 0 1px 0 rgba(232,90,0,0.04)',
        cursor: isOwn ? 'pointer' : 'default',
      }}
    >
      {/* Avatar + name row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative shrink-0">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-mono font-bold overflow-hidden"
            style={{ background: avatarSrc ? 'transparent' : `${color}18`, color, border: `2px solid ${color}40`, boxShadow: `0 0 10px ${color}18` }}
          >
            {avatarSrc
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatarSrc} alt={voyager.display_name} className="w-full h-full object-cover" />
              : initStr}
          </div>
          {isOwn && (
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border"
              style={{ background: '#111525', borderColor: '#E85A00', color: '#E85A00' }}
            >
              <Camera size={10} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono font-semibold" style={{ color: '#EDE8DE' }}>
              {voyager.display_name}
            </span>
            {isOwn && (
              <span className="text-xs font-mono px-1.5 py-0.5 border" style={{ color: '#E85A00', borderColor: 'rgba(232,90,0,0.4)', background: 'rgba(232,90,0,0.08)' }}>
                YOU
              </span>
            )}
            {isArchitect && (
              <span className="text-xs font-mono px-1.5 py-0.5 border" style={{ color: '#E8A020', borderColor: 'rgba(232,160,32,0.35)', background: 'rgba(232,160,32,0.06)' }}>
                ARCHITECT
              </span>
            )}
          </div>
          {voyager.location && (
            <div className="text-xs font-mono mt-0.5" style={{ color: '#4A5570' }}>{voyager.location}</div>
          )}
          <div className="text-xs font-mono" style={{ color: '#4A5570' }}>
            joined {formatJoinDate(voyager.joined_at)}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-3 py-2 border-y" style={{ borderColor: 'rgba(255,107,53,0.16)' }}>
        <div className="text-center flex-1">
          <div className="text-xl font-mono font-bold" style={{ color: '#E85A00', textShadow: '0 0 10px rgba(232,90,0,0.4)' }}>
            {voyager.observation_days}
          </div>
          <div className="text-xs font-mono" style={{ color: '#4A5570' }}>OBS DAYS</div>
        </div>
        <div className="w-px" style={{ background: 'rgba(255,107,53,0.16)' }} />
        <div className="text-center flex-1">
          <div className="text-xl font-mono font-bold" style={{ color: '#20D890', textShadow: '0 0 10px rgba(32,216,144,0.3)' }}>
            {voyager.worlds_discovered}
          </div>
          <div className="text-xs font-mono" style={{ color: '#4A5570' }}>WORLDS</div>
        </div>
      </div>

      {/* Bio — 240 char display limit */}
      <p className="text-xs leading-relaxed font-mono mb-3" style={{ color: '#8A9AB5' }}>
        {voyager.bio
          ? (voyager.bio.length > 240 ? voyager.bio.slice(0, 240) + '…' : voyager.bio)
          : '—'}
      </p>

      {/* Social links — stop card click from propagating */}
      {links.length > 0 && (
        <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'rgba(255,107,53,0.16)' }}>
          {links.map(({ key, icon, href }) => (
            <a key={key} href={href} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center justify-center w-7 h-7 border transition-colors"
              style={{ borderColor: 'rgba(255,107,53,0.16)', color: '#4A5570', borderRadius: '2px' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(242,240,230,0.2)'; (e.currentTarget as HTMLElement).style.color = '#8A9AB5' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,107,53,0.16)'; (e.currentTarget as HTMLElement).style.color = '#4A5570' }}
            >
              {icon}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
