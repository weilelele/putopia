'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getAllDevices } from '@/lib/actions/devices'
import { getMcFunctions } from '@/lib/actions/mc-functions'
import { useAuth } from '@/lib/auth-context'
import type { Device, McFunction } from '@/types/database'
import { SectionTracker } from '@/components/section-tracker'
import { McConsolePanel } from '@/components/mc-console-panel'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkCard } from '@/components/archive-link-card'
import { ArchivePageHeader } from '@/components/archive-page-header'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { ArchiveStatStrip } from '@/components/archive-stat-strip'
import { ArchiveRouteError, ArchiveRouteLoading } from '@/components/archive-route-state'

const STATUS_STYLES = {
  available:    { color: '#20D890', bg: 'rgba(32,216,144,0.08)', border: 'rgba(32,216,144,0.3)' },
  needs_repair: { color: '#E83030', bg: 'rgba(232,48,48,0.08)', border: 'rgba(232,48,48,0.3)' },
  in_use:       { color: '#C84406', bg: 'rgba(200,68,6,0.08)', border: 'rgba(200,68,6,0.3)' },
  unknown:      { color: 'rgba(245,245,245,0.35)', bg: 'transparent', border: 'rgba(227,82,5,0.16)' },
}

const STATUS_LABELS = {
  available:    'AVAILABLE',
  needs_repair: 'NEEDS REPAIR',
  in_use:       'IN USE',
  unknown:      'UNKNOWN',
}

function DevicePlaceholder({ id }: { id: string }) {
  const seed = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const hue1 = (seed * 37) % 360
  const hue2 = (seed * 79) % 360
  const cx = 60 + (seed % 40)
  const cy = 60 + ((seed * 3) % 40)
  const r1 = 30 + (seed % 20)
  const r2 = 15 + (seed % 15)
  const lineX = 20 + (seed % 100)

  return (
    <svg
      viewBox="0 0 160 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%' }}
    >
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
      <line x1={lineX} y1="10" x2={lineX + 20} y2="110" stroke={`hsl(${hue2},50%,40%)`} strokeWidth="1" opacity="0.4" />
      <line x1={lineX + 10} y1="10" x2={lineX + 30} y2="110" stroke={`hsl(${hue2},50%,40%)`} strokeWidth="0.5" opacity="0.3" />
      <line x1={cx - 15} y1={cy} x2={cx + 15} y2={cy} stroke="#C84406" strokeWidth="0.8" opacity="0.5" />
      <line x1={cx} y1={cy - 15} x2={cx} y2={cy + 15} stroke="#C84406" strokeWidth="0.8" opacity="0.5" />
      <path d="M5,5 L5,15 M5,5 L15,5" stroke="rgba(227,82,5,0.28)" strokeWidth="1.5" fill="none" />
      <path d="M155,5 L155,15 M155,5 L145,5" stroke="rgba(227,82,5,0.28)" strokeWidth="1.5" fill="none" />
      <path d="M5,115 L5,105 M5,115 L15,115" stroke="rgba(227,82,5,0.28)" strokeWidth="1.5" fill="none" />
      <path d="M155,115 L155,105 M155,115 L145,115" stroke="rgba(227,82,5,0.28)" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

function CairoClaimVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = 320
    canvas.height = 180

    let frame = 0
    let raf: number

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background
      ctx.fillStyle = '#0A0D1F'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Grid lines
      ctx.strokeStyle = 'rgba(200,68,6,0.12)'
      ctx.lineWidth = 0.5
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }

      // Pulse ring
      const t = frame / 60
      for (let i = 0; i < 3; i++) {
        const phase = (t + i * 0.5) % 2
        const r = phase * 55
        const alpha = Math.max(0, 0.45 - phase * 0.22)
        ctx.beginPath()
        ctx.arc(160, 90, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(200,68,6,${alpha})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Core dot
      const pulse = 0.7 + 0.3 * Math.sin(t * 3)
      ctx.beginPath()
      ctx.arc(160, 90, 4 * pulse, 0, Math.PI * 2)
      ctx.fillStyle = '#C84406'
      ctx.fill()

      // Cross hair
      ctx.strokeStyle = 'rgba(200,68,6,0.55)'
      ctx.lineWidth = 0.8
      ctx.beginPath(); ctx.moveTo(140, 90); ctx.lineTo(180, 90); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(160, 70); ctx.lineTo(160, 110); ctx.stroke()

      // Scanning line
      const scanY = ((frame * 1.2) % (canvas.height + 20)) - 10
      const grad = ctx.createLinearGradient(0, scanY - 8, 0, scanY + 8)
      grad.addColorStop(0,   'rgba(200,68,6,0)')
      grad.addColorStop(0.5, 'rgba(200,68,6,0.18)')
      grad.addColorStop(1,   'rgba(200,68,6,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, scanY - 8, canvas.width, 16)

      // Corner brackets
      const bLen = 12, bOff = 6
      ctx.strokeStyle = 'rgba(200,68,6,0.45)'
      ctx.lineWidth = 1.5
      ;[[bOff, bOff], [canvas.width - bOff, bOff], [bOff, canvas.height - bOff], [canvas.width - bOff, canvas.height - bOff]].forEach(([cx, cy], i) => {
        const sx = i % 2 === 0 ? 1 : -1
        const sy = i < 2 ? 1 : -1
        ctx.beginPath(); ctx.moveTo(cx, cy + sy * bLen); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * bLen, cy); ctx.stroke()
      })

      frame++
      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}

function DeviceImage({ device, isUnknown }: { device: Device; isUnknown: boolean }) {
  const filterOverlay = isUnknown
    ? 'rgba(74,85,112,0.45)'   // grey-blue tint for unknown
    : 'rgba(32,216,144,0.08)'  // very subtle green for known

  if (device.image_path) {
    return (
      <div className="w-full aspect-video overflow-hidden relative">
        <img
          src={device.image_path}
          alt={device.name}
          className="w-full h-full object-cover"
          style={{ filter: isUnknown ? 'grayscale(60%) brightness(0.75)' : 'none' }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: filterOverlay }} />
      </div>
    )
  }
  return (
    <div className="w-full aspect-video overflow-hidden relative" style={{ background: '#0F1430' }}>
      <DevicePlaceholder id={device.id} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: filterOverlay }} />
    </div>
  )
}

export default function DevicesPage() {
  const { isAtLeast } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [mcFunctions, setMcFunctions] = useState<McFunction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadDevices = useCallback(async () => {
    await Promise.resolve()
    setLoading(true)
    setLoadError(false)

    try {
      const deviceData = await getAllDevices()
      setDevices(deviceData)

      try {
        setMcFunctions(await getMcFunctions())
      } catch {
        // Console functions are supplemental; preserve access to the registry.
        setMcFunctions([])
      }
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(loadDevices)
  }, [loadDevices])

  const unknownDevices = devices.filter((d) => d.knowledge === 'unknown')
  const knownDevices   = devices.filter((d) => d.knowledge === 'known')

  return (
    <main className="main pilot-archive-page archive-collection-page archive-devices-page">
      <SectionTracker section="devices" />
      <ArchiveBrandHeader />
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> DEVICE ARCHIVE</div>
        <div className="right">
          <div className="item">UNKNOWN <span className="val">{loading ? '—' : unknownDevices.length}</span></div>
          <div className="item">KNOWN <span className="val">{loading ? '—' : knownDevices.length}</span></div>
        </div>
      </div>

      <ArchivePageHeader accent="REGISTRY" title="DEVICE" />

      <ArchiveStatStrip items={[
        { value: loading ? '—' : unknownDevices.length, label: 'UNKNOWN', color: 'var(--color-star-dim)' },
        { value: loading ? '—' : knownDevices.length, label: 'KNOWN', color: 'var(--color-ok)' },
        { value: loading ? '—' : devices.length, label: 'TOTAL DEVICES', color: 'var(--color-nucleus)' },
      ]} />

      {loading ? (
        <ArchiveRouteLoading className="archive-state-page archive-route-state-section" label="LOADING DEVICE REGISTRY" />
      ) : loadError ? (
        <ArchiveRouteError
          className="archive-state-page archive-route-state-section"
          title="DEVICE REGISTRY UNAVAILABLE"
          description="The Device registry could not be retrieved."
          onRetry={loadDevices}
        />
      ) : (
        <>
          {/* Multiverse Console showcase — confirmed functions + boot flicker */}
          <div style={{ marginBottom: '2.5rem' }}>
            <McConsolePanel mcFunctions={mcFunctions} />
          </div>

          {/* legacy spacer removed */}
          <div style={{ display: 'contents' }}>

      {/* FIRST BATCH CLAIM — Cairo Discovery — architect-only until Stripe is live */}
      {isAtLeast('architect') && <section className="mb-10">
        <ArchiveSectionLabel>FIRST BATCH · CAIRO DISCOVERY</ArchiveSectionLabel>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <ArchiveLinkCard
            href="/devices/claim"
            className="archive-device-card archive-device-claim-card col-span-2 md:col-span-1"
          >
            {/* Visual */}
            <div className="border-b w-full overflow-hidden relative" style={{ borderColor: 'rgba(227,82,5,0.35)', aspectRatio: '16/9' }}>
              <CairoClaimVisual />
              <div className="absolute top-2 right-2">
                <span
                  className="text-xs font-mono px-1.5 py-0.5 border"
                  style={{ color: '#070912', borderColor: '#E35205', background: '#E35205', fontWeight: 700 }}
                >
                  CLAIM
                </span>
              </div>
            </div>

            <div className="p-3">
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <div className="text-xs font-mono" style={{ color: '#E35205' }}>CAIRO-BATCH-01</div>
                  <div className="text-sm font-mono font-bold" style={{ color: '#F5F5F5' }}>FIRST PARTS PACK</div>
                </div>
                <span
                  className="text-xs font-mono px-1.5 py-0.5 border shrink-0 ml-1"
                  style={{ color: '#E35205', borderColor: '#E35205', background: 'rgba(227,82,5,0.08)' }}
                >
                  $12
                </span>
              </div>

              <div className="text-xs font-mono font-bold mb-2 tracking-wider" style={{ color: '#E35205' }}>
                AWAITING CLAIM
              </div>

              <div className="flex items-center gap-1 text-xs font-mono mb-3" style={{ color: 'rgba(245,245,245,0.35)' }}>
                <span>◎</span>
                <span>Cairo, Egypt</span>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs font-mono mb-1" style={{ color: '#E35205' }}>
                  <span>RESTORATION</span>
                  <span>IN PROGRESS</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill indeterminate" style={{ opacity: 0.7 }} />
                </div>
              </div>

              <div
                className="archive-inline-cta"
              >
                SECURE PARTS PACK
              </div>
            </div>
          </ArchiveLinkCard>
        </div>
      </section>}

      {/* UNKNOWN DEVICES */}
      <section className="mb-10">
        <ArchiveSectionLabel>UNKNOWN DEVICES</ArchiveSectionLabel>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {unknownDevices.map((device) => (
            <ArchiveLinkCard
              key={device.id}
              href={`/devices/${device.id}`}
              className="archive-device-card is-muted"
            >
              <div className="border-b" style={{ borderColor: 'rgba(227,82,5,0.16)' }}>
                <DeviceImage device={device} isUnknown={true} />
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                  <div className="min-w-0">
                    <div className="archive-device-card__id">{device.id}</div>
                    <div className="archive-device-card__name is-muted">{device.name}</div>
                  </div>
                  <div
                    className="text-xs font-mono px-1.5 py-0.5 border"
                    style={{ color: 'rgba(245,245,245,0.35)', borderColor: 'rgba(227,82,5,0.16)', background: 'transparent' }}
                  >
                    ?
                  </div>
                </div>

                <div className="archive-device-card__meta flex items-center gap-1">
                  <span>◎</span>
                  <span className="truncate">{device.location}</span>
                </div>

                <div className="mt-2.5">
                  <div className="flex justify-between text-xs font-mono mb-1" style={{ color: 'rgba(227,82,5,0.28)' }}>
                    <span>PROGRESS</span>
                    <span>{device.exploration_progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${device.exploration_progress}%`, opacity: 0.4 }} />
                  </div>
                </div>
              </div>
            </ArchiveLinkCard>
          ))}
        </div>
      </section>

      {/* KNOWN DEVICES */}
      <section>
        <ArchiveSectionLabel>KNOWN DEVICES</ArchiveSectionLabel>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {knownDevices.map((device) => {
            const statusKey = device.status ?? 'unknown'
            const statusStyle = STATUS_STYLES[statusKey] ?? STATUS_STYLES.unknown
            return (
              <ArchiveCard
                key={device.id}
                className="archive-device-card relative"
              >
                {/* stretched link — whole card navigates, except the button which sits above */}
                <Link href={`/devices/${device.id}`} aria-label={device.name} className="absolute inset-0" style={{ zIndex: 1 }} />
                <div className="border-b" style={{ borderColor: 'rgba(227,82,5,0.16)' }}>
                  <DeviceImage device={device} isUnknown={false} />
                </div>

                <div className="p-3">
                  <div className="mb-1.5 min-w-0">
                    <div className="archive-device-card__id">{device.id}</div>
                    <div className="archive-device-card__name">{device.name}</div>
                    {device.status && (
                      <span
                        className="label-tag whitespace-nowrap mt-1 inline-block"
                        style={{ color: statusStyle.color, fontSize: 'var(--fs-caption)' }}
                      >
                        {STATUS_LABELS[device.status] ?? device.status}
                      </span>
                    )}
                  </div>

                  <div className="archive-device-card__meta flex items-center gap-1 mb-2">
                    <span>◎</span>
                    <span className="truncate">{device.location}</span>
                  </div>

                  <p className="archive-device-card__description line-clamp-3">
                    {device.description}
                  </p>

                  {device.status === 'in_use' && device.current_user_name && (
                    <div
                      className="mb-2 px-2 py-1 border text-xs font-mono"
                      style={{ background: 'rgba(200,68,6,0.04)', borderColor: 'rgba(200,68,6,0.2)', color: 'rgba(245,245,245,0.55)' }}
                    >
                      <span style={{ color: 'rgba(245,245,245,0.35)' }}>IN USE: </span>
                      <span>{device.current_user_name}</span>
                    </div>
                  )}

                </div>
              </ArchiveCard>
            )
          })}
        </div>
      </section>
          </div>

          <div className="footer-bar" style={{ marginTop: '2rem' }}>
            <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
            <div>MULTIVERSE COLLECTIVE</div>
          </div>
        </>
      )}
    </main>
  )
}
