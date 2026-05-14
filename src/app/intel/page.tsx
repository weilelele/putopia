'use client'

import { intelData } from '@/lib/mock-data'

const TAG_STYLES = {
  NOTICE: { color: '#C4A96A', bg: 'rgba(196,169,106,0.1)', border: 'rgba(196,169,106,0.3)' },
  DEVICE: { color: '#E8A020', bg: 'rgba(232,160,32,0.1)', border: 'rgba(232,160,32,0.3)' },
  ORG: { color: '#D4601A', bg: 'rgba(212,96,26,0.1)', border: 'rgba(212,96,26,0.3)' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function IntelPage() {
  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#0F0A00' }}>
      {/* Header */}
      <div className="mb-8 border-b pb-4" style={{ borderColor: '#5C4A1E' }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="text-xs tracking-[0.3em] font-mono" style={{ color: '#7A6A40' }}>
            DATABASE // INTEL
          </div>
          <div
            className="text-xs px-2 py-0.5 border font-mono"
            style={{ color: '#C43020', borderColor: '#C43020', background: 'rgba(196,48,32,0.1)' }}
          >
            CLASSIFIED
          </div>
        </div>
        <h1 className="text-2xl font-mono font-bold tracking-wider" style={{ color: '#F5E6C8' }}>
          INTEL
        </h1>
        <div className="text-xs font-mono mt-1" style={{ color: '#7A6A40' }}>
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
              className="rounded border p-5 transition-all duration-150"
              style={{
                background: '#221800',
                borderColor: '#5C4A1E',
                boxShadow: 'inset 0 1px 0 rgba(232,160,32,0.1)',
                borderLeft: '3px solid transparent',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderLeftColor = '#E8A020'
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
                      className="text-xs font-mono px-2 py-0.5 border rounded"
                      style={{ color: '#C43020', background: 'rgba(196,48,32,0.1)', borderColor: 'rgba(196,48,32,0.3)' }}
                    >
                      ⊘ CLASSIFIED
                    </span>
                  )}
                  <span className="text-xs font-mono" style={{ color: '#5C4A1E' }}>{entry.id}</span>
                </div>
                <span className="text-xs font-mono whitespace-nowrap" style={{ color: '#7A6A40' }}>
                  {formatDate(entry.timestamp)}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-base font-mono font-semibold mb-2" style={{ color: '#F5E6C8' }}>
                {entry.title}
              </h2>

              {/* Divider */}
              <div className="h-px mb-3" style={{ background: '#3D3010' }} />

              {/* Content */}
              <p className="text-sm leading-relaxed font-mono" style={{ color: '#C4A96A' }}>
                {entry.content}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-8 text-center text-xs font-mono" style={{ color: '#3D3010' }}>
        — END OF INTEL FEED — // LAST UPDATED: 2026-05-01 03:30 UTC
      </div>
    </div>
  )
}
