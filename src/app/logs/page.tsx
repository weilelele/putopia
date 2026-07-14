'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getPublishedStories } from '@/lib/actions/stories'
import { useAuth } from '@/lib/auth-context'
import { SectionTracker } from '@/components/section-tracker'
import { BackLink } from '@/components/back-link'
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
          <BackLink href="/voyagers" label="VOYAGERS" />
          <h1>VOYAGER <span className="accent">LOGS</span></h1>
          <p className="sub">{stories.length} entries on record</p>
        </div>
        {isAtLeast('architect') && (
          <button className="btn-secondary" style={{ padding: '0.55rem 1.25rem', fontSize: 'var(--fs-caption)' }}>
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
                style={{ background: '#0F1430', borderColor: 'rgba(227,82,5,0.16)' }}
              >
                {story.author_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={story.author_avatar_url}
                    alt={story.author_name}
                    className="w-9 h-9 rounded-full shrink-0"
                    style={{ objectFit: 'cover', border: '1px solid rgba(200,68,6,0.3)' }}
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0"
                    style={{
                      background: 'rgba(200,68,6,0.12)',
                      color: '#C84406',
                      border: '1px solid rgba(200,68,6,0.3)',
                    }}
                  >
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono font-semibold" style={{ color: '#F5F5F5' }}>
                    {story.author_name}
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'rgba(245,245,245,0.35)' }}>
                    {formatDate(story.date)}
                  </div>
                </div>
              </div>

              {/* Thumbnail + Content: stacked on mobile, side-by-side on desktop */}
              <div className={story.youtube_id ? 'md:flex md:flex-row-reverse' : ''}>

                {/* YouTube thumbnail — right on desktop, top on mobile */}
                {story.youtube_id && (
                  <div
                    className="md:shrink-0 border-b md:border-b-0 md:border-l"
                    style={{ borderColor: 'rgba(227,82,5,0.16)', width: undefined }}
                  >
                    <div className="md:w-52" style={{ position: 'relative' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://img.youtube.com/vi/${story.youtube_id}/maxresdefault.jpg`}
                        alt={story.title}
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${story.youtube_id}/hqdefault.jpg`
                        }}
                      />
                      <div style={{
                        position: 'absolute', bottom: '8px', right: '8px',
                        background: 'rgba(11,15,23,0.82)',
                        border: '1px solid rgba(200,68,6,0.5)',
                        color: '#C84406',
                        fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em',
                        padding: '3px 7px',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        ▶ VIDEO
                      </div>
                    </div>
                  </div>
                )}

                {/* Text content */}
                <div className="px-4 py-4 flex-1 min-w-0">
                  <h2 className="text-xl font-mono font-semibold mb-3" style={{ color: '#F5F5F5' }}>
                    {story.title}
                  </h2>
                  <p className="text-sm leading-relaxed font-mono" style={{ color: 'rgba(245,245,245,0.55)' }}>
                    {story.excerpt}
                  </p>

                  <div className="mt-4 pt-3 border-t flex items-center gap-2 text-xs font-mono tracking-widest" style={{ borderColor: 'rgba(227,82,5,0.16)', color: '#C84406' }}>
                    READ FULL STORY
                    <ArrowRight size={12} />
                  </div>
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
