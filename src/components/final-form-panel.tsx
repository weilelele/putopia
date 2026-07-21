'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { listFinalFormAssets, recordFinalFormAsset, removeFinalFormAsset, graduateWorld } from '@/lib/actions/worlds'
import type { WorldFinalAsset } from '@/types/database'

/** Capture a video's first frame as a JPEG poster, client-side. Null on failure. */
function capturePoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.preload = 'metadata'; v.muted = true; v.playsInline = true
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.1, (v.duration || 1) - 0.01) } catch { resolve(null) } }
    v.onseeked = () => {
      const c = document.createElement('canvas')
      c.width = v.videoWidth || 320; c.height = v.videoHeight || 320
      const ctx = c.getContext('2d')
      if (!ctx) { resolve(null); return }
      ctx.drawImage(v, 0, 0, c.width, c.height)
      c.toBlob((b) => resolve(b), 'image/jpeg', 0.85)
    }
    v.onerror = () => resolve(null)
    v.src = URL.createObjectURL(file)
  })
}

/** Admin: upload a world's Final Form (image/video), then graduate it to Archive. */
export function FinalFormPanel({ worldId }: { worldId: string }) {
  const [assets, setAssets] = useState<WorldFinalAsset[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const reload = () => listFinalFormAssets(worldId).then(setAssets)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional load when worldId changes
  useEffect(() => { reload() }, [worldId]) // eslint-disable-line react-hooks/exhaustive-deps

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setBusy(true); setErr('')
    try {
      const media = file.type.startsWith('video') ? 'video' : 'image'
      const supabase = createClient()
      const stamp = Date.now()
      const path = `${worldId}/final/${stamp}-${file.name.replace(/[^\w.-]/g, '_')}`
      const up = await supabase.storage.from('world-images').upload(path, file, { contentType: file.type, upsert: false })
      if (up.error) throw new Error(up.error.message)
      const url = supabase.storage.from('world-images').getPublicUrl(path).data.publicUrl

      let posterUrl: string | null = media === 'image' ? url : null
      if (media === 'video') {
        const poster = await capturePoster(file)
        if (poster) {
          const pPath = `${worldId}/final/${stamp}-poster.jpg`
          const pUp = await supabase.storage.from('world-images').upload(pPath, poster, { contentType: 'image/jpeg', upsert: false })
          if (!pUp.error) posterUrl = supabase.storage.from('world-images').getPublicUrl(pPath).data.publicUrl
        }
      }
      const res = await recordFinalFormAsset({ worldId, media, url, posterUrl, storagePath: path })
      if (res.error) throw new Error(res.error)
      await reload()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const onRemove = async (id: string) => {
    setBusy(true)
    await removeFinalFormAsset(id)
    await reload()
    setBusy(false)
  }

  const onGraduate = async () => {
    setBusy(true); setErr('')
    const r = await graduateWorld(worldId)
    setBusy(false)
    if (!r.ok) { setErr(r.error || 'Failed'); return }
    alert('Graduated to Established — this world is now an Archive World.')
  }

  return (
    <div style={{ background: '#0F1430', border: '1px solid rgba(227,82,5,0.18)', padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.14em', color: '#20D890' }}>FINAL FORM</span>
        <label style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.08em', color: '#E35205', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1, border: '1px solid rgba(227,82,5,0.4)', padding: '4px 10px' }}>
          {busy ? 'Working…' : '+ Upload image / video'}
          <input ref={fileRef} type="file" accept="image/*,video/*" disabled={busy} onChange={onPick} style={{ display: 'none' }} />
        </label>
      </div>

      {err && <div style={{ fontSize: 'var(--fs-caption)', color: '#E83030', marginBottom: 8 }}>{err}</div>}

      {assets.length === 0 ? (
        <div style={{ fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)', marginBottom: 10 }}>The world&apos;s final observed form — upload one or more images, or a video.</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {assets.map((a) => (
            <div key={a.id} style={{ position: 'relative', width: 72, height: 72, border: '1px solid rgba(227,82,5,0.25)', background: '#070912' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.poster_url || a.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {a.media === 'video' && <span style={{ position: 'absolute', bottom: 2, left: 3, fontSize: 'var(--fs-caption)', color: '#20D890' }}>▶</span>}
              <button onClick={() => onRemove(a.id)} disabled={busy} aria-label="Remove" style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, lineHeight: '16px', textAlign: 'center', background: 'rgba(7,9,18,0.8)', border: '1px solid rgba(232,48,48,0.5)', color: '#E83030', fontSize: 12, cursor: 'pointer', padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onGraduate}
        disabled={busy || assets.length === 0}
        style={{ width: '100%', padding: '7px 0', fontSize: 'var(--fs-caption)', letterSpacing: '0.12em', fontWeight: 700, border: 'none', cursor: busy || assets.length === 0 ? 'default' : 'pointer', background: assets.length === 0 ? 'rgba(32,216,144,0.18)' : '#20D890', color: assets.length === 0 ? 'rgba(245,245,245,0.4)' : '#06140D' }}
      >GRADUATE → ESTABLISHED</button>
    </div>
  )
}
