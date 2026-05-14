'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { stories } from '../../../../content/stories'
import { ArrowLeft, Send } from 'lucide-react'

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
  const story = stories.find((s) => s.id === id)

  const [comments, setComments] = useState<Comment[]>(
    id === 'i-will-keep-the-secret' ? MOCK_COMMENTS : MOCK_COMMENTS_STORY2
  )
  const [commentText, setCommentText] = useState('')
  const [transmitted, setTransmitted] = useState(false)

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0A00' }}>
        <div className="text-center">
          <div className="text-2xl font-mono mb-4" style={{ color: '#C43020' }}>[ 404 ]</div>
          <div className="text-sm font-mono mb-6" style={{ color: '#7A6A40' }}>STORY NOT FOUND IN ARCHIVE</div>
          <Link href="/logs" className="text-xs font-mono tracking-widest" style={{ color: '#E8A020' }}>
            ← RETURN TO LOGS
          </Link>
        </div>
      </div>
    )
  }

  const paragraphs = story.content.split('\n\n').filter(Boolean)

  const handleTransmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
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
    <div className="min-h-screen p-6 md:p-8 max-w-2xl mx-auto" style={{ background: '#0F0A00' }}>
      {/* Back */}
      <div className="mb-6">
        <Link
          href="/logs"
          className="flex items-center gap-2 text-xs font-mono tracking-widest transition-colors"
          style={{ color: '#7A6A40' }}
        >
          <ArrowLeft size={12} />
          VOYAGER STORIES
        </Link>
      </div>

      {/* Story header */}
      <div className="mb-8 border-b pb-6" style={{ borderColor: '#5C4A1E' }}>
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {story.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-mono px-2 py-0.5 rounded border tracking-widest uppercase"
              style={{ color: '#E8A020', borderColor: '#5C4A1E', background: 'rgba(232,160,32,0.08)' }}
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-2xl font-mono font-bold tracking-wider mb-4" style={{ color: '#F5E6C8' }}>
          {story.title}
        </h1>

        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0"
            style={{ background: 'rgba(232,160,32,0.15)', color: '#E8A020', border: '1px solid rgba(232,160,32,0.35)' }}
          >
            {getInitials(story.author)}
          </div>
          <div>
            <div className="text-sm font-mono font-semibold" style={{ color: '#F5E6C8' }}>{story.author}</div>
            <div className="text-xs font-mono" style={{ color: '#7A6A40' }}>{formatDate(story.date)}</div>
          </div>
        </div>
      </div>

      {/* Story body */}
      <article className="mb-12 space-y-5">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-sm leading-7 font-mono" style={{ color: '#C4A96A' }}>
            {para}
          </p>
        ))}
      </article>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px" style={{ background: '#3D3010' }} />
        <div className="text-xs tracking-widest font-mono" style={{ color: '#5C4A1E' }}>TRANSMISSIONS</div>
        <div className="flex-1 h-px" style={{ background: '#3D3010' }} />
      </div>

      {/* Comments */}
      <div className="space-y-4 mb-8">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="border rounded p-4"
            style={{
              background: '#221800',
              borderColor: '#3D3010',
              boxShadow: 'inset 0 1px 0 rgba(232,160,32,0.08)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0"
                style={{ background: 'rgba(196,169,106,0.15)', color: '#C4A96A', border: '1px solid rgba(196,169,106,0.3)' }}
              >
                {getInitials(comment.author)}
              </div>
              <span className="text-xs font-mono font-semibold" style={{ color: '#C4A96A' }}>{comment.author}</span>
              <span className="text-xs font-mono ml-auto" style={{ color: '#5C4A1E' }}>
                {new Date(comment.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <p className="text-sm font-mono leading-relaxed" style={{ color: '#7A6A40' }}>
              {comment.text}
            </p>
          </div>
        ))}
      </div>

      {/* Comment form */}
      <form onSubmit={handleTransmit}>
        <div
          className="border rounded p-4"
          style={{ background: '#221800', borderColor: '#5C4A1E', boxShadow: 'inset 0 1px 0 rgba(232,160,32,0.1)' }}
        >
          <div className="text-xs font-mono tracking-widest mb-3" style={{ color: '#7A6A40' }}>
            TRANSMIT A MESSAGE
          </div>
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Leave a transmission for this Voyager..."
            className="w-full px-3 py-2 text-sm font-mono rounded border bg-transparent outline-none transition-colors resize-none"
            style={{ borderColor: '#3D3010', color: '#F5E6C8' }}
            onFocus={(e) => (e.target.style.borderColor = '#E8A020')}
            onBlur={(e) => (e.target.style.borderColor = '#3D3010')}
          />
          <div className="flex items-center justify-between mt-3">
            {transmitted && (
              <span className="text-xs font-mono" style={{ color: '#4D8C3F' }}>
                ✓ TRANSMISSION SENT
              </span>
            )}
            {!transmitted && <span />}
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-mono tracking-widest border rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ borderColor: '#E8A020', color: '#0F0A00', background: '#E8A020' }}
            >
              <Send size={10} />
              TRANSMIT
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
