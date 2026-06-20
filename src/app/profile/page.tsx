'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Camera, LogOut } from 'lucide-react'
import { getMyProfile, updateProfile, uploadAvatar } from '@/lib/actions/profile'
import { getMyOrders, type VoyagerOrder } from '@/lib/actions/orders'
import { useAuth } from '@/lib/auth-context'
import { BackLink } from '@/components/back-link'

// ── helpers (mirrors /voyagers) ─────────────────────────────────────────────
const ACCENT_COLORS = [
  '#E8A020', '#D4601A', '#FF8A5C', '#FFB020',
  '#C43020', '#C4A96A', '#B5430A', '#FF6B35', '#E85D04',
]
function accentColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length]
}
function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

const BIO_LIMIT = 240
const FIELD_INPUT: React.CSSProperties = {
  width: '100%', background: '#151B3A', border: '1px solid rgba(255,107,53,0.16)', color: '#F5F5F5',
  padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', outline: 'none',
  boxSizing: 'border-box',
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.15em', marginBottom: '4px' }}>{label}</label>
      {children}
    </div>
  )
}
function FieldGroup({ children, cols = 1 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '12px', marginBottom: '12px' }}>
      {children}
    </div>
  )
}

type EditForm = {
  display_name: string
  location: string
  bio: string
  social_x: string
  social_instagram: string
  social_linkedin: string
}

// ── Pack fulfillment timeline ───────────────────────────────────────────────
const PACK_STEPS = ['paid', 'preparing', 'shipped', 'delivered'] as const
const STEP_LABEL: Record<string, string> = {
  paid: 'Paid', preparing: 'Preparing', shipped: 'Shipped', delivered: 'Delivered',
}

function PackTracker({ order, index, total }: { order: VoyagerOrder; index: number; total: number }) {
  const refunded = order.status === 'refunded' || order.status === 'canceled'
  const activeIdx = Math.max(0, PACK_STEPS.indexOf(order.status as (typeof PACK_STEPS)[number]))
  const date = new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div style={{ border: '1px solid rgba(255,107,53,0.2)', background: '#0F1430', padding: '18px 20px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.22em' }}>{"// ORDER"}{total > 1 ? `#${total - index}` : 'MY VOYAGER PACK'}
        </div>
        <div style={{ color: 'rgba(245,245,245,0.3)', fontSize: 'var(--fs-caption)', letterSpacing: '0.08em' }}>
          {date}
        </div>
      </div>

      {refunded ? (
        <div style={{ color: '#E83030', fontSize: 'var(--fs-label)', letterSpacing: '0.05em' }}>
          This order was {order.status}.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '6px' }}>
          {PACK_STEPS.map((step, i) => {
            const done = i <= activeIdx
            return (
              <div key={step} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: '3px', borderRadius: '2px', background: done ? '#FF6B35' : 'rgba(245,245,245,0.12)' }} />
                <div style={{
                  marginTop: '7px', fontSize: 'var(--fs-caption)', letterSpacing: '0.08em',
                  color: i === activeIdx ? '#FF6B35' : done ? 'rgba(245,245,245,0.6)' : 'rgba(245,245,245,0.3)',
                }}>
                  {STEP_LABEL[step]}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {order.tracking_number && (
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(245,245,245,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: 'var(--fs-label)', color: 'rgba(245,245,245,0.6)' }}>
            {order.carrier ? `${order.carrier} · ` : ''}<span style={{ color: '#F5F5F5' }}>{order.tracking_number}</span>
          </div>
          {order.tracking_url && (
            <a href={order.tracking_url} target="_blank" rel="noopener noreferrer"
               style={{ color: '#FF6B35', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', textDecoration: 'none' }}>
              TRACK ↗
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { logout } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null)
  const [orders, setOrders] = useState<VoyagerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<EditForm | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([getMyProfile(), getMyOrders()]).then(([p, o]) => {
      setProfile(p)
      setOrders(o)
      if (p) {
        setForm({
          display_name: p.display_name ?? '',
          location: p.location ?? '',
          bio: p.bio ?? '',
          social_x: p.social_x ?? '',
          social_instagram: p.social_instagram ?? '',
          social_linkedin: p.social_linkedin ?? '',
        })
      }
      setLoading(false)
    })
  }, [])

  const setF = (k: keyof EditForm, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f))

  const onAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!form || !profile) return
    setSaving(true); setSaveMsg(null)

    if (avatarFile) {
      const fd = new FormData()
      fd.append('avatar', avatarFile)
      const { error } = await uploadAvatar(fd)
      if (error) { setSaveMsg({ text: `Avatar upload failed: ${error}`, ok: false }); setSaving(false); return }
    }

    const result = await updateProfile({
      display_name: form.display_name.trim() || profile.display_name,
      location: form.location.trim() || null,
      bio: form.bio.slice(0, BIO_LIMIT) || null,
      social_x: form.social_x.trim() || null,
      social_instagram: form.social_instagram.trim() || null,
      social_linkedin: form.social_linkedin.trim() || null,
    })

    setSaving(false)
    if (result?.error) {
      setSaveMsg({ text: result.error, ok: false })
    } else {
      setSaveMsg({ text: 'Saved ✓', ok: true })
      const fresh = await getMyProfile()
      setProfile(fresh)
      setAvatarFile(null)
    }
  }

  if (loading) {
    return (
      <div className="main">
        <div style={{ color: 'rgba(245,245,245,0.35)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', padding: '60px 0', textAlign: 'center', letterSpacing: '0.15em' }}>
          LOADING PROFILE...
        </div>
      </div>
    )
  }

  if (!profile || !form) {
    return (
      <div className="main">
        <div style={{ color: 'rgba(245,245,245,0.5)', fontFamily: 'var(--font-mono)', padding: '60px 0', textAlign: 'center' }}>
          No profile found. <Link href="/login" style={{ color: '#FF6B35' }}>Sign in</Link>
        </div>
      </div>
    )
  }

  const accent = accentColor(profile.display_name)
  const isPureVoyager = profile.role === 'voyager'
  const isApplicant = profile.role === 'applicant'
  // Only Voyagers/Architects (i.e. people who have actually paid in) may edit
  // their dossier and see pack fulfillment. Applicants get a locked state.
  const canEdit = profile.role === 'voyager' || profile.role === 'architect'

  return (
    <div className="main">
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> PROFILE</div>
      </div>

      <div className="page-head">
        <div>
          <BackLink href="/voyagers" label="VOYAGERS" />
          <h1><span className="accent">PROFILE</span></h1>
        </div>
        <button
          onClick={() => logout()}
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1.1rem', fontSize: 'var(--fs-caption)' }}
        >
          <LogOut size={12} />
          LOGOUT
        </button>
      </div>

      {/* Identity header */}
      <div style={{ display: 'flex', gap: '18px', alignItems: 'center', border: '1px solid rgba(255,107,53,0.2)', background: '#0F1430', padding: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <div
            onClick={canEdit ? () => fileRef.current?.click() : undefined}
            style={{
              width: '76px', height: '76px', borderRadius: '50%', overflow: 'hidden', cursor: canEdit ? 'pointer' : 'default',
              background: avatarPreview || profile.avatar_url ? 'transparent' : `${accent}18`,
              border: `2px solid ${accent}60`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: accent, fontSize: 'var(--fs-title)', fontWeight: 'bold',
            }}
          >
            {(avatarPreview || profile.avatar_url)
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatarPreview ?? profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : getInitials(profile.display_name)}
          </div>
          {canEdit && (
            <>
              <div onClick={() => fileRef.current?.click()}
                   style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '24px', height: '24px', borderRadius: '50%', background: '#151B3A', border: '1px solid #E85D04', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#E85D04' }}>
                <Camera size={11} />
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />
            </>
          )}
        </div>

        <div style={{ flex: 1, minWidth: '180px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-title)', color: '#F5F5F5', fontWeight: 700 }}>
            {profile.display_name}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: accent, border: `1px solid ${accent}55`, padding: '2px 8px', textTransform: 'uppercase' }}>
              {profile.role}
            </span>

            {/* Applicant: inline upgrade CTA */}
            {isApplicant && (
              <Link
                href="/voyager-path"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: 'var(--fs-caption)', letterSpacing: '0.14em',
                  color: '#FF6B35', border: '1px solid rgba(255,107,53,0.45)',
                  background: 'rgba(255,107,53,0.08)',
                  padding: '2px 10px', textDecoration: 'none',
                  fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
                }}
              >
                ↑ UPGRADE
              </Link>
            )}

            {/* Only Voyagers carry a member number + batch; Architects do not. */}
            {isPureVoyager && profile.member_no != null && (
              <span style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', color: 'rgba(245,245,245,0.6)' }}>
                VOYAGER #{String(profile.member_no).padStart(3, '0')}
              </span>
            )}
            {isPureVoyager && profile.batch_label && (
              <span style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', color: 'rgba(245,245,245,0.6)' }}>
                · {profile.batch_label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pack tracking — only for Voyagers+ who have actually paid in */}
      {canEdit && orders.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          {orders.map((o, i) => (
            <PackTracker key={o.id} order={o} index={i} total={orders.length} />
          ))}
        </div>
      )}

      {/* Edit form — Voyagers+ only; Applicants see a locked notice */}
      {!canEdit ? (
        <div style={{ border: '1px solid rgba(255,107,53,0.16)', background: '#0F1430', padding: '22px 20px', fontFamily: 'var(--font-mono)', maxWidth: '640px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em', marginBottom: 8 }}>{"// PROFILE LOCKED"}</div>
            <p style={{ margin: 0, fontSize: 'var(--fs-label)', color: 'rgba(245,245,245,0.55)', lineHeight: 1.65 }}>
              Set up your avatar, bio and links once you become a Voyager.
            </p>
          </div>
          <Link
            href="/voyager-path"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #E85D04, #C04000)',
              border: '1px solid rgba(232,93,4,0.5)', color: '#F5F5F5', fontWeight: 700,
              letterSpacing: '0.12em', padding: '9px 20px', textDecoration: 'none',
              fontSize: 'var(--fs-caption)', whiteSpace: 'nowrap',
            }}
          >
            VIEW YOUR PATH →
          </Link>
        </div>
      ) : (
      <div style={{ border: '1px solid rgba(255,107,53,0.16)', background: '#0F1430', padding: '20px', fontFamily: 'var(--font-mono)', maxWidth: '640px' }}>
        <div style={{ color: '#E85D04', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em', marginBottom: '18px' }}>{"// ADD YOUR INFO"}</div>

        <FieldGroup cols={2}>
          <Field label="DISPLAY NAME">
            <input style={FIELD_INPUT} value={form.display_name} onChange={(e) => setF('display_name', e.target.value)} />
          </Field>
          <Field label="LOCATION">
            <input style={FIELD_INPUT} value={form.location} onChange={(e) => setF('location', e.target.value)} placeholder="City, Country" />
          </Field>
        </FieldGroup>

        <Field label={`BIO (${form.bio.length} / ${BIO_LIMIT})`}>
          <textarea
            style={{ ...FIELD_INPUT, minHeight: '80px', resize: 'vertical' }}
            value={form.bio}
            maxLength={BIO_LIMIT}
            onChange={(e) => setF('bio', e.target.value)}
            placeholder="A short description of your role in the Collective..."
          />
        </Field>

        <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', margin: '16px 0 8px' }}>{"// SOCIAL LINKS"}</div>
        <FieldGroup>
          <Field label="X / TWITTER (full URL)">
            <input style={FIELD_INPUT} value={form.social_x} onChange={(e) => setF('social_x', e.target.value)} placeholder="https://x.com/yourhandle" />
          </Field>
          <Field label="INSTAGRAM (full URL)">
            <input style={FIELD_INPUT} value={form.social_instagram} onChange={(e) => setF('social_instagram', e.target.value)} placeholder="https://instagram.com/yourhandle" />
          </Field>
          <Field label="LINKEDIN (full URL)">
            <input style={FIELD_INPUT} value={form.social_linkedin} onChange={(e) => setF('social_linkedin', e.target.value)} placeholder="https://linkedin.com/in/yourhandle" />
          </Field>
        </FieldGroup>

        {saveMsg && (
          <div style={{ margin: '12px 0', padding: '7px 10px', background: saveMsg.ok ? 'rgba(32,216,144,0.08)' : 'rgba(232,48,48,0.08)', border: `1px solid ${saveMsg.ok ? '#20D890' : '#E83030'}`, color: saveMsg.ok ? '#20D890' : '#E83030', fontSize: 'var(--fs-label)', letterSpacing: '0.05em' }}>
            {saveMsg.text}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button onClick={handleSave} disabled={saving} className="btn-secondary" style={{ padding: '0.5rem 1.4rem', fontSize: 'var(--fs-caption)', opacity: saving ? 0.5 : 1 }}>
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      </div>
      )}
    </div>
  )
}
