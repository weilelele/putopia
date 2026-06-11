'use client'

import { useState } from 'react'
import { getSignalFeed, submitSignalResponse } from '@/lib/actions/signal-tasks'
import type { SignalFeed as Feed, PublicSignalTask, PublicSignalAsset } from '@/lib/actions/signal-tasks'

const TYPE_HINT: Record<string, string> = {
  visual_match: '哪个信号与参考信号来自同一个世界？',
  visual_odd_one: '哪个信号不属于这一组？',
  audio_odd_one: '哪段声音不属于这一组？',
}

export function SignalFeed({ initial }: { initial: Feed }) {
  const [feed, setFeed] = useState<Feed>(initial)

  const refresh = async () => setFeed(await getSignalFeed(feed.date))

  return (
    <main style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', padding: '32px 28px', fontFamily: 'var(--font-mono, monospace)', color: '#F5F5F5' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* header */}
        <div style={{ borderBottom: '1px solid rgba(255,107,53,0.2)', paddingBottom: 16, marginBottom: 24 }}>
          <div style={{ color: '#E85D04', fontSize: 12, letterSpacing: '0.3em', marginBottom: 8 }}>// SIGNAL TASKS</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '0.04em' }}>今日信号征集</h1>
          <p style={{ fontSize: 13, color: 'rgba(245,245,245,0.55)', marginTop: 10, lineHeight: 1.7 }}>
            组织在日常观测中收集到大量杂乱信号。请凭你的直觉判断它们之间的关联——你的每一次选择都会作为一票汇入组织的研判。
            <br />这里没有标准答案；当天结束后，组织会基于众人的反馈给出研判方向。
          </p>
          <div style={{ fontSize: 11, color: 'rgba(245,245,245,0.35)', marginTop: 8, letterSpacing: '0.1em' }}>
            征集日期 {feed.date} · {feed.tasks.length} 个信号组
            {!feed.canParticipate && <span style={{ color: '#E8A020', marginLeft: 12 }}>● 你可以浏览，但仅 Voyager 可参与填报</span>}
          </div>
        </div>

        {feed.tasks.length === 0 ? (
          <div style={{ color: 'rgba(245,245,245,0.4)', fontSize: 14, padding: '48px 0', textAlign: 'center' }}>
            今日暂无信号征集任务。
          </div>
        ) : (
          feed.tasks.map((task, idx) => (
            <TaskCard key={task.id} task={task} index={idx} canParticipate={feed.canParticipate} onFiled={refresh} />
          ))
        )}
      </div>
    </main>
  )
}

function AssetView({ asset }: { asset: PublicSignalAsset }) {
  if (asset.media === 'video') {
    return <video src={asset.processed_url || ''} controls loop muted playsInline style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#070912', display: 'block' }} />
  }
  if (asset.media === 'audio') {
    return (
      <div style={{ background: '#070912', padding: '28px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, aspectRatio: '1', justifyContent: 'center' }}>
        <span style={{ fontSize: 34 }}>🔊</span>
        <audio src={asset.processed_url || ''} controls style={{ width: '100%' }} />
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset.processed_url || ''} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#070912', display: 'block' }} />
}

function TaskCard({
  task, index, canParticipate, onFiled,
}: {
  task: PublicSignalTask
  index: number
  canParticipate: boolean
  onFiled: () => void
}) {
  const [pick, setPick] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const responded = !!task.mySelection
  const main = task.assets.find((a) => a.asset_role === 'main')
  const options = task.assets.filter((a) => a.asset_role !== 'main')
  const total = task.distribution
    ? Object.values(task.distribution).reduce((s, n) => s + n, 0)
    : 0

  const submit = async () => {
    if (!pick) return
    setBusy(true); setErr('')
    const r = await submitSignalResponse(task.id, pick)
    setBusy(false)
    if (!r.ok) { setErr(r.error || '提交失败'); return }
    onFiled()
  }

  const showDistribution = responded && task.distribution
  const cols = `repeat(auto-fill, minmax(${options.length > 3 ? 160 : 200}px, 1fr))`

  const th = task.thread

  return (
    <section style={{ background: '#0F1430', border: '1px solid rgba(255,107,53,0.16)', padding: 20, marginBottom: 20 }}>
      {/* investigation-thread continuity strip */}
      {th && (
        <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px dashed rgba(255,107,53,0.18)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: 'rgba(245,245,245,0.5)', letterSpacing: '0.15em' }}>
              ◇ 调查线 · 第 {th.dayIndex + 1} 日
            </span>
            <span style={{ fontSize: 10, letterSpacing: '0.1em', color: th.status === 'locked' ? '#20D890' : th.status === 'lost' ? '#E83030' : 'rgba(245,245,245,0.4)' }}>
              {th.status === 'locked' ? '✓ 信号已锁定' : th.status === 'lost' ? '✕ 信号失联' : `锁定进度 ${th.clarity}/${th.clarityMax}`}
            </span>
          </div>
          {/* clarity meter */}
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: th.clarityMax }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, background: i < th.clarity ? (th.status === 'locked' ? '#20D890' : '#E85D04') : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>
          {th.prevParticipants != null && (
            <div style={{ fontSize: 11, color: 'rgba(245,245,245,0.45)', marginTop: 8, lineHeight: 1.6 }}>
              今日信号承接昨日 <span style={{ color: '#E85D04' }}>{th.prevParticipants}</span> 位观测员的研判演化而来——组织正沿着集体的判断逐步逼近真实信号。
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ color: '#E85D04', fontSize: 11, letterSpacing: '0.2em' }}>信号组 {String(index + 1).padStart(2, '0')}</span>
        <span style={{ fontSize: 11, color: 'rgba(245,245,245,0.4)' }}>{task.participantCount} 人已研判</span>
      </div>
      <p style={{ fontSize: 15, margin: '0 0 16px', lineHeight: 1.6 }}>{task.prompt || TYPE_HINT[task.type] || '请作出你的判断'}</p>

      {main && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: 'rgba(245,245,245,0.4)', letterSpacing: '0.15em', marginBottom: 6 }}>参考信号</div>
          <div style={{ maxWidth: 240, border: '1px solid rgba(255,107,53,0.3)' }}><AssetView asset={main} /></div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12 }}>
        {options.map((a, i) => {
          const isMine = task.mySelection === a.id
          const isPicked = pick === a.id
          const count = task.distribution?.[a.id] ?? 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const selectable = canParticipate && !responded
          return (
            <div
              key={a.id}
              onClick={() => selectable && setPick(a.id)}
              style={{
                border: isMine ? '2px solid #20D890' : isPicked ? '2px solid #FF6B35' : '1px solid rgba(255,107,53,0.16)',
                background: '#070912',
                cursor: selectable ? 'pointer' : 'default',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 2, background: 'rgba(7,9,18,0.8)', color: 'rgba(245,245,245,0.7)', fontSize: 10, padding: '2px 6px', letterSpacing: '0.1em' }}>
                {String.fromCharCode(65 + i)}
              </div>
              {isMine && <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, color: '#20D890', fontSize: 11 }}>✓ 你的选择</div>}
              <AssetView asset={a} />
              {showDistribution && (
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: isMine ? '#20D890' : '#E85D04' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(245,245,245,0.5)', marginTop: 4 }}>{pct}% · {count} 票</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* footer / actions */}
      <div style={{ marginTop: 16 }}>
        {responded ? (
          <div style={{ fontSize: 12, color: '#20D890', letterSpacing: '0.05em' }}>
            ● 你的研判已记入组织的信号汇总。当天结束后将公布研判方向。
          </div>
        ) : canParticipate ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={submit}
              disabled={!pick || busy}
              style={{
                padding: '8px 20px', fontFamily: 'inherit', fontSize: 12, letterSpacing: '0.1em',
                border: 'none', cursor: !pick || busy ? 'default' : 'pointer',
                background: !pick || busy ? 'rgba(255,107,53,0.3)' : '#FF6B35', color: '#070912',
              }}
            >
              {busy ? '提交中…' : '提交研判'}
            </button>
            <span style={{ fontSize: 11, color: 'rgba(245,245,245,0.4)' }}>提交后才能看到大家的研判分布</span>
            {err && <span style={{ fontSize: 11, color: '#E83030' }}>{err}</span>}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'rgba(245,245,245,0.45)' }}>
            仅 Voyager 可参与信号研判。<a href="/login" style={{ color: '#E85D04' }}>登录</a> 或成为 Voyager 后即可填报。
          </div>
        )}
      </div>
    </section>
  )
}
