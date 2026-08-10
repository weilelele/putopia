'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Camera, LogOut } from 'lucide-react'
import { getMyProfile, updateProfile, uploadAvatar } from '@/lib/actions/profile'
import { getMyOrders, type VoyagerOrder } from '@/lib/actions/orders'
import { useAuth } from '@/lib/auth-context'
import { BackLink } from '@/components/back-link'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { ArchiveRouteError, ArchiveRouteLoading } from '@/components/archive-route-state'

// ── helpers (mirrors /voyagers) ─────────────────────────────────────────────
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
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

const BIO_LIMIT = 240
function FieldGroup({ children, cols = 1 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={cols === 2 ? 'profile-field-grid profile-field-grid--two' : 'profile-field-grid'}>
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
    <ArchiveCard style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ color: 'rgba(245,245,245,0.55)', fontSize: 'var(--fs-caption)', letterSpacing: '0.16em' }}>{total > 1 ? `ORDER #${total - index}` : 'MY VOYAGER PACK'}
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
                <div style={{ height: '3px', borderRadius: '2px', background: done ? '#E35205' : 'rgba(245,245,245,0.12)' }} />
                <div style={{
                  marginTop: '7px', fontSize: 'var(--fs-caption)', letterSpacing: '0.08em',
                  color: i === activeIdx ? '#E35205' : done ? 'rgba(245,245,245,0.6)' : 'rgba(245,245,245,0.3)',
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
               style={{ color: '#E35205', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', textDecoration: 'none' }}>
              TRACK ↗
            </a>
          )}
        </div>
      )}
    </ArchiveCard>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { logout } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null)
  const [orders, setOrders] = useState<VoyagerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [ordersExpanded, setOrdersExpanded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadProfileData = useCallback(async () => {
    await Promise.resolve()
    setLoading(true)
    setLoadError(false)
    try {
      const [p, o] = await Promise.all([getMyProfile(), getMyOrders()])
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
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(loadProfileData)
  }, [loadProfileData])

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
    return <ArchiveRouteLoading label="LOADING PROFILE" />
  }

  if (loadError) {
    return (
      <ArchiveRouteError
        title="PROFILE UNAVAILABLE"
        description="Your profile and order history could not be retrieved. No account data was changed."
        onRetry={loadProfileData}
        returnHref="/console"
        returnLabel="DASHBOARD"
      />
    )
  }

  if (!profile || !form) {
    return (
      <div className="main">
        <div style={{ color: 'rgba(245,245,245,0.5)', fontFamily: 'var(--font-mono)', padding: '60px 0', textAlign: 'center' }}>
          No profile found. <Link href="/login" style={{ color: '#E35205' }}>Sign in</Link>
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
        <ArchiveButton
          onClick={() => logout()}
          variant="ghost"
        >
          <LogOut size={12} />
          LOGOUT
        </ArchiveButton>
      </div>

      {/* Identity header */}
      <ArchiveCard style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: '76px', height: '76px', borderRadius: '50%', overflow: 'hidden',
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
              <button
                type="button"
                aria-label="Change profile image"
                onClick={() => fileRef.current?.click()}
                className="profile-avatar-edit"
              >
                <Camera size={11} />
              </button>
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
              <ArchiveLinkButton href="/voyager-path" variant="ghost">UPGRADE</ArchiveLinkButton>
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
      </ArchiveCard>

      {/* Edit form — Voyagers+ only; Applicants see a locked notice */}
      {!canEdit ? (
        <ArchiveCard style={{ maxWidth: '640px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <ArchiveSectionLabel>PROFILE LOCKED</ArchiveSectionLabel>
            <p style={{ margin: 0, fontSize: 'var(--fs-label)', color: 'rgba(245,245,245,0.55)', lineHeight: 1.65 }}>
              Set up your avatar, bio and links once you become a Voyager.
            </p>
          </div>
          <ArchiveLinkButton href="/voyager-path" variant="primary">VIEW YOUR PATH</ArchiveLinkButton>
        </ArchiveCard>
      ) : (
      <ArchiveCard style={{ maxWidth: '640px' }}>
        <ArchiveSectionLabel>PROFILE DETAILS</ArchiveSectionLabel>

        <FieldGroup cols={2}>
          <ArchiveField htmlFor="profile-display-name" label="DISPLAY NAME">
            <input id="profile-display-name" value={form.display_name} onChange={(e) => setF('display_name', e.target.value)} />
          </ArchiveField>
          <ArchiveField htmlFor="profile-location" label="LOCATION">
            <input id="profile-location" value={form.location} onChange={(e) => setF('location', e.target.value)} placeholder="City, Country" />
          </ArchiveField>
        </FieldGroup>

        <ArchiveField htmlFor="profile-bio" label={`BIO (${form.bio.length} / ${BIO_LIMIT})`}>
          <textarea
            id="profile-bio"
            value={form.bio}
            maxLength={BIO_LIMIT}
            onChange={(e) => setF('bio', e.target.value)}
            placeholder="A short description of your role in the Collective..."
          />
        </ArchiveField>

        <ArchiveSectionLabel className="profile-social-label">SOCIAL LINKS</ArchiveSectionLabel>
        <FieldGroup>
          <ArchiveField htmlFor="profile-x" label="X / TWITTER (FULL URL)">
            <input id="profile-x" value={form.social_x} onChange={(e) => setF('social_x', e.target.value)} placeholder="https://x.com/yourhandle" />
          </ArchiveField>
          <ArchiveField htmlFor="profile-instagram" label="INSTAGRAM (FULL URL)">
            <input id="profile-instagram" value={form.social_instagram} onChange={(e) => setF('social_instagram', e.target.value)} placeholder="https://instagram.com/yourhandle" />
          </ArchiveField>
          <ArchiveField htmlFor="profile-linkedin" label="LINKEDIN (FULL URL)">
            <input id="profile-linkedin" value={form.social_linkedin} onChange={(e) => setF('social_linkedin', e.target.value)} placeholder="https://linkedin.com/in/yourhandle" />
          </ArchiveField>
        </FieldGroup>

        {saveMsg && (
          <div style={{ margin: '12px 0', padding: '7px 10px', background: saveMsg.ok ? 'rgba(32,216,144,0.08)' : 'rgba(232,48,48,0.08)', border: `1px solid ${saveMsg.ok ? '#20D890' : '#E83030'}`, color: saveMsg.ok ? '#20D890' : '#E83030', fontSize: 'var(--fs-label)', letterSpacing: '0.05em' }}>
            {saveMsg.text}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <ArchiveButton onClick={handleSave} disabled={saving}>
            {saving ? 'SAVING...' : 'SAVE'}
          </ArchiveButton>
        </div>
      </ArchiveCard>
      )}

      {/* Fulfillment follows identity editing. Keep the current order visible;
          older orders are available on demand instead of pushing the profile
          form several screens below the fold. */}
      {canEdit && orders.length > 0 && (
        <section className="profile-fulfillment">
          <ArchiveSectionLabel>FULFILLMENT</ArchiveSectionLabel>
          <PackTracker order={orders[0]} index={0} total={orders.length} />
          {ordersExpanded && orders.slice(1).map((order, index) => (
            <PackTracker key={order.id} order={order} index={index + 1} total={orders.length} />
          ))}
          {orders.length > 1 && (
            <ArchiveButton
              onClick={() => setOrdersExpanded((expanded) => !expanded)}
              variant="ghost"
              className="profile-order-toggle"
              aria-expanded={ordersExpanded}
            >
              {ordersExpanded ? 'HIDE PREVIOUS ORDERS' : `VIEW ${orders.length - 1} PREVIOUS ORDERS`}
            </ArchiveButton>
          )}
        </section>
      )}
    </div>
  )
}
