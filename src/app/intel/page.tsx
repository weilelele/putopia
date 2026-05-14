'use client'

import { intelData } from '@/lib/mock-data'

const TAG_STYLES = {
  NOTICE: { color: '#8A9AB5', bg: 'rgba(138,154,181,0.1)', border: 'rgba(138,154,181,0.3)' },
  DEVICE: { color: '#E85A00', bg: 'rgba(232,90,0,0.1)', border: 'rgba(232,90,0,0.3)' },
  ORG: { color: '#00C8C8', bg: 'rgba(0,200,200,0.1)', border: 'rgba(0,200,200,0.3)' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function IntelPage() {
  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#070912' }}>
      {/* Header */}
      <div className="mb-8 border-b pb-4" style={{ borderColor: '#1E2840' }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="text-xs tracking-[0.3em] font-mono" style={{ color: '#4A5570' }}>
            DATABASE // INTEL
          </div>
          <div
            className="text-xs px-2 py-0.5 border font-mono"
            style={{ color: '#E83030', borderColor: '#E83030', background: 'rgba(232,48,48,0.08)' }}
          >
            CLASSIFIED
          </div>
        </div>
        <h1 className="text-2xl font-mono font-bold tracking-wider" style={{ color: '#EDE8DE' }}>
          INTEL
        </h1>
        <div className="text-xs font-mono mt-1" style={{ color: '#4A5570' }}>
          Known Intelligence // {intelData.length} entries on record
        </div>
      </div>

      {/* Filter legend */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {(['NOTICE', 'DEVICE', 'ORG'] as const).map((tag) => {
          const s = TAG_STYLES[tag]
          return (
            <div key={tag} className="flex items-center gap-2 text-xs font-mono">
              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span style={{ color: s.color }}>{tag}</span>
            </div>
          )
        })}
      </div>

      {/* Entries */}
      <div className="space-y-4">
        {intelData.map((entry) => {
          const tagStyle = TAG_STYLES[entry.tag]
          return (
            <div
              key={entry.id}
              className="border p-5 transition-all duration-150"
              style={{
                background: '#111525',
                borderColor: '#1E2840',
                boxShadow: 'inset 0 1px 0 rgba(232,90,0,0.05)',
                borderLeft: '3px solid transparent',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderLeftColor = '#E85A00'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent'
              }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="label-tag"
                    style={{ color: tagStyle.color }}
                  >
                    {entry.tag}
                  </span>
                  {entry.classified && (
                    <span
                      className="text-xs font-mono px-2 py-0.5 border"
                      style={{ color: '#E83030', background: 'rgba(232,48,48,0.08)', borderColor: 'rgba(232,48,48,0.3)' }}
                    >
                      ⊘ CLASSIFIED
                    </span>
                  )}
                  <span className="text-xs font-mono" style={{ color: '#4A5570' }}>{entry.id}</span>
                </div>
                <span className="text-xs font-mono whitespace-nowrap" style={{ color: '#4A5570' }}>
                  {formatDate(entry.timestamp)}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-base font-mono font-semibold mb-2" style={{ color: '#EDE8DE' }}>
                {entry.title}
              </h2>

              {/* Divider */}
              <div className="h-px mb-3" style={{ background: '#1A2238' }} />

              {/* Content */}
              <p className="text-sm leading-relaxed font-mono" style={{ color: '#8A9AB5' }}>
                {entry.content}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-8 text-center text-xs font-mono" style={{ color: '#1A2238' }}>
        — END OF INTEL FEED — // LAST UPDATED: 2026-05-01 03:30 UTC
      </div>
    </div>
  )
}
