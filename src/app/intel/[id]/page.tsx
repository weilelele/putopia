'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getIntelById } from '@/lib/actions/intel'
import { ArrowLeft, Send } from 'lucide-react'
import type { Intel } from '@/types/database'

const TAG_STYLES = {
  NOTICE: { color: '#8A9AB5' },
  DEVICE: { color: '#E85A00' },
  ORG: { color: '#00C8C8' },
}

interface Comment {
  id: string
  author: string
  timestamp: string
  text: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function IntelDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [entry, setEntry] = useState<Intel | null | undefined>(undefined)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [transmitted, setTransmitted] = useState(false)

  useEffect(() => {
    getIntelById(id).then((e) => setEntry(e ?? null))
  }, [id])

  if (entry === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070912' }}>
        <div className="text-xs font-mono" style={{ color: '#4A5570' }}>LOADING...</div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070912' }}>
        <div className="text-center">
          <div className="text-2xl font-mono mb-4" style={{ color: '#E83030' }}>[ 404 ]</div>
          <div className="text-sm font-mono mb-6" style={{ color: '#4A5570' }}>INTEL ENTRY NOT FOUND</div>
          <Link href="/intel" className="text-xs font-mono tracking-widest" style={{ color: '#E85A00' }}>
            ← RETURN TO INTEL
          </Link>
        </div>
      </div>
    )
  }

  const tagColor = TAG_STYLES[entry.tag]?.color ?? '#8A9AB5'

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
    <div className="min-h-screen p-6 md:p-8 max-w-2xl mx-auto" style={{ background: '#070912' }}>
      {/* Back */}
      <div className="mb-6">
        <Link
          href="/intel"
          className="flex items-center gap-2 text-xs font-mono tracking-widest transition-colors"
          style={{ color: '#4A5570' }}
        >
          <ArrowLeft size={12} />
          INTEL
        </Link>
      </div>

      {/* Entry header */}
      <div className="mb-8 border-b pb-6" style={{ borderColor: '#1E2840' }}>
        <div className="flex items-center gap-3 mb-4">
          <span className="label-tag" style={{ color: tagColor }}>{entry.tag}</span>
          <span className="text-xs font-mono" style={{ color: '#4A5570' }}>{formatDate(entry.timestamp)}</span>
        </div>
        <h1 className="text-xl font-mono font-bold tracking-wider" style={{ color: '#EDE8DE' }}>
          {entry.title}
        </h1>
      </div>

      {/* Content */}
      <article className="mb-12">
        <p className="text-sm leading-7 font-mono" style={{ color: '#8A9AB5', whiteSpace: 'pre-wrap' }}>
          {entry.content}
        </p>
      </article>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px" style={{ background: '#1A2238' }} />
        <div className="text-xs tracking-widest font-mono" style={{ color: '#4A5570' }}>TRANSMISSIONS</div>
        <div className="flex-1 h-px" style={{ background: '#1A2238' }} />
      </div>

      {/* Comments */}
      {comments.length > 0 && (
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
      )}

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
            placeholder="Leave a transmission..."
            className="w-full px-3 py-2 text-sm font-mono border bg-transparent outline-none transition-colors resize-none"
            style={{ borderColor: '#1A2238', color: '#EDE8DE' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(232,90,0,0.5)')}
            onBlur={(e) => (e.target.style.borderColor = '#1A2238')}
          />
          <div className="flex items-center justify-between mt-3">
            {transmitted ? (
              <span className="text-xs font-mono" style={{ color: '#20D890' }}>✓ TRANSMISSION SENT</span>
            ) : (
              <span />
            )}
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
  )
}
