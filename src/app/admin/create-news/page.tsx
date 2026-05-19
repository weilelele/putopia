'use client'

import { useState, useEffect } from 'react'
import { generateNews, getArchitects } from '@/lib/actions/news-gen'
import { createIntel } from '@/lib/actions/intel'
import type { VoyagerProfile, IntelTag } from '@/types/database'
import type { GeneratedNews } from '@/lib/actions/news-gen'

// ── 样式常量（与现有 admin 风格一致）─────────────────────────────────────
const S = {
  card:  { background: '#111525', border: '1px solid #1E2840', padding: '24px', marginBottom: '16px' } as React.CSSProperties,
  label: { display: 'block', color: '#4A5570', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '6px' } as React.CSSProperties,
  input: { width: '100%', background: '#0D1020', border: '1px solid #1E2840', color: '#EDE8DE', padding: '8px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
  area:  { width: '100%', background: '#0D1020', border: '1px solid #1E2840', color: '#EDE8DE', padding: '8px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' } as React.CSSProperties,
  sel:   { width: '100%', background: '#0D1020', border: '1px solid #1E2840', color: '#EDE8DE', padding: '8px 10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none' } as React.CSSProperties,
  btn:   (color: string, dim?: boolean) => ({
    padding: '9px 22px', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.15em',
    cursor: dim ? 'not-allowed' : 'pointer', border: `1px solid ${color}`, color,
    background: dim ? 'transparent' : `${color}14`, opacity: dim ? 0.5 : 1,
  }) as React.CSSProperties,
}

const TAG_LABELS: Record<IntelTag, string> = { ORG: 'ORG — 组织', NOTICE: 'NOTICE — 通知', DEVICE: 'DEVICE — 设备' }

// Putopia 固定风格后缀 — 每张图都强制应用，保证视觉一致性
const STYLE_SUFFIX = [
  'cinematic still frame',
  'deep void background',
  'single dramatic light source amber or cyan',
  'no people no text no typography',
  'dark science fiction aesthetic',
  'subtle film grain',
  'high detail sharp focus',
].join(', ')

// Pollinations 图片 URL（预览尺寸 800×420，生成快）
function pollinationsUrl(prompt: string, seed: number) {
  const full = `${prompt}, ${STYLE_SUFFIX}`
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=800&height=420&seed=${seed}&nologo=true&model=flux`
}

// ── 阶段类型 ─────────────────────────────────────────────────────────────
type Phase = 'input' | 'review' | 'done'

export default function CreateNewsPage() {
  // 基础状态
  const [architects, setArchitects] = useState<VoyagerProfile[]>([])
  const [loading, setLoading]       = useState(true)

  // 输入阶段
  const [selectedId, setSelectedId] = useState('')
  const [idea, setIdea]             = useState('')
  const [tag, setTag]               = useState<IntelTag>('ORG')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]     = useState<string | null>(null)

  // 审核阶段
  const [phase, setPhase]           = useState<Phase>('input')
  const [generated, setGenerated]   = useState<GeneratedNews | null>(null)
  const [editTitle, setEditTitle]   = useState('')
  const [editContent, setEditContent] = useState('')
  const [imageUrls, setImageUrls]   = useState<string[]>([])
  const [selectedImg, setSelectedImg] = useState<string | null>(null)
  const [imgErrors, setImgErrors]   = useState<boolean[]>([false, false, false])
  const [imgLoaded, setImgLoaded]   = useState<boolean[]>([false, false, false])

  // 发布阶段
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPubError] = useState<string | null>(null)
  const [publishedId, setPublishedId] = useState<string | null>(null)

  useEffect(() => {
    getArchitects().then(data => { setArchitects(data); setLoading(false) })
  }, [])

  const selectedPersona = architects.find(a => a.id === selectedId)

  // ── 生成 ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedId) { setGenError('请选择发布者'); return }
    if (!idea.trim()) { setGenError('请输入核心 Idea'); return }
    if (!selectedPersona) return

    setGenerating(true); setGenError(null)

    const { data, error } = await generateNews(idea.trim(), {
      display_name: selectedPersona.display_name,
      bio: selectedPersona.bio,
      location: selectedPersona.location,
    }, tag)

    setGenerating(false)

    if (error || !data) { setGenError(error ?? '生成失败，请重试'); return }

    setGenerated(data)
    setEditTitle(data.title)
    setEditContent(data.content)

    // 生成三个不同 seed 的 Pollinations 图片
    const seeds = [42, 137, 256]
    const urls = seeds.map(s => pollinationsUrl(data.imagePrompt, s))
    setImageUrls(urls)
    setSelectedImg(null)
    setImgErrors([false, false, false])
    setImgLoaded([false, false, false])
    setPhase('review')
  }

  // ── 发布 ──────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!selectedPersona) return
    setPublishing(true); setPubError(null)

    // 生成 Intel ID
    const ts = Date.now()
    const id = `INT-${ts.toString().slice(-6)}`

    const payload = {
      id,
      title: editTitle.trim(),
      content: editContent.trim(),
      timestamp: new Date().toISOString(),
      tag,
      classified: false,
      images: selectedImg ? [selectedImg] : [],
      publisher_name: selectedPersona.display_name,
      publisher_id: selectedPersona.id,
      created_by: selectedPersona.id,
    }

    const { error } = await createIntel(payload)
    setPublishing(false)

    if (error) { setPubError(error); return }

    setPublishedId(id)
    setPhase('done')
  }

  // ── 重置 ──────────────────────────────────────────────────────────────
  const handleReset = () => {
    setPhase('input')
    setIdea('')
    setGenerated(null)
    setEditTitle('')
    setEditContent('')
    setImageUrls([])
    setSelectedImg(null)
    setGenError(null)
    setPubError(null)
    setPublishedId(null)
  }

  // ── 渲染 ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* 页头 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ color: '#4A5570', fontSize: '11px', letterSpacing: '0.3em' }}>ADMIN // AI NEWS</div>
          <div style={{ color: '#EDE8DE', fontSize: '20px', fontWeight: 'bold', marginTop: '2px' }}>AI 情报生成</div>
        </div>
        {phase !== 'input' && (
          <button onClick={handleReset} style={S.btn('#4A5570')}>← 重新开始</button>
        )}
      </div>

      {/* 步骤指示器 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {(['input', 'review', 'done'] as Phase[]).map((p, i) => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '11px', fontFamily: 'monospace',
              background: phase === p ? '#E85A00' : ((['input','review','done'].indexOf(phase) > i) ? '#1E2840' : '#0D1020'),
              border: `1px solid ${phase === p ? '#E85A00' : '#1E2840'}`,
              color: phase === p ? '#fff' : '#4A5570',
            }}>{i + 1}</div>
            <span style={{ fontSize: '11px', color: phase === p ? '#EDE8DE' : '#4A5570', letterSpacing: '0.08em' }}>
              {p === 'input' ? '输入 Idea' : p === 'review' ? '审核草稿' : '发布完成'}
            </span>
            {i < 2 && <span style={{ color: '#1E2840', marginLeft: '4px' }}>──</span>}
          </div>
        ))}
      </div>

      {/* ── 阶段 1：输入 ─────────────────────────────────────────────── */}
      {phase === 'input' && (
        <div style={S.card}>
          {loading ? (
            <div style={{ color: '#4A5570', textAlign: 'center', padding: '20px' }}>加载成员列表...</div>
          ) : architects.length === 0 ? (
            <div style={{ color: '#E83030', fontSize: '13px', padding: '16px', background: 'rgba(232,48,48,0.08)', border: '1px solid rgba(232,48,48,0.3)' }}>
              暂无 Architect 成员。请先运行 <code style={{ color: '#E85A00' }}>node scripts/create-architect.mjs</code> 创建虚拟成员。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* 发布者选择 */}
              <div>
                <label style={S.label}>发布者 *</label>
                <select style={S.sel} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                  <option value="">— 选择 Architect —</option>
                  {architects.map(a => (
                    <option key={a.id} value={a.id}>{a.display_name}{a.location ? `  ·  ${a.location}` : ''}</option>
                  ))}
                </select>
                {selectedPersona?.bio && (
                  <div style={{ marginTop: '8px', padding: '8px 10px', background: '#0D1020', border: '1px solid #1A2238', color: '#4A5570', fontSize: '12px', lineHeight: 1.6 }}>
                    {selectedPersona.bio}
                  </div>
                )}
              </div>

              {/* 情报类型 */}
              <div>
                <label style={S.label}>情报类型</label>
                <select style={S.sel} value={tag} onChange={e => setTag(e.target.value as IntelTag)}>
                  {(Object.entries(TAG_LABELS) as [IntelTag, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Idea 输入 */}
              <div>
                <label style={S.label}>核心 Idea *</label>
                <textarea
                  style={{ ...S.area, minHeight: '120px' }}
                  value={idea}
                  onChange={e => setIdea(e.target.value)}
                  placeholder="写下你的组织故事灵感，几句话即可。&#10;&#10;例如：本周我们新增了两名来自东亚的 Voyager，他们分别持有 Unit 031 和 Unit 032。这标志着我们在亚洲的观测网络进一步扩张。"
                />
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#4A5570' }}>{idea.length} 字</div>
              </div>

              {genError && (
                <div style={{ padding: '8px 12px', background: 'rgba(232,48,48,0.1)', border: '1px solid #E83030', color: '#E83030', fontSize: '13px' }}>
                  {genError}
                </div>
              )}

              <div>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  style={S.btn('#22D4E0', generating)}
                >
                  {generating ? '✦ 生成中...' : '✦ AI 生成草稿'}
                </button>
                {generating && (
                  <span style={{ marginLeft: '12px', fontSize: '11px', color: '#4A5570' }}>
                    正在调用 Claude，通常需要 5-10 秒...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 阶段 2：审核 ─────────────────────────────────────────────── */}
      {phase === 'review' && generated && selectedPersona && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 发布者信息 */}
          <div style={{ ...S.card, borderColor: '#22D4E0', paddingTop: '14px', paddingBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {selectedPersona.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedPersona.avatar_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #1E2840' }} />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1E2840', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22D4E0', fontSize: '14px', fontFamily: 'monospace' }}>
                  {selectedPersona.display_name[0]}
                </div>
              )}
              <div>
                <div style={{ color: '#EDE8DE', fontSize: '13px' }}>{selectedPersona.display_name}</div>
                <div style={{ color: '#4A5570', fontSize: '11px', letterSpacing: '0.06em' }}>ARCHITECT · {tag}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#4A5570' }}>
                以此身份发布
              </div>
            </div>
          </div>

          {/* 标题编辑 */}
          <div style={S.card}>
            <label style={S.label}>标题（可编辑）</label>
            <input style={S.input} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          </div>

          {/* 正文编辑 */}
          <div style={S.card}>
            <label style={S.label}>正文（可编辑）</label>
            <textarea style={{ ...S.area, minHeight: '160px' }} value={editContent} onChange={e => setEditContent(e.target.value)} />
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#4A5570' }}>
              {editContent.length} 字 · 配图提示词：<span style={{ color: '#4A5570', fontStyle: 'italic' }}>{generated.imagePrompt}</span>
            </div>
          </div>

          {/* 配图选择 */}
          <div style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <label style={{ ...S.label, marginBottom: 0 }}>配图（点击选择，或跳过）</label>
              <span style={{ fontSize: '11px', color: '#4A5570' }}>
                {imgLoaded.filter(Boolean).length} / 3 已加载
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {imageUrls.map((url, i) => (
                <div
                  key={i}
                  onClick={() => imgLoaded[i] && !imgErrors[i] && setSelectedImg(selectedImg === url ? null : url)}
                  style={{
                    cursor: imgLoaded[i] && !imgErrors[i] ? 'pointer' : 'default',
                    border: selectedImg === url ? '2px solid #22D4E0' : '2px solid #1E2840',
                    position: 'relative', aspectRatio: '800/420', overflow: 'hidden',
                    background: '#0D1020',
                  }}
                >
                  {/* 骨架屏：加载中 */}
                  {!imgLoaded[i] && !imgErrors[i] && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', border: '2px solid #1E2840', borderTop: '2px solid #22D4E0', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '10px', color: '#4A5570', letterSpacing: '0.1em' }}>GENERATING</span>
                    </div>
                  )}

                  {/* 加载失败 */}
                  {imgErrors[i] && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#4A5570', fontSize: '11px' }}>
                      <span style={{ fontSize: '18px' }}>⊘</span>
                      <span>加载失败</span>
                    </div>
                  )}

                  {/* 图片本体（始终挂载，onLoad 后显示） */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`备选图 ${i + 1}`}
                    onLoad={() => setImgLoaded(prev => { const n = [...prev]; n[i] = true; return n })}
                    onError={() => { setImgErrors(prev => { const n = [...prev]; n[i] = true; return n }); setImgLoaded(prev => { const n = [...prev]; n[i] = true; return n }) }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: imgLoaded[i] && !imgErrors[i] ? 1 : 0, transition: 'opacity 0.3s' }}
                  />

                  {/* 已选标记 */}
                  {selectedImg === url && (
                    <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#22D4E0', color: '#0D1020', fontSize: '10px', padding: '2px 6px', fontFamily: 'monospace' }}>✓ 已选</div>
                  )}

                  {/* 图片序号 */}
                  <div style={{ position: 'absolute', bottom: '5px', left: '6px', background: 'rgba(0,0,0,0.7)', color: '#4A5570', fontSize: '10px', padding: '1px 5px', fontFamily: 'monospace' }}>
                    {imgLoaded[i] && !imgErrors[i] ? `图 ${i + 1}` : '...'}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#4A5570' }}>
              Pollinations.ai (Flux) · 可不选图直接发布
            </div>
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {/* 操作区 */}
          {publishError && (
            <div style={{ padding: '8px 12px', background: 'rgba(232,48,48,0.1)', border: '1px solid #E83030', color: '#E83030', fontSize: '13px' }}>
              {publishError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handlePublish}
              disabled={publishing || !editTitle.trim() || !editContent.trim()}
              style={S.btn('#E85A00', publishing || !editTitle.trim() || !editContent.trim())}
            >
              {publishing ? '发布中...' : '▶ 发布情报'}
            </button>
            <button onClick={handleReset} style={S.btn('#4A5570')}>
              ↺ 重新生成
            </button>
            <span style={{ fontSize: '11px', color: '#4A5570' }}>
              {!selectedImg ? '未选图片，将以无图发布' : '已选 1 张配图'}
            </span>
          </div>
        </div>
      )}

      {/* ── 阶段 3：完成 ─────────────────────────────────────────────── */}
      {phase === 'done' && (
        <div style={{ ...S.card, borderColor: '#20D890', textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ color: '#20D890', fontSize: '28px', marginBottom: '12px' }}>✓</div>
          <div style={{ color: '#EDE8DE', fontSize: '16px', marginBottom: '8px' }}>情报发布成功</div>
          <div style={{ color: '#4A5570', fontSize: '12px', marginBottom: '24px' }}>
            ID: <span style={{ color: '#E85A00' }}>{publishedId}</span> · 以 {selectedPersona?.display_name} 身份发布
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/intel" target="_blank" style={{ ...S.btn('#22D4E0'), textDecoration: 'none', display: 'inline-block' }}>
              查看情报页 →
            </a>
            <button onClick={handleReset} style={S.btn('#4A5570')}>
              + 再创建一条
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
