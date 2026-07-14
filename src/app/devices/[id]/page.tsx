'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getDeviceById } from '@/lib/actions/devices'
import posthog from 'posthog-js'
import type { Device } from '@/types/database'
import { CommentThread } from '@/components/comment-thread'

const STATUS_STYLES: Record<string, { color: string; border: string }> = {
  available:    { color: '#20D890', border: 'rgba(32,216,144,0.3)' },
  needs_repair: { color: '#E83030', border: 'rgba(232,48,48,0.3)' },
  in_use:       { color: '#C84406', border: 'rgba(200,68,6,0.3)' },
  unknown:      { color: 'rgba(245,245,245,0.35)', border: 'rgba(227,82,5,0.16)' },
}
const STATUS_LABELS: Record<string, string> = {
  available: 'AVAILABLE', needs_repair: 'NEEDS REPAIR', in_use: 'IN USE', unknown: 'UNKNOWN',
}

function DevicePlaceholder({ id }: { id: string }) {
  const seed = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const hue1 = (seed * 37) % 360
  const cx = 60 + (seed % 40)
  const cy = 60 + ((seed * 3) % 40)
  const r1 = 30 + (seed % 20)
  const r2 = 15 + (seed % 15)
  return (
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
      <rect width="160" height="120" fill="#0F1430" />
      {[20, 40, 60, 80, 100, 120, 140].map((x) => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="120" stroke="rgba(227,82,5,0.16)" strokeWidth="0.5" opacity="0.5" />
      ))}
      {[20, 40, 60, 80, 100].map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2="160" y2={y} stroke="rgba(227,82,5,0.16)" strokeWidth="0.5" opacity="0.5" />
      ))}
      <circle cx={cx} cy={cy} r={r1} fill="none" stroke={`hsl(${hue1},60%,45%)`} strokeWidth="1" opacity="0.6" />
      <circle cx={cx} cy={cy} r={r2} fill="none" stroke={`hsl(${hue1},60%,55%)`} strokeWidth="0.8" opacity="0.5" />
      <circle cx={cx} cy={cy} r="4" fill={`hsl(${hue1},70%,50%)`} opacity="0.8" />
    </svg>
  )
}

export default function DeviceDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [device, setDevice] = useState<Device | null | undefined>(undefined)

  useEffect(() => {
    getDeviceById(id).then((d) => {
      setDevice((d as Device) ?? null)
      if (d) posthog.capture('device_viewed', { device_id: id, device_knowledge: (d as Device).knowledge })
    })
  }, [id])

  if (device === undefined) {
    return (
      <div className="main" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.18em' }}>LOADING...</div>
      </div>
    )
  }

  if (!device) {
    return (
      <div className="main" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', color: 'var(--color-fault)', marginBottom: '1rem' }}>[ 404 ]</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-deep)', marginBottom: '1.5rem' }}>DEVICE NOT FOUND</div>
        <Link href="/devices" className="btn-ghost">← RETURN</Link>
      </div>
    )
  }

  const isUnknown = device.knowledge === 'unknown'
  const statusKey = (device.status ?? 'unknown')
  const statusStyle = STATUS_STYLES[statusKey] ?? STATUS_STYLES.unknown

  return (
    <div className="main">
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> DEVICE ARCHIVE <span>/</span> {device.id}</div>
        <div className="right">
          <div className="item">CLASS <span className="val">{isUnknown ? 'UNKNOWN' : 'KNOWN'}</span></div>
        </div>
      </div>

      <div style={{ maxWidth: '720px', width: '100%' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/devices" className="btn-ghost" style={{ display: 'inline-flex' }}>← DEVICE ARCHIVE</Link>
        </div>

        {/* Device image */}
        <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', border: '1px solid var(--bd-faint)', marginBottom: '1.25rem', position: 'relative', background: '#0F1430' }}>
          {device.image_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={device.image_path} alt={device.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: isUnknown ? 'grayscale(60%) brightness(0.75)' : 'none' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', filter: isUnknown ? 'grayscale(60%) brightness(0.75)' : 'none' }}>
              <DevicePlaceholder id={device.id} />
            </div>
          )}
          {isUnknown && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'rgba(74,85,112,0.35)' }} />}
        </div>

        {/* HUD frame: device info */}
        <div className="hud-frame" style={{ marginBottom: '2rem', opacity: isUnknown ? 0.85 : 1 }}>
          <div className="hud-tick-rail hud-tick-left" />
          <div className="hud-tick-rail hud-tick-right" />
          <div style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: 'var(--color-star-deep)' }}>{device.id}</span>
              <span className="label-tag" style={{ color: statusStyle.color, border: `1px solid ${statusStyle.border}`, padding: '0.1rem 0.45rem' }}>
                {isUnknown ? '?' : (STATUS_LABELS[statusKey] ?? statusKey)}
              </span>
            </div>

            <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--fs-h3)', color: isUnknown ? 'rgba(245,245,245,0.55)' : 'var(--color-star)', marginBottom: '0.75rem', lineHeight: 1.3 }}>
              {device.name}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', marginBottom: '1rem' }}>
              <span>◎</span><span>{device.location}</span>
            </div>

            {/* Unknown → exploration progress */}
            {isUnknown && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(227,82,5,0.4)', marginBottom: '0.3rem' }}>
                  <span>EXPLORATION PROGRESS</span><span>{device.exploration_progress}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${device.exploration_progress}%`, opacity: 0.5 }} />
                </div>
              </div>
            )}

            {/* Known → in-use operator */}
            {!isUnknown && device.status === 'in_use' && device.current_user_name && (
              <div style={{ marginBottom: '1rem', padding: '0.3rem 0.6rem', border: '1px solid rgba(200,68,6,0.2)', background: 'rgba(200,68,6,0.04)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.55)', display: 'inline-block' }}>
                <span style={{ color: 'rgba(245,245,245,0.35)' }}>IN USE: </span>{device.current_user_name}
              </div>
            )}

            <div className="hr-cyan" />
            <article style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
              {device.description || (isUnknown ? 'Signal uncontacted. Details classified until exploration completes.' : 'No description on file.')}
            </article>
          </div>
        </div>

        {/* Transmissions / comments */}
        <CommentThread subjectType="device" subjectId={device.id} subjectTitle={device.name} posthogEvent="device_comment_sent" />
      </div>

      <div className="footer-bar" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>PUTOPIA.COLLECTIVE</div>
      </div>
    </div>
  )
}
