'use client'

import { devices, Device } from '../../../content/devices'
import { useAuth } from '@/lib/auth-context'

const STATUS_STYLES = {
  AVAILABLE: { color: '#20D890', bg: 'rgba(32,216,144,0.08)', border: 'rgba(32,216,144,0.3)' },
  'NEEDS REPAIR': { color: '#E83030', bg: 'rgba(232,48,48,0.08)', border: 'rgba(232,48,48,0.3)' },
  'IN USE': { color: '#E85A00', bg: 'rgba(232,90,0,0.08)', border: 'rgba(232,90,0,0.3)' },
  UNKNOWN: { color: '#4A5570', bg: 'transparent', border: '#1A2238' },
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

function DeviceImage({ device }: { device: Device }) {
  if (device.imagePath) {
    return (
      <div className="w-full aspect-video overflow-hidden">
        <img
          src={device.imagePath}
          alt={device.name}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }
  return (
    <div className="w-full aspect-video overflow-hidden" style={{ background: '#0D1020' }}>
      <DevicePlaceholder id={device.id} />
    </div>
  )
}

export default function DevicesPage() {
  const { isAtLeast } = useAuth()

  const unknownDevices = devices.filter((d) => d.knowledge === 'unknown')
  const knownDevices = devices.filter((d) => d.knowledge === 'known')

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#070912' }}>
      {/* Header */}
      <div className="mb-8 border-b pb-4" style={{ borderColor: '#1E2840' }}>
        <div className="text-xs tracking-[0.3em] font-mono mb-1" style={{ color: '#4A5570' }}>
          DATABASE // DEVICES
        </div>
        <h1 className="text-2xl font-mono font-bold tracking-wider" style={{ color: '#EDE8DE' }}>
          DEVICES
        </h1>
        <div className="text-xs font-mono mt-1" style={{ color: '#4A5570' }}>
          Multiverse Console Registry // {unknownDevices.length} unknown / {knownDevices.length} known
        </div>
      </div>

      {/* UNKNOWN DEVICES */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="label-tag" style={{ color: '#E85A00' }}>UNKNOWN</span>
          <div className="flex-1 h-px" style={{ background: '#1A2238' }} />
          <span className="text-xs font-mono" style={{ color: '#4A5570' }}>Uncontacted Signals</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unknownDevices.map((device) => (
            <div
              key={device.id}
              className="border overflow-hidden"
              style={{
                background: '#111525',
                borderColor: '#1E2840',
                boxShadow: 'inset 0 1px 0 rgba(232,90,0,0.05)',
              }}
            >
              <div className="border-b" style={{ borderColor: '#1A2238' }}>
                <DeviceImage device={device} />
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-xs font-mono" style={{ color: '#4A5570' }}>{device.id}</div>
                    <div className="text-sm font-mono font-semibold" style={{ color: '#EDE8DE' }}>{device.name}</div>
                    {device.batchId && (
                      <div className="text-xs font-mono" style={{ color: '#E85A00' }}>{device.batchId}</div>
                    )}
                  </div>
                  <div
                    className="text-xs font-mono px-1.5 py-0.5 border"
                    style={{ color: '#E85A00', borderColor: 'rgba(232,90,0,0.3)', background: 'rgba(232,90,0,0.08)' }}
                  >
                    ?
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-3 text-xs font-mono" style={{ color: '#4A5570' }}>
                  <span>◎</span>
                  <span>{device.location}</span>
                </div>

                <p className="text-xs leading-relaxed mb-4 font-mono" style={{ color: '#8A9AB5' }}>
                  {device.description}
                </p>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1" style={{ color: '#4A5570' }}>
                    <span>EXPLORATION PROGRESS</span>
                    <span style={{ color: '#E85A00' }}>{device.explorationProgress}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${device.explorationProgress}%` }}
                    />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {knownDevices.map((device) => {
            const statusStyle = device.status ? STATUS_STYLES[device.status] : STATUS_STYLES['AVAILABLE']
            return (
              <div
                key={device.id}
                className="border overflow-hidden"
                style={{
                  background: '#111525',
                  borderColor: '#1E2840',
                  boxShadow: 'inset 0 1px 0 rgba(232,90,0,0.05)',
                }}
              >
                <div className="border-b" style={{ borderColor: '#1A2238' }}>
                  <DeviceImage device={device} />
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-xs font-mono" style={{ color: '#4A5570' }}>{device.id}</div>
                      <div className="text-base font-mono font-semibold" style={{ color: '#EDE8DE' }}>{device.name}</div>
                    </div>
                    {device.status && (
                      <span
                        className={`label-tag whitespace-nowrap ${
                          device.status === 'AVAILABLE' ? 'status-available' :
                          device.status === 'NEEDS REPAIR' ? 'status-repair' :
                          device.status === 'IN USE' ? 'status-inuse' : 'status-unknown'
                        }`}
                      >
                        {device.status}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mb-3 text-xs font-mono" style={{ color: '#4A5570' }}>
                    <span>◎</span>
                    <span>{device.location}</span>
                  </div>

                  <p className="text-xs leading-relaxed mb-4 font-mono" style={{ color: '#8A9AB5' }}>
                    {device.description}
                  </p>

                  {device.status === 'IN USE' && device.currentUser && (
                    <div
                      className="mb-3 px-3 py-2 border text-xs font-mono"
                      style={{ background: 'rgba(232,90,0,0.04)', borderColor: 'rgba(232,90,0,0.2)', color: '#8A9AB5' }}
                    >
                      <span style={{ color: '#4A5570' }}>CURRENT USER: </span>
                      <span>{device.currentUser}</span>
                    </div>
                  )}

                  {isAtLeast('voyager') && device.status === 'AVAILABLE' && (
                    <button
                      className="w-full py-1.5 text-xs font-mono tracking-widest border transition-all"
                      style={{ borderColor: '#20D890', color: '#20D890', background: 'rgba(32,216,144,0.06)' }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.background = '#20D890'
                        ;(e.target as HTMLElement).style.color = '#070912'
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.background = 'rgba(32,216,144,0.06)'
                        ;(e.target as HTMLElement).style.color = '#20D890'
                      }}
                    >
                      [ APPLY FOR ACCESS ]
                    </button>
                  )}
                  {isAtLeast('voyager') && device.status === 'IN USE' && (
                    <button
                      className="w-full py-1.5 text-xs font-mono tracking-widest border opacity-40 cursor-not-allowed"
                      style={{ borderColor: '#1A2238', color: '#4A5570' }}
                      disabled
                    >
                      [ QUEUE FOR NEXT SLOT ]
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
