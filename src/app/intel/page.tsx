'use client'

import Link from 'next/link'
import { getAllIntel } from '@/lib/actions/intel'
import { useEffect, useState } from 'react'
import type { Intel } from '@/types/database'

const TAG_STYLES = {
  NOTICE: { color: '#8A9AB5', bg: 'rgba(138,154,181,0.1)', border: 'rgba(138,154,181,0.3)' },
  DEVICE: { color: '#E85A00', bg: 'rgba(232,90,0,0.1)', border: 'rgba(232,90,0,0.3)' },
  ORG: { color: '#00C8C8', bg: 'rgba(0,200,200,0.1)', border: 'rgba(0,200,200,0.3)' },
}

function IntelCard({ entry }: { entry: Intel }) {
  const tagStyle = TAG_STYLES[entry.tag]
  return (
    <Link
      key={entry.id}
      href={`/intel/${entry.id}`}
      className="block border p-4 transition-all duration-150"
      style={{
        background: '#111525',
        borderColor: '#1E2840',
        boxShadow: 'inset 0 1px 0 rgba(232,90,0,0.05)',
        borderLeft: `3px solid ${tagStyle.color}`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = tagStyle.color
        ;(e.currentTarget as HTMLElement).style.background = '#141829'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#1E2840'
        ;(e.currentTarget as HTMLElement).style.background = '#111525'
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="label-tag" style={{ color: tagStyle.color }}>{entry.tag}</span>
        <span className="text-xs font-mono whitespace-nowrap" style={{ color: '#4A5570' }}>
          {new Date(entry.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
        </span>
      </div>
      <h2 className="text-sm font-mono font-semibold mb-2 leading-snug" style={{ color: '#EDE8DE' }}>
        {entry.title}
      </h2>
      <p className="text-xs leading-relaxed font-mono" style={{ color: '#8A9AB5' }}>
        {entry.content.length > 120 ? entry.content.slice(0, 120) + '…' : entry.content}
      </p>
      <div className="mt-3 text-xs font-mono" style={{ color: tagStyle.color, opacity: 0.6 }}>
        READ MORE →
      </div>
    </Link>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

export default function IntelPage() {
  const [intel, setIntel] = useState<Intel[]>([])

  useEffect(() => {
    getAllIntel().then(setIntel)
  }, [])

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#070912' }}>
      {/* Header */}
      <div className="mb-8 border-b pb-4" style={{ borderColor: '#1E2840' }}>
        <div className="text-xs tracking-[0.3em] font-mono mb-1" style={{ color: '#4A5570' }}>
          DATABASE // INTEL
        </div>
        <h1 className="text-2xl font-mono font-bold tracking-wider" style={{ color: '#EDE8DE' }}>
          INTEL
        </h1>
        <div className="text-xs font-mono mt-1" style={{ color: '#4A5570' }}>
          Known Intelligence // {intel.length} entries on record
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

      {/* Entries — clickable cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {intel.map((entry) => <IntelCard key={entry.id} entry={entry} />)}
      </div>

      <div className="mt-8 text-center text-xs font-mono" style={{ color: '#1A2238' }}>
        — END OF INTEL FEED — // LAST UPDATED: {intel[0] ? formatDate(intel[0].timestamp) : '—'}
      </div>
    </div>
  )
}
