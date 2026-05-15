'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getStoryById } from '@/lib/actions/stories'
import { ArrowLeft, Send } from 'lucide-react'
import type { Story } from '@/types/database'
import posthog from 'posthog-js'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

interface Comment {
  id: string
  author: string
  timestamp: string
  text: string
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c1',
    author: 'Voyager Mira',
    timestamp: '2026-04-14T10:22:00Z',
    text: 'The moment you described the red light activating — that is exactly what happened to me the first time. The device knows when you are ready. Welcome to the Collective.',
  },
  {
    id: 'c2',
    author: 'Voyager Hoshino',
    timestamp: '2026-04-15T03:47:00Z',
    text: 'The letter from the previous owner is significant. Twenty years of observation means the device has deep memory. Pay attention to recurring signals. They may be intentional.',
  },
  {
    id: 'c3',
    author: 'Voyager Selene',
    timestamp: '2026-04-18T17:05:00Z',
    text: 'Keep the secret as long as you need to. There is no rush. The console reveals itself on its own timeline.',
  },
]

const MOCK_COMMENTS_STORY2: Comment[] = [
  {
    id: 'c1',
    author: 'Voyager Luke',
    timestamp: '2026-04-30T08:11:00Z',
    text: 'Reading this, I realize I had the same hesitation before my first transmission. The fear of intruding. But that connection you made — it sounds like it was mutual.',
  },
  {
    id: 'c2',
    author: 'Architect Council',
    timestamp: '2026-05-01T11:00:00Z',
    text: 'This has been formally logged as the first confirmed cross-temporal quantum link in Collective records. Your observation report has been archived as a primary reference document.',
  },
]

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function StoryPage() {
  const params = useParams()
  const id = params?.id as string

  const [story, setStory] = useState<Story | null | undefined>(undefined)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [transmitted, setTransmitted] = useState(false)

  useEffect(() => {
    getStoryById(id).then((s) => {
      setStory(s ?? null)
      setComments(id === 'i-will-keep-the-secret' ? MOCK_COMMENTS : MOCK_COMMENTS_STORY2)
    })
  }, [id])

  if (story === undefined) {
    return (
      <div className="main" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-star-deep)', letterSpacing: '0.18em' }}>LOADING...</div>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="main" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--color-fault)', marginBottom: '1rem' }}>[ 404 ]</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-star-deep)', marginBottom: '1.5rem' }}>STORY NOT FOUND IN ARCHIVE</div>
        <Link href="/logs" className="btn-ghost">← RETURN TO LOGS</Link>
      </div>
    )
  }

  const paragraphs = story.content.split('\n\n').filter(Boolean)

  const handleTransmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    posthog.capture('log_comment_sent', { story_id: id, story_title: story?.title })
    const newComment: Comment = {
      id: `c${Date.now()}`,
      author: 'You',
      timestamp: new Date().toISOString(),
      text: commentText.trim(),
    }
    setComments((prev) => [...prev, newComment])
    setCommentText('')
    setTransmitted(true)
    setTimeout(() => setTransmitted(false), 3000)
  }

  return (
    <div className="main">
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> VOYAGER LOGS <span>/</span> ENTRY</div>
      </div>

      <div style={{ maxWidth: '720px', width: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/logs" className="btn-ghost" style={{ display: 'inline-flex' }}>← VOYAGER LOGS</Link>
      </div>

      {/* Story header */}
      <div className="mb-8 border-b pb-6" style={{ borderColor: '#1E2840' }}>
        <div className="flex flex-wrap gap-2 mb-4">
          {story.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-mono px-2 py-0.5 border tracking-widest uppercase"
              style={{ color: '#E85A00', borderColor: '#1E2840', background: 'rgba(232,90,0,0.06)' }}
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-2xl font-mono font-bold tracking-wider mb-4" style={{ color: '#EDE8DE' }}>
          {story.title}
        </h1>

        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0"
            style={{ background: 'rgba(232,90,0,0.12)', color: '#E85A00', border: '1px solid rgba(232,90,0,0.3)' }}
          >
            {getInitials(story.author_name)}
          </div>
          <div>
            <div className="text-sm font-mono font-semibold" style={{ color: '#EDE8DE' }}>{story.author_name}</div>
            <div className="text-xs font-mono" style={{ color: '#4A5570' }}>{formatDate(story.date)}</div>
          </div>
        </div>
      </div>

      {/* Story body */}
      <article className="mb-12 space-y-5">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-sm leading-7 font-mono" style={{ color: '#8A9AB5' }}>
            {para}
          </p>
        ))}
      </article>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px" style={{ background: '#1A2238' }} />
        <div className="text-xs tracking-widest font-mono" style={{ color: '#4A5570' }}>TRANSMISSIONS</div>
        <div className="flex-1 h-px" style={{ background: '#1A2238' }} />
      </div>

      {/* Comments */}
      <div className="space-y-4 mb-8">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="border p-4"
            style={{
              background: '#111525',
              borderColor: '#1A2238',
              boxShadow: 'inset 0 1px 0 rgba(232,90,0,0.04)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0"
                style={{ background: 'rgba(138,154,181,0.12)', color: '#8A9AB5', border: '1px solid rgba(138,154,181,0.25)' }}
              >
                {getInitials(comment.author)}
              </div>
              <span className="text-xs font-mono font-semibold" style={{ color: '#8A9AB5' }}>{comment.author}</span>
              <span className="text-xs font-mono ml-auto" style={{ color: '#4A5570' }}>
                {new Date(comment.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <p className="text-sm font-mono leading-relaxed" style={{ color: '#8A9AB5' }}>
              {comment.text}
            </p>
          </div>
        ))}
      </div>

      {/* Comment form */}
      <form onSubmit={handleTransmit}>
        <div
          className="border p-4"
          style={{ background: '#111525', borderColor: '#1E2840', boxShadow: 'inset 0 1px 0 rgba(232,90,0,0.05)' }}
        >
          <div className="text-xs font-mono tracking-widest mb-3" style={{ color: '#4A5570' }}>
            TRANSMIT A MESSAGE
          </div>
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Leave a transmission for this Voyager..."
            className="w-full px-3 py-2 text-sm font-mono border bg-transparent outline-none transition-colors resize-none"
            style={{ borderColor: '#1A2238', color: '#EDE8DE' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(232,90,0,0.5)')}
            onBlur={(e) => (e.target.style.borderColor = '#1A2238')}
          />
          <div className="flex items-center justify-between mt-3">
            {transmitted && (
              <span className="text-xs font-mono" style={{ color: '#20D890' }}>
                ✓ TRANSMISSION SENT
              </span>
            )}
            {!transmitted && <span />}
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-mono tracking-widest border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ borderColor: '#E85A00', color: '#EDE8DE', background: 'linear-gradient(135deg, #E85A00, #C04000)' }}
            >
              <Send size={10} />
              TRANSMIT
            </button>
          </div>
        </div>
      </form>
      </div>

      <div className="footer-bar" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>PUTOPIA.COLLECTIVE</div>
      </div>
    </div>
  )
}
