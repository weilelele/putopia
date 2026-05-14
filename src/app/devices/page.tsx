'use client'

import { devices, Device } from '../../../content/devices'
import { useAuth } from '@/lib/auth-context'

const STATUS_STYLES = {
  AVAILABLE: { color: '#4D8C3F', bg: 'rgba(77,140,63,0.1)', border: 'rgba(77,140,63,0.3)' },
  'NEEDS REPAIR': { color: '#E8A020', bg: 'rgba(232,160,32,0.1)', border: 'rgba(232,160,32,0.3)' },
  'IN USE': { color: '#C4A96A', bg: 'rgba(196,169,106,0.1)', border: 'rgba(196,169,106,0.3)' },
  UNKNOWN: { color: '#7A6A40', bg: 'transparent', border: '#3D3010' },
}

// Generate a deterministic SVG placeholder based on device id
function DevicePlaceholder({ id }: { id: string }) {
  // Seed color variations from device id char codes
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
      <rect width="160" height="120" fill="#1A1200" />
      {/* Grid lines */}
      {[20, 40, 60, 80, 100, 120, 140].map((x) => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="120" stroke="#3D3010" strokeWidth="0.5" opacity="0.5" />
      ))}
      {[20, 40, 60, 80, 100].map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2="160" y2={y} stroke="#3D3010" strokeWidth="0.5" opacity="0.5" />
      ))}
      {/* Radar circles */}
      <circle cx={cx} cy={cy} r={r1} fill="none" stroke={`hsl(${hue1},60%,45%)`} strokeWidth="1" opacity="0.6" />
      <circle cx={cx} cy={cy} r={r2} fill="none" stroke={`hsl(${hue1},60%,55%)`} strokeWidth="0.8" opacity="0.5" />
      <circle cx={cx} cy={cy} r="4" fill={`hsl(${hue1},70%,50%)`} opacity="0.8" />
      {/* Signal lines */}
      <line x1={lineX} y1="10" x2={lineX + 20} y2="110" stroke={`hsl(${hue2},50%,40%)`} strokeWidth="1" opacity="0.4" />
      <line x1={lineX + 10} y1="10" x2={lineX + 30} y2="110" stroke={`hsl(${hue2},50%,40%)`} strokeWidth="0.5" opacity="0.3" />
      {/* Crosshair */}
      <line x1={cx - 15} y1={cy} x2={cx + 15} y2={cy} stroke="#E8A020" strokeWidth="0.8" opacity="0.5" />
      <line x1={cx} y1={cy - 15} x2={cx} y2={cy + 15} stroke="#E8A020" strokeWidth="0.8" opacity="0.5" />
      {/* Corner brackets */}
      <path d="M5,5 L5,15 M5,5 L15,5" stroke="#5C4A1E" strokeWidth="1.5" fill="none" />
      <path d="M155,5 L155,15 M155,5 L145,5" stroke="#5C4A1E" strokeWidth="1.5" fill="none" />
      <path d="M5,115 L5,105 M5,115 L15,115" stroke="#5C4A1E" strokeWidth="1.5" fill="none" />
      <path d="M155,115 L155,105 M155,115 L145,115" stroke="#5C4A1E" strokeWidth="1.5" fill="none" />
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
    <div className="w-full aspect-video overflow-hidden" style={{ background: '#1A1200' }}>
      <DevicePlaceholder id={device.id} />
    </div>
  )
}

export default function DevicesPage() {
  const { isAtLeast } = useAuth()

  const unknownDevices = devices.filter((d) => d.knowledge === 'unknown')
  const knownDevices = devices.filter((d) => d.knowledge === 'known')

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#0F0A00' }}>
      {/* Header */}
      <div className="mb-8 border-b pb-4" style={{ borderColor: '#5C4A1E' }}>
        <div className="text-xs tracking-[0.3em] font-mono mb-1" style={{ color: '#7A6A40' }}>
          DATABASE // DEVICES
        </div>
        <h1 className="text-2xl font-mono font-bold tracking-wider" style={{ color: '#F5E6C8' }}>
          DEVICES
        </h1>
        <div className="text-xs font-mono mt-1" style={{ color: '#7A6A40' }}>
          Multiverse Console Registry // {unknownDevices.length} unknown / {knownDevices.length} known
        </div>
      </div>

      {/* UNKNOWN DEVICES */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="label-tag" style={{ color: '#E8A020' }}>UNKNOWN</span>
          <div className="flex-1 h-px" style={{ background: '#3D3010' }} />
          <span className="text-xs font-mono" style={{ color: '#7A6A40' }}>Uncontacted Signals</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unknownDevices.map((device) => (
            <div
              key={device.id}
              className="border rounded overflow-hidden"
              style={{
                background: '#221800',
                borderColor: '#5C4A1E',
                boxShadow: 'inset 0 1px 0 rgba(232,160,32,0.1)',
              }}
            >
              {/* Image area */}
              <div className="border-b" style={{ borderColor: '#3D3010' }}>
                <DeviceImage device={device} />
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-xs font-mono" style={{ color: '#5C4A1E' }}>{device.id}</div>
                    <div className="text-sm font-mono font-semibold" style={{ color: '#F5E6C8' }}>{device.name}</div>
                    {device.batchId && (
                      <div className="text-xs font-mono" style={{ color: '#E8A020' }}>{device.batchId}</div>
                    )}
                  </div>
                  <div
                    className="text-xs font-mono px-1.5 py-0.5 border rounded"
                    style={{ color: '#E8A020', borderColor: 'rgba(232,160,32,0.3)', background: 'rgba(232,160,32,0.1)' }}
                  >
                    ?
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-3 text-xs font-mono" style={{ color: '#7A6A40' }}>
                  <span>◎</span>
                  <span>{device.location}</span>
                </div>

                <p className="text-xs leading-relaxed mb-4 font-mono" style={{ color: '#7A6A40' }}>
                  {device.description}
                </p>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1" style={{ color: '#7A6A40' }}>
                    <span>EXPLORATION PROGRESS</span>
                    <span style={{ color: '#E8A020' }}>{device.explorationProgress}%</span>
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
          <span className="label-tag" style={{ color: '#4D8C3F' }}>KNOWN</span>
          <div className="flex-1 h-px" style={{ background: '#3D3010' }} />
          <span className="text-xs font-mono" style={{ color: '#7A6A40' }}>Confirmed Consoles</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {knownDevices.map((device) => {
            const statusStyle = device.status ? STATUS_STYLES[device.status] : STATUS_STYLES['AVAILABLE']
            return (
              <div
                key={device.id}
                className="border rounded overflow-hidden"
                style={{
                  background: '#221800',
                  borderColor: '#5C4A1E',
                  boxShadow: 'inset 0 1px 0 rgba(232,160,32,0.1)',
                }}
              >
                {/* Image area */}
                <div className="border-b" style={{ borderColor: '#3D3010' }}>
                  <DeviceImage device={device} />
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-xs font-mono" style={{ color: '#5C4A1E' }}>{device.id}</div>
                      <div className="text-base font-mono font-semibold" style={{ color: '#F5E6C8' }}>{device.name}</div>
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

                  <div className="flex items-center gap-1.5 mb-3 text-xs font-mono" style={{ color: '#7A6A40' }}>
                    <span>◎</span>
                    <span>{device.location}</span>
                  </div>

                  <p className="text-xs leading-relaxed mb-4 font-mono" style={{ color: '#7A6A40' }}>
                    {device.description}
                  </p>

                  {/* If in use, show who */}
                  {device.status === 'IN USE' && device.currentUser && (
                    <div
                      className="mb-3 px-3 py-2 rounded border text-xs font-mono"
                      style={{ background: 'rgba(196,169,106,0.05)', borderColor: 'rgba(196,169,106,0.2)', color: '#C4A96A' }}
                    >
                      <span style={{ color: '#7A6A40' }}>CURRENT USER: </span>
                      <span>{device.currentUser}</span>
                    </div>
                  )}

                  {/* Apply / Queue button */}
                  {isAtLeast('voyager') && device.status === 'AVAILABLE' && (
                    <button
                      className="w-full py-1.5 text-xs font-mono tracking-widest border rounded transition-all"
                      style={{ borderColor: '#4D8C3F', color: '#4D8C3F', background: 'rgba(77,140,63,0.08)' }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.background = '#4D8C3F'
                        ;(e.target as HTMLElement).style.color = '#0F0A00'
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.background = 'rgba(77,140,63,0.08)'
                        ;(e.target as HTMLElement).style.color = '#4D8C3F'
                      }}
                    >
                      [ APPLY FOR ACCESS ]
                    </button>
                  )}
                  {isAtLeast('voyager') && device.status === 'IN USE' && (
                    <button
                      className="w-full py-1.5 text-xs font-mono tracking-widest border rounded opacity-40 cursor-not-allowed"
                      style={{ borderColor: '#3D3010', color: '#7A6A40' }}
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
