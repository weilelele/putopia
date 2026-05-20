'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getPublishedStories } from '@/lib/actions/stories'
import { useAuth } from '@/lib/auth-context'
import { SectionTracker } from '@/components/section-tracker'
import { Plus, ArrowRight } from 'lucide-react'
import type { StoryWithAvatar } from '@/types/database'

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
  const [stories, setStories] = useState<StoryWithAvatar[]>([])

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
            <Link
              key={story.id}
              href={`/logs/${story.id}`}
              className="story-card overflow-hidden block"
              style={{ textDecoration: 'none' }}
            >
              {/* Author bar */}
              <div
                className="flex items-center gap-3 px-4 py-3 border-b"
                style={{ background: '#0D1020', borderColor: '#1A2238' }}
              >
                {story.author_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={story.author_avatar_url}
                    alt={story.author_name}
                    className="w-9 h-9 rounded-full shrink-0"
                    style={{ objectFit: 'cover', border: '1px solid rgba(232,90,0,0.3)' }}
                  />
                ) : (
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
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono font-semibold" style={{ color: '#EDE8DE' }}>
                    {story.author_name}
                  </div>
                  <div className="text-xs font-mono" style={{ color: '#4A5570' }}>
                    {formatDate(story.date)}
                  </div>
                </div>
              </div>

              {/* YouTube thumbnail */}
              {story.youtube_id && (
                <div style={{ position: 'relative', width: '100%', height: '180px', overflow: 'hidden', borderBottom: '1px solid #1A2238' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://img.youtube.com/vi/${story.youtube_id}/maxresdefault.jpg`}
                    alt={story.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${story.youtube_id}/hqdefault.jpg`
                    }}
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, transparent 40%, rgba(11,15,23,0.55) 100%)',
                  }} />
                  <div style={{
                    position: 'absolute', bottom: '10px', right: '10px',
                    background: 'rgba(11,15,23,0.82)',
                    border: '1px solid rgba(232,90,0,0.5)',
                    color: '#E85A00',
                    fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.12em',
                    padding: '3px 8px',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}>
                    ▶ VIDEO
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="px-4 py-4">
                <h2 className="text-base font-mono font-semibold mb-3" style={{ color: '#EDE8DE' }}>
                  {story.title}
                </h2>
                <p className="text-sm leading-relaxed font-mono" style={{ color: '#8A9AB5' }}>
                  {story.excerpt}
                </p>

                <div className="mt-4 pt-3 border-t flex items-center gap-2 text-xs font-mono tracking-widest" style={{ borderColor: '#1A2238', color: '#E85A00' }}>
                  READ FULL STORY
                  <ArrowRight size={12} />
                </div>
              </div>
            </Link>
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
