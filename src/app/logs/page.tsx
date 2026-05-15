'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getPublishedStories } from '@/lib/actions/stories'
import { useAuth } from '@/lib/auth-context'
import { SectionTracker } from '@/components/section-tracker'
import { Plus, ArrowRight } from 'lucide-react'
import type { Story } from '@/types/database'

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
  const [stories, setStories] = useState<Story[]>([])

  useEffect(() => { getPublishedStories().then(setStories) }, [])

  return (
    <div className="main">
      <SectionTracker section="logs" />
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> VOYAGER LOGS</div>
        <div className="right">
          <div className="item">ENTRIES <span className="val">{stories.length}</span></div>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="h-eyebrow">// FIELD ARCHIVE</div>
          <h1>VOYAGER <span className="accent">LOGS</span></h1>
          <p className="sub">{stories.length} entries on record</p>
        </div>
        {isAtLeast('architect') && (
          <button className="btn-secondary" style={{ padding: '0.55rem 1.25rem', fontSize: '0.7rem' }}>
            <Plus size={12} />
            SUBMIT LOG ENTRY
          </button>
        )}
      </div>

      {/* Stories Feed */}
      <div className="space-y-6 max-w-3xl">
        {stories.map((story) => {
          const initials = getInitials(story.author_name)
          return (
            <div
              key={story.id}
              className="story-card overflow-hidden"
            >
              {/* Author bar */}
              <div
                className="flex items-center gap-3 px-4 py-3 border-b"
                style={{ background: '#0D1020', borderColor: '#1A2238' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0"
                  style={{
                    background: 'rgba(232,90,0,0.12)',
                    color: '#E85A00',
                    border: '1px solid rgba(232,90,0,0.3)',
                  }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono font-semibold" style={{ color: '#EDE8DE' }}>
                    {story.author_name}
                  </div>
                  <div className="text-xs font-mono" style={{ color: '#4A5570' }}>
                    {formatDate(story.date)}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 py-4">
                <h2 className="text-base font-mono font-semibold mb-3" style={{ color: '#EDE8DE' }}>
                  {story.title}
                </h2>
                <p className="text-sm leading-relaxed font-mono" style={{ color: '#8A9AB5' }}>
                  {story.excerpt}
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                  {story.tags.map((tag) => (
                    <span
                      key={tag}
                      className="label-tag"
                      style={{ color: '#E85A00' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t" style={{ borderColor: '#1A2238' }}>
                  <Link
                    href={`/logs/${story.id}`}
                    className="flex items-center gap-2 text-xs font-mono tracking-widest transition-colors"
                    style={{ color: '#E85A00' }}
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

      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>FIELD ARCHIVE</div>
      </div>
    </div>
  )
}
