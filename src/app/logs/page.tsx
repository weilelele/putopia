'use client'

import Link from 'next/link'
import { stories } from '../../../content/stories'
import { useAuth } from '@/lib/auth-context'
import { Plus, ArrowRight } from 'lucide-react'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function LogsPage() {
  const { isAtLeast } = useAuth()

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#0F0A00' }}>
      {/* Header */}
      <div className="mb-8 border-b pb-4 flex items-end justify-between" style={{ borderColor: '#5C4A1E' }}>
        <div>
          <div className="text-xs tracking-[0.3em] font-mono mb-1" style={{ color: '#7A6A40' }}>
            ARCHIVE // VOYAGER STORIES
          </div>
          <h1 className="text-3xl font-mono font-bold tracking-wider" style={{ color: '#F5E6C8' }}>
            VOYAGER STORIES
          </h1>
          <div className="text-xs font-mono mt-1" style={{ color: '#7A6A40' }}>
            Field Logs // {stories.length} entries on record
          </div>
        </div>
        {isAtLeast('architect') && (
          <button
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono tracking-widest border rounded transition-all"
            style={{ borderColor: '#E8A020', color: '#E8A020', background: 'rgba(232,160,32,0.08)' }}
          >
            <Plus size={12} />
            SUBMIT LOG ENTRY
          </button>
        )}
      </div>

      {/* Stories Feed */}
      <div className="space-y-6 max-w-3xl">
        {stories.map((story) => {
          const initials = getInitials(story.author)
          return (
            <div
              key={story.id}
              className="story-card rounded overflow-hidden"
            >
              {/* Author bar */}
              <div
                className="flex items-center gap-3 px-4 py-3 border-b"
                style={{ background: '#1A1200', borderColor: '#3D3010' }}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0"
                  style={{
                    background: 'rgba(232,160,32,0.15)',
                    color: '#E8A020',
                    border: '1px solid rgba(232,160,32,0.35)',
                  }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono font-semibold" style={{ color: '#F5E6C8' }}>
                    {story.author}
                  </div>
                  <div className="text-xs font-mono" style={{ color: '#7A6A40' }}>
                    {formatDate(story.date)}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 py-4">
                <h2 className="text-base font-mono font-semibold mb-3" style={{ color: '#F5E6C8' }}>
                  {story.title}
                </h2>
                <p className="text-sm leading-relaxed font-mono" style={{ color: '#7A6A40' }}>
                  {story.excerpt}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {story.tags.map((tag) => (
                    <span
                      key={tag}
                      className="label-tag"
                      style={{ color: '#E8A020' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Read more */}
                <div className="mt-4 pt-3 border-t" style={{ borderColor: '#3D3010' }}>
                  <Link
                    href={`/logs/${story.id}`}
                    className="flex items-center gap-2 text-xs font-mono tracking-widest transition-colors"
                    style={{ color: '#E8A020' }}
                  >
                    READ FULL STORY
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 text-center text-xs font-mono" style={{ color: '#3D3010' }}>
        — END OF VOYAGER STORY ARCHIVE —
      </div>
    </div>
  )
}
