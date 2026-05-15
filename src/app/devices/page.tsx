'use client'

import { useState, useEffect } from 'react'
import { getAllDevices } from '@/lib/actions/devices'
import { useAuth } from '@/lib/auth-context'
import type { Device } from '@/types/database'

const STATUS_STYLES = {
  available:    { color: '#20D890', bg: 'rgba(32,216,144,0.08)', border: 'rgba(32,216,144,0.3)' },
  needs_repair: { color: '#E83030', bg: 'rgba(232,48,48,0.08)', border: 'rgba(232,48,48,0.3)' },
  in_use:       { color: '#E85A00', bg: 'rgba(232,90,0,0.08)', border: 'rgba(232,90,0,0.3)' },
  unknown:      { color: '#4A5570', bg: 'transparent', border: '#1A2238' },
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
      <rect width="160" height="120" fill="#0D1020" />
      {[20, 40, 60, 80, 100, 120, 140].map((x) => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="120" stroke="#1A2238" strokeWidth="0.5" opacity="0.5" />
      ))}
      {[20, 40, 60, 80, 100].map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2="160" y2={y} stroke="#1A2238" strokeWidth="0.5" opacity="0.5" />
      ))}
      <circle cx={cx} cy={cy} r={r1} fill="none" stroke={`hsl(${hue1},60%,45%)`} strokeWidth="1" opacity="0.6" />
      <circle cx={cx} cy={cy} r={r2} fill="none" stroke={`hsl(${hue1},60%,55%)`} strokeWidth="0.8" opacity="0.5" />
      <circle cx={cx} cy={cy} r="4" fill={`hsl(${hue1},70%,50%)`} opacity="0.8" />
      <line x1={lineX} y1="10" x2={lineX + 20} y2="110" stroke={`hsl(${hue2},50%,40%)`} strokeWidth="1" opacity="0.4" />
      <line x1={lineX + 10} y1="10" x2={lineX + 30} y2="110" stroke={`hsl(${hue2},50%,40%)`} strokeWidth="0.5" opacity="0.3" />
      <line x1={cx - 15} y1={cy} x2={cx + 15} y2={cy} stroke="#E85A00" strokeWidth="0.8" opacity="0.5" />
      <line x1={cx} y1={cy - 15} x2={cx} y2={cy + 15} stroke="#E85A00" strokeWidth="0.8" opacity="0.5" />
      <path d="M5,5 L5,15 M5,5 L15,5" stroke="#1E2840" strokeWidth="1.5" fill="none" />
      <path d="M155,5 L155,15 M155,5 L145,5" stroke="#1E2840" strokeWidth="1.5" fill="none" />
      <path d="M5,115 L5,105 M5,115 L15,115" stroke="#1E2840" strokeWidth="1.5" fill="none" />
      <path d="M155,115 L155,105 M155,115 L145,115" stroke="#1E2840" strokeWidth="1.5" fill="none" />
    </svg>
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
    <div className="w-full aspect-video overflow-hidden relative" style={{ background: '#0D1020' }}>
      <DevicePlaceholder id={device.id} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: filterOverlay }} />
    </div>
  )
}

export default function DevicesPage() {
  const { isAtLeast } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])

  useEffect(() => { getAllDevices().then(setDevices) }, [])

  const unknownDevices = devices.filter((d) => d.knowledge === 'unknown')
  const knownDevices   = devices.filter((d) => d.knowledge === 'known')

  return (
    <div className="main">
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> DEVICE ARCHIVE</div>
        <div className="right">
          <div className="item">UNKNOWN <span className="val">{unknownDevices.length}</span></div>
          <div className="item">KNOWN <span className="val">{knownDevices.length}</span></div>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="h-eyebrow">// ARCHIVE</div>
          <h1>DEVICE <span className="accent">REGISTRY</span></h1>
          <p className="sub">Multiverse Console Registry — {unknownDevices.length} unknown / {knownDevices.length} known</p>
        </div>
      </div>

      {/* legacy spacer removed */}
      <div style={{ display: 'contents' }}>

      {/* UNKNOWN DEVICES */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="label-tag" style={{ color: '#4A5570', borderColor: '#4A5570' }}>UNKNOWN</span>
          <div className="flex-1 h-px" style={{ background: '#1A2238' }} />
          <span className="text-xs font-mono" style={{ color: '#4A5570' }}>Uncontacted Signals</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {unknownDevices.map((device) => (
            <div
              key={device.id}
              className="border overflow-hidden"
              style={{
                background: '#0D1020',
                borderColor: '#1A2238',
                opacity: 0.7,
              }}
            >
              <div className="border-b" style={{ borderColor: '#1A2238' }}>
                <DeviceImage device={device} isUnknown={true} />
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <div className="text-xs font-mono" style={{ color: '#1E2840' }}>{device.id}</div>
                    <div className="text-xs font-mono font-semibold" style={{ color: '#4A5570' }}>{device.name}</div>
                  </div>
                  <div
                    className="text-xs font-mono px-1.5 py-0.5 border"
                    style={{ color: '#4A5570', borderColor: '#1A2238', background: 'transparent' }}
                  >
                    ?
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-mono" style={{ color: '#1E2840' }}>
                  <span>◎</span>
                  <span>{device.location}</span>
                </div>

                <div className="mt-2.5">
                  <div className="flex justify-between text-xs font-mono mb-1" style={{ color: '#1E2840' }}>
                    <span>PROGRESS</span>
                    <span>{device.exploration_progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${device.exploration_progress}%`, opacity: 0.4 }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* KNOWN DEVICES */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="label-tag" style={{ color: '#20D890' }}>KNOWN</span>
          <div className="flex-1 h-px" style={{ background: '#1A2238' }} />
          <span className="text-xs font-mono" style={{ color: '#4A5570' }}>Confirmed Consoles</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {knownDevices.map((device) => {
            const statusKey = device.status ?? 'unknown'
            const statusStyle = STATUS_STYLES[statusKey] ?? STATUS_STYLES.unknown
            return (
              <div
                key={device.id}
                className="border overflow-hidden"
                style={{
                  background: '#111525',
                  borderColor: '#1E2840',
                  boxShadow: 'inset 0 1px 0 rgba(32,216,144,0.06)',
                }}
              >
                <div className="border-b" style={{ borderColor: '#1A2238' }}>
                  <DeviceImage device={device} isUnknown={false} />
                </div>

                <div className="p-3">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="min-w-0">
                      <div className="text-xs font-mono" style={{ color: '#4A5570' }}>{device.id}</div>
                      <div className="text-sm font-mono font-semibold truncate" style={{ color: '#EDE8DE' }}>{device.name}</div>
                    </div>
                    {device.status && (
                      <span
                        className="label-tag whitespace-nowrap ml-1 shrink-0"
                        style={{ color: statusStyle.color, fontSize: '0.5rem' }}
                      >
                        {STATUS_LABELS[device.status] ?? device.status}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mb-2 text-xs font-mono" style={{ color: '#4A5570' }}>
                    <span>◎</span>
                    <span className="truncate">{device.location}</span>
                  </div>

                  <p className="text-xs leading-relaxed mb-3 font-mono line-clamp-3" style={{ color: '#8A9AB5' }}>
                    {device.description}
                  </p>

                  {device.status === 'in_use' && device.current_user_name && (
                    <div
                      className="mb-2 px-2 py-1 border text-xs font-mono"
                      style={{ background: 'rgba(232,90,0,0.04)', borderColor: 'rgba(232,90,0,0.2)', color: '#8A9AB5' }}
                    >
                      <span style={{ color: '#4A5570' }}>IN USE: </span>
                      <span>{device.current_user_name}</span>
                    </div>
                  )}

                  {isAtLeast('voyager') && (
                    <button
                      className="w-full py-1.5 text-xs font-mono tracking-widest border transition-all"
                      style={{ borderColor: '#20D890', color: '#20D890', background: 'rgba(32,216,144,0.06)' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = '#20D890'
                        ;(e.currentTarget as HTMLElement).style.color = '#070912'
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(32,216,144,0.06)'
                        ;(e.currentTarget as HTMLElement).style.color = '#20D890'
                      }}
                    >
                      [ APPLY FOR ACCESS ]
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
      </div>

      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>DEVICE ARCHIVE v3.1</div>
      </div>
    </div>
  )
}
