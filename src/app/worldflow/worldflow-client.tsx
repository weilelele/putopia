'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Check, ChevronRight, Clock3, Image as ImageIcon,
  Layers3, LockKeyhole, Plus, Save, ShieldCheck, SkipForward, Trash2, Upload, UserRound,
} from 'lucide-react'
import {
  createWorldflowWorld, reviewWorldflowStep, saveWorldflowState, submitWorldflowStep,
  type WorldflowAsset, type WorldflowEvent, type WorldflowState, type WorldflowStepStatus, type WorldflowWorld,
} from '@/lib/actions/worldflow'
import styles from './worldflow.module.css'

const STEPS = [
  ['世界设定', '建立世界背景、规律与冲突', 'foundation'],
  ['风格镜头', '用本地参考图确认视觉基准', 'foundation'],
  ['镜头延展', '建立镜头清单和基础素材', 'foundation'],
  ['角色设定', '可选：维护角色、环境与动机', 'ongoing'],
  ['镜头事件', '逐镜头维护独立的时间与事件', 'ongoing'],
  ['图片素材', '持续为事件添加图片版本', 'ongoing'],
  ['视频素材', '持续为事件添加视频版本', 'ongoing'],
] as const

const STATUS: Record<WorldflowStepStatus, string> = {
  draft: '草稿', review: '待审核', changes: '需修改', approved: '已通过', optional: '可跳过', skipped: '已跳过',
}

function statusOf(state: WorldflowState, step: number): WorldflowStepStatus {
  return state.stepStatuses[String(step)] ?? 'draft'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function normalizeState(state: WorldflowState): WorldflowState {
  return {
    ...state,
    characters: state.characters.map((character) => ({ ...character, description: character.description ?? '' })),
    eventSystems: Object.fromEntries(Object.entries(state.eventSystems).map(([shotId, system]) => [shotId, {
      ...system,
      timeSlots: system.timeSlots.map((slot) => ({
        ...slot,
        events: slot.events.map((event) => ({ ...event, subEvents: event.subEvents ?? [] })),
      })),
    }])),
  }
}

function findEventSelection(timeSlots: WorldflowState['eventSystems'][string]['timeSlots'], selectedId: string | null) {
  if (!selectedId) return null
  for (const slot of timeSlots) {
    for (const parent of slot.events) {
      if (parent.id === selectedId) return { parent, slot, subject: parent, isSubEvent: false as const }
      const subEvent = parent.subEvents.find((item) => item.id === selectedId)
      if (subEvent) return { parent, slot, subject: subEvent, isSubEvent: true as const }
    }
  }
  return null
}

function MaterialUploader({ assets, beforeUpload, canUpload, characterId, eventId, mediaKind = 'mixed', onUploaded, shotId, step, title, worldId }: {
  assets: WorldflowAsset[]
  beforeUpload: () => Promise<string | null>
  canUpload: boolean
  characterId?: string | null
  eventId?: string | null
  mediaKind?: 'image' | 'mixed' | 'video'
  onUploaded: (asset: WorldflowAsset) => void
  shotId?: string | null
  step: number
  title: string
  worldId: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const accept = mediaKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : mediaKind === 'image' ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime'

  async function upload(file: File) {
    setUploading(true); setError('')
    try {
      const saveError = await beforeUpload()
      if (saveError) { setError(`自动保存失败：${saveError}`); return }

      const form = new FormData()
      form.set('file', file); form.set('worldId', worldId); form.set('step', String(step))
      if (shotId) form.set('shotId', shotId)
      if (eventId) form.set('eventId', eventId)
      if (characterId) form.set('characterId', characterId)
      const response = await fetch('/api/worldflow/assets', { method: 'POST', body: form })
      const result = await response.json()
      if (!response.ok) { setError(result.error ?? '上传失败。'); return }
      onUploaded(result as WorldflowAsset)
    } catch {
      setError('自动保存或上传失败，请重试。')
    } finally {
      setUploading(false)
    }
  }

  return <section className={styles.materialSection}>
    <header><div><span>LOCAL MATERIALS</span><h3>{title}</h3></div>{canUpload ? <button aria-label={`为${title}添加本地素材`} className={styles.addMaterial} disabled={uploading} onClick={() => inputRef.current?.click()} type="button"><Plus size={20} />{uploading ? '保存并上传中…' : '添加本地素材'}</button> : <span className={styles.readOnly}>只读</span>}</header>
    <input ref={inputRef} accept={accept} hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = '' }} type="file" />
    {error ? <p className={styles.error}>{error}</p> : null}
    <div className={styles.assetGrid}>
      {assets.map((asset) => <article className={styles.assetCard} key={asset.id}>
        {asset.media_type === 'image' ? <Image alt={asset.file_name} height={540} src={asset.public_url} unoptimized width={960} /> : <video controls preload="metadata" src={asset.public_url} />}
        <div><strong>{asset.file_name}</strong><span>V{asset.version} · {asset.media_type === 'image' ? '图片' : '视频'} · {formatDate(asset.created_at)}</span></div>
      </article>)}
      {!assets.length && canUpload ? <button className={styles.emptyAsset} onClick={() => inputRef.current?.click()} type="button"><Plus size={24} /><strong>从本地添加第一份素材</strong><span>{mediaKind === 'video' ? 'MP4 / WebM / MOV' : mediaKind === 'image' ? 'JPG / PNG / WebP' : '图片或视频'}，单个文件不超过 50 MB</span></button> : null}
      {!assets.length && !canUpload ? <div className={styles.emptyAsset}><LockKeyhole size={22} /><strong>尚未添加素材</strong><span>只有这个世界的创建者可以上传。</span></div> : null}
    </div>
  </section>
}

function ContextAssetRefs({ assets, label }: { assets: WorldflowAsset[]; label: string }) {
  const images = assets.filter((asset) => asset.media_type === 'image')
  if (!images.length) return null
  return <div className={styles.contextAssetRefs} aria-label={label}>
    {images.slice(0, 4).map((asset) => <Image alt={asset.file_name} height={90} key={asset.id} src={asset.public_url} unoptimized width={160} />)}
    {images.length > 4 ? <span>+{images.length - 4}</span> : null}
  </div>
}

export function WorldflowClient({ assets: initialAssets, initialSelectedId, user, worlds }: {
  assets: WorldflowAsset[]
  initialSelectedId: string | null
  user: { id: string; name: string; role: string }
  worlds: WorldflowWorld[]
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(initialSelectedId && worlds.some((world) => world.id === initialSelectedId) ? initialSelectedId : null)
  const selectedSource = worlds.find((world) => world.id === selectedId) ?? null
  const [state, setState] = useState<WorldflowState | null>(selectedSource ? normalizeState(selectedSource.workflow_state) : null)
  const [activeStep, setActiveStep] = useState(selectedSource?.current_step ?? 1)
  const [activeShotId, setActiveShotId] = useState(selectedSource?.workflow_state.shots[0]?.id ?? '')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [assets, setAssets] = useState(initialAssets)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const isArchitect = user.role === 'architect'
  const isOwner = selectedSource?.owner_id === user.id

  const activeShot = state?.shots.find((shot) => shot.id === activeShotId) ?? state?.shots[0]
  const eventSystem = activeShot ? state?.eventSystems[activeShot.id] : undefined
  const eventSelection = eventSystem ? findEventSelection(eventSystem.timeSlots, selectedEventId) : null
  const selectedEvent = eventSelection?.subject ?? null
  const selectedParentEvent = eventSelection?.parent ?? null
  const selectedTimeSlot = eventSelection?.slot ?? null

  function assetsForScope(step: number, scope: {
    characterId?: string | null
    eventId?: string | null
    shotId?: string | null
  } = {}) {
    return assets.filter((asset) => (
      asset.world_id === selectedId
      && asset.step === step
      && asset.character_id === (scope.characterId ?? null)
      && asset.event_id === (scope.eventId ?? null)
      && asset.shot_id === (scope.shotId ?? null)
    ))
  }

  function openWorld(world: WorldflowWorld) {
    setSelectedId(world.id); setState(normalizeState(world.workflow_state)); setActiveStep(world.current_step)
    setActiveShotId(world.workflow_state.shots[0]?.id ?? ''); setSelectedEventId(null); setMessage('')
    window.history.replaceState(null, '', `/worldflow?world=${world.id}`)
  }

  function updateState(update: (current: WorldflowState) => WorldflowState) {
    if (!state || !isOwner) return
    setState(update(state)); setMessage('尚未保存')
  }

  function save() {
    if (!state || !selectedSource) return
    startTransition(async () => {
      const result = await saveWorldflowState({ worldId: selectedSource.id, state, currentStep: activeStep })
      setMessage(result.error ?? '已保存'); if (!result.error) router.refresh()
    })
  }

  async function saveBeforeMaterialUpload() {
    if (!state || !selectedSource) return '当前世界尚未准备好。'
    const result = await saveWorldflowState({
      worldId: selectedSource.id,
      state,
      currentStep: activeStep,
    })
    if (result.error) return result.error
    setMessage('已自动保存当前草稿')
    return null
  }

  function submit() {
    if (!state || !selectedSource) return
    startTransition(async () => {
      const result = await submitWorldflowStep({ worldId: selectedSource.id, state, step: activeStep })
      if (result.state) setState(result.state)
      setMessage(result.error ?? '已提交 architect 审核'); if (!result.error) router.refresh()
    })
  }

  function review(decision: 'approve' | 'changes') {
    if (!state || !selectedSource) return
    startTransition(async () => {
      const result = await reviewWorldflowStep({ worldId: selectedSource.id, state, step: activeStep, decision })
      if (result.state) setState(result.state)
      if (result.nextStep) setActiveStep(result.nextStep)
      setMessage(result.error ?? (decision === 'approve' ? '审核通过' : '已退回修改')); if (!result.error) router.refresh()
    })
  }

  if (!selectedSource || !state) return <main className={styles.page}>
    <header className={styles.overviewHeader}><div><span>WORLD PRODUCTION</span><h1>世界制作工作台</h1><p>每个人都可以从世界设定开始创建；architect 同时拥有创作和审核能力。</p></div><button className={styles.primary} onClick={() => setCreating(true)} type="button"><Plus size={18} />创建世界</button></header>
    <section className={styles.lifecycle}><div><strong>基础构建 · STEP 1–3</strong><span>世界设定、风格基准和镜头清单，通常一次确认。</span></div><ChevronRight /><div><strong>持续生产 · STEP 4–7</strong><span>逐镜头维护事件，长期添加图片和视频素材。</span></div></section>
    <section className={styles.worldList}>
      {worlds.map((world) => <button className={styles.worldCard} key={world.id} onClick={() => openWorld(world)} type="button"><span>STEP {world.current_step} · {STATUS[world.current_status]}</span><h2>{world.name}</h2><p>{world.description || '尚未填写世界简介。'}</p><footer><span>{world.owner_name}{world.owner_id === user.id ? ' · 我创建的' : ''}</span><span>{formatDate(world.updated_at)} <ChevronRight size={15} /></span></footer></button>)}
      {!worlds.length ? <div className={styles.emptyWorld}><Layers3 size={28} /><strong>还没有世界</strong><span>创建第一个世界，从 Step 1 开始完整跑通工作流。</span><button className={styles.primary} onClick={() => setCreating(true)} type="button"><Plus size={18} />创建世界</button></div> : null}
    </section>
    {creating ? <div className={styles.modalBackdrop}><form className={styles.modal} onSubmit={(event) => { event.preventDefault(); startTransition(async () => { const result = await createWorldflowWorld({ name: newName, description: newDescription }); if (result.id) window.location.href = `/worldflow?world=${result.id}`; else setMessage(result.error ?? '创建失败') }) }}><header><div><span>NEW WORLD</span><h2>创建一个世界</h2></div><button onClick={() => setCreating(false)} type="button">关闭</button></header><label>世界名称<input autoFocus maxLength={120} onChange={(event) => setNewName(event.target.value)} required value={newName} /></label><label>一句话描述<textarea maxLength={2000} onChange={(event) => setNewDescription(event.target.value)} value={newDescription} /></label>{message ? <p className={styles.error}>{message}</p> : null}<button className={styles.primary} disabled={pending} type="submit">{pending ? '创建中…' : '创建并进入 Step 1'}</button></form></div> : null}
  </main>

  const stepStatus = statusOf(state, activeStep)
  const editable = isOwner && activeStep <= selectedSource.current_step && stepStatus !== 'review' && stepStatus !== 'approved'

  function beginNewIteration() {
    updateState((current) => ({
      ...current,
      stepStatuses: { ...current.stepStatuses, [String(activeStep)]: 'draft' },
    }))
    setMessage('已开启新一轮迭代，请修改并保存')
  }

  function updateEventSystem(mutator: (slots: NonNullable<typeof eventSystem>['timeSlots']) => NonNullable<typeof eventSystem>['timeSlots']) {
    if (!activeShot || !eventSystem) return
    updateState((current) => ({ ...current, eventSystems: { ...current.eventSystems, [activeShot.id]: { version: eventSystem.version + 1, timeSlots: mutator(eventSystem.timeSlots) } } }))
  }

  function updateEventSubject(subjectId: string, patch: Partial<Pick<WorldflowEvent, 'description' | 'name'>>) {
    updateEventSystem((slots) => slots.map((slot) => ({
      ...slot,
      events: slot.events.map((event) => event.id === subjectId ? { ...event, ...patch } : {
        ...event,
        subEvents: event.subEvents.map((subEvent) => subEvent.id === subjectId ? { ...subEvent, ...patch } : subEvent),
      }),
    })))
  }

  return <main className={styles.page}>
    <header className={styles.workspaceHeader}><button className={styles.back} onClick={() => { setSelectedId(null); window.history.replaceState(null, '', '/worldflow') }} type="button"><ArrowLeft size={18} />所有世界</button><div><span>WORLD / {selectedSource.id.slice(0, 8).toUpperCase()}</span><h1>{selectedSource.name}</h1><p>创建者：{selectedSource.owner_name} · 当前账号：{user.name} / {user.role}</p></div><div className={styles.headerActions}><span className={styles.status} data-status={stepStatus}>{STATUS[stepStatus]}</span>{isOwner ? <button className={styles.secondary} disabled={pending} onClick={save} type="button"><Save size={16} />保存</button> : null}</div></header>

    <nav className={styles.stepNav} aria-label="世界制作步骤"><div><header>基础构建 <span>通常一次确认</span></header>{STEPS.slice(0, 3).map((step, index) => <button data-active={activeStep === index + 1} key={step[0]} onClick={() => setActiveStep(index + 1)} type="button"><span>0{index + 1}</span><strong>{step[0]}</strong><small>{STATUS[statusOf(state, index + 1)]}</small></button>)}</div><div><header>持续生产 <span>长期更新素材</span></header>{STEPS.slice(3).map((step, index) => <button data-active={activeStep === index + 4} key={step[0]} onClick={() => setActiveStep(index + 4)} type="button"><span>0{index + 4}</span><strong>{step[0]}</strong><small>{STATUS[statusOf(state, index + 4)]}</small></button>)}</div></nav>

    <section className={styles.permission}><div>{isArchitect ? <ShieldCheck size={19} /> : <UserRound size={19} />}<p><strong>{isOwner ? '你是这个世界的创建者' : isArchitect ? 'Architect 审核视角' : '协作查看'}</strong><span>{isOwner ? '可编辑、上传本地素材并提交审核。' : isArchitect ? '可查看全部内容并处理待审核步骤；你仍然可以创建自己的世界。' : '可以浏览，但只有创建者能修改。'}</span></p></div><button className={styles.secondary} onClick={() => { setSelectedId(null); setCreating(true); window.history.replaceState(null, '', '/worldflow') }} type="button"><Plus size={16} />创建我的世界</button></section>

    <div className={styles.stepTitle}><span>0{activeStep}</span><div><small>{STEPS[activeStep - 1][2] === 'foundation' ? 'FOUNDATION · LOW FREQUENCY' : 'ONGOING · CONTINUOUS'}</small><h2>{STEPS[activeStep - 1][0]}</h2><p>{STEPS[activeStep - 1][1]}</p></div></div>

    {activeStep >= 5 ? <section className={styles.shotSelector}><header><div><span>SHOT SYSTEMS</span><h3>选择镜头</h3></div>{editable ? <button className={styles.secondary} onClick={() => updateState((current) => { const id = crypto.randomUUID(); setActiveShotId(id); return { ...current, shots: [...current.shots, { id, name: `镜头 ${String.fromCharCode(65 + current.shots.length)}`, description: '' }], eventSystems: { ...current.eventSystems, [id]: { version: 1, timeSlots: [] } } } })} type="button"><Plus size={16} />添加镜头</button> : null}</header><div>{state.shots.map((shot) => <button data-active={activeShot?.id === shot.id} key={shot.id} onClick={() => { setActiveShotId(shot.id); setSelectedEventId(null) }} type="button"><strong>{shot.name}</strong><span>{state.eventSystems[shot.id]?.timeSlots.length ?? 0} 个时段 · V{state.eventSystems[shot.id]?.version ?? 1}</span></button>)}</div></section> : null}

    <section className={styles.editor}>
      {activeStep === 1 ? <div className={styles.fields}><label>世界设定<textarea disabled={!editable} onChange={(event) => updateState((current) => ({ ...current, worldBible: event.target.value }))} value={state.worldBible} /></label><label>世界运行规律<textarea disabled={!editable} onChange={(event) => updateState((current) => ({ ...current, worldRules: event.target.value }))} value={state.worldRules} /></label><label>核心冲突<textarea disabled={!editable} onChange={(event) => updateState((current) => ({ ...current, coreConflict: event.target.value }))} value={state.coreConflict} /></label><MaterialUploader beforeUpload={saveBeforeMaterialUpload} assets={assetsForScope(1)} canUpload={editable} onUploaded={(asset) => setAssets((items) => [asset, ...items])} step={1} title="世界参考素材" worldId={selectedSource.id} /></div> : null}
      {activeStep === 2 ? <div className={styles.fields}><label>风格方向说明<textarea disabled={!editable} onChange={(event) => updateState((current) => ({ ...current, visualDirection: event.target.value }))} value={state.visualDirection} /></label><MaterialUploader beforeUpload={saveBeforeMaterialUpload} assets={assetsForScope(2)} canUpload={editable} onUploaded={(asset) => setAssets((items) => [asset, ...items])} step={2} title="风格基准候选" worldId={selectedSource.id} /></div> : null}
      {activeStep === 3 ? <div><div className={styles.recordList}>{state.shots.map((shot) => <article className={styles.assetRecord} key={shot.id}><div className={styles.recordFields}><ImageIcon size={18} /><input disabled={!editable} onChange={(event) => updateState((current) => ({ ...current, shots: current.shots.map((item) => item.id === shot.id ? { ...item, name: event.target.value } : item) }))} value={shot.name} /><textarea disabled={!editable} onChange={(event) => updateState((current) => ({ ...current, shots: current.shots.map((item) => item.id === shot.id ? { ...item, description: event.target.value } : item) }))} value={shot.description} />{editable && state.shots.length > 1 ? <button aria-label="删除镜头" onClick={() => updateState((current) => ({ ...current, shots: current.shots.filter((item) => item.id !== shot.id) }))} type="button"><Trash2 size={16} /></button> : null}</div><MaterialUploader beforeUpload={saveBeforeMaterialUpload} assets={assetsForScope(3, { shotId: shot.id })} canUpload={editable} mediaKind="mixed" onUploaded={(asset) => setAssets((items) => [asset, ...items])} shotId={shot.id} step={3} title={`${shot.name || '未命名镜头'}的起始图片`} worldId={selectedSource.id} /></article>)}</div>{editable ? <button className={styles.dashed} onClick={() => updateState((current) => { const id = crypto.randomUUID(); return { ...current, shots: [...current.shots, { id, name: `镜头 ${String.fromCharCode(65 + current.shots.length)}`, description: '' }], eventSystems: { ...current.eventSystems, [id]: { version: 1, timeSlots: [] } } } })} type="button"><Plus size={18} />添加镜头</button> : null}</div> : null}
      {activeStep === 4 ? <div><div className={styles.optional}><SkipForward size={18} /><p><strong>角色是可选内容</strong><span>可以添加多个角色；一旦添加，每个角色都需要描述和至少一张形象图片。</span></p>{editable ? <button className={styles.secondary} onClick={() => updateState((current) => ({ ...current, stepStatuses: { ...current.stepStatuses, '4': statusOf(current, 4) === 'skipped' ? 'optional' : 'skipped' } }))} type="button">{stepStatus === 'skipped' ? '恢复角色设定' : '跳过角色设定'}</button> : null}</div>{stepStatus !== 'skipped' ? <><div className={styles.recordList}>{state.characters.map((character) => <article className={styles.assetRecord} key={character.id}><div className={styles.characterHeader}><UserRound size={18} /><strong>{character.name || '未命名角色'}</strong>{editable ? <button aria-label={`删除角色 ${character.name || '未命名角色'}`} onClick={() => updateState((current) => ({ ...current, characters: current.characters.filter((item) => item.id !== character.id) }))} type="button"><Trash2 size={16} /></button> : null}</div><div className={styles.characterFields}><label>角色名称<input disabled={!editable} onChange={(event) => updateState((current) => ({ ...current, characters: current.characters.map((item) => item.id === character.id ? { ...item, name: event.target.value } : item) }))} placeholder="角色名称" value={character.name} /></label><label>角色描述<textarea disabled={!editable} onChange={(event) => updateState((current) => ({ ...current, characters: current.characters.map((item) => item.id === character.id ? { ...item, description: event.target.value } : item) }))} placeholder="外观、性格、身份与显著特征" value={character.description} /></label><label>出现环境<textarea disabled={!editable} onChange={(event) => updateState((current) => ({ ...current, characters: current.characters.map((item) => item.id === character.id ? { ...item, environment: event.target.value } : item) }))} placeholder="角色通常出现在哪里" value={character.environment} /></label><label>行为动机<textarea disabled={!editable} onChange={(event) => updateState((current) => ({ ...current, characters: current.characters.map((item) => item.id === character.id ? { ...item, motivation: event.target.value } : item) }))} placeholder="角色为什么采取这些行动" value={character.motivation} /></label></div><MaterialUploader beforeUpload={saveBeforeMaterialUpload} assets={assetsForScope(4, { characterId: character.id })} canUpload={editable} characterId={character.id} mediaKind="image" onUploaded={(asset) => setAssets((items) => [asset, ...items])} step={4} title={`${character.name || '未命名角色'}的形象图片`} worldId={selectedSource.id} /></article>)}</div>{editable ? <button className={styles.dashed} onClick={() => updateState((current) => ({ ...current, characters: [...current.characters, { id: crypto.randomUUID(), name: '', description: '', environment: '', motivation: '' }] }))} type="button"><Plus size={18} />添加角色</button> : null}</> : null}</div> : null}
      {activeStep === 5 && activeShot && eventSystem ? <div><div aria-label="时段列表，可左右滑动浏览" className={styles.eventBoard}>{eventSystem.timeSlots.map((slot) => <article className={styles.timeLane} key={slot.id}><header><Clock3 size={16} /><input disabled={!editable} onChange={(event) => updateEventSystem((slots) => slots.map((item) => item.id === slot.id ? { ...item, name: event.target.value } : item))} value={slot.name} />{editable ? <button aria-label="删除时段" onClick={() => updateEventSystem((slots) => slots.filter((item) => item.id !== slot.id))} type="button"><Trash2 size={15} /></button> : null}</header>{slot.events.map((event) => <div className={styles.eventGroup} key={event.id}><div className={styles.eventRow}><button data-active={selectedEventId === event.id} onClick={() => setSelectedEventId(event.id)} type="button"><strong>{event.name}</strong><span>{event.description || '尚未填写事件说明'} · {event.subEvents.length} 个子事件</span></button>{editable ? <button aria-label={`删除事件 ${event.name}`} onClick={() => { updateEventSystem((slots) => slots.map((item) => item.id === slot.id ? { ...item, events: item.events.filter((itemEvent) => itemEvent.id !== event.id) } : item)); if (selectedEventId === event.id || event.subEvents.some((subEvent) => subEvent.id === selectedEventId)) setSelectedEventId(null) }} type="button"><Trash2 size={15} /></button> : null}</div>{event.subEvents.length ? <div className={styles.subEventList}>{event.subEvents.map((subEvent) => <div className={styles.subEventRow} key={subEvent.id}><button data-active={selectedEventId === subEvent.id} onClick={() => setSelectedEventId(subEvent.id)} type="button"><span>子事件</span><strong>{subEvent.name}</strong></button>{editable ? <button aria-label={`删除子事件 ${subEvent.name}`} onClick={() => { updateEventSystem((slots) => slots.map((item) => ({ ...item, events: item.events.map((parent) => parent.id === event.id ? { ...parent, subEvents: parent.subEvents.filter((itemSubEvent) => itemSubEvent.id !== subEvent.id) } : parent) }))); if (selectedEventId === subEvent.id) setSelectedEventId(null) }} type="button"><Trash2 size={14} /></button> : null}</div>)}</div> : null}</div>)}{editable ? <button className={styles.addEvent} onClick={() => updateEventSystem((slots) => slots.map((item) => item.id === slot.id ? { ...item, events: [...item.events, { id: crypto.randomUUID(), name: '新事件', description: '', subEvents: [] }] } : item))} type="button"><Plus size={15} />添加父事件</button> : null}</article>)}</div>{editable ? <button className={styles.dashed} onClick={() => updateEventSystem((slots) => [...slots, { id: crypto.randomUUID(), name: '新时段', events: [] }])} type="button"><Plus size={18} />添加时段</button> : null}{selectedEvent && selectedParentEvent ? <div className={styles.eventDetail}><div className={styles.eventType}><span>{eventSelection?.isSubEvent ? '子事件' : '父事件'}</span><strong>{eventSelection?.isSubEvent ? `继承自：${selectedParentEvent.name}` : `${selectedParentEvent.subEvents.length} 个子事件`}</strong></div><label>{eventSelection?.isSubEvent ? '子事件名称' : '父事件名称'}<input disabled={!editable} onChange={(change) => updateEventSubject(selectedEvent.id, { name: change.target.value })} value={selectedEvent.name} /></label><label>{eventSelection?.isSubEvent ? '子事件说明' : '父事件说明'}<textarea disabled={!editable} onChange={(change) => updateEventSubject(selectedEvent.id, { description: change.target.value })} value={selectedEvent.description} /></label>{editable && !eventSelection?.isSubEvent ? <button className={styles.dashed} onClick={() => { const id = crypto.randomUUID(); updateEventSystem((slots) => slots.map((slot) => ({ ...slot, events: slot.events.map((event) => event.id === selectedParentEvent.id ? { ...event, subEvents: [...event.subEvents, { id, name: '新子事件', description: '' }] } : event) }))); setSelectedEventId(id) }} type="button"><Plus size={16} />在“{selectedParentEvent.name}”内添加子事件</button> : null}<MaterialUploader beforeUpload={saveBeforeMaterialUpload} assets={assetsForScope(5, { eventId: selectedEvent.id, shotId: activeShot.id })} canUpload={editable} eventId={selectedEvent.id} onUploaded={(asset) => setAssets((items) => [asset, ...items])} shotId={activeShot.id} step={5} title={eventSelection?.isSubEvent ? '子事件参考素材' : '父事件参考素材'} worldId={selectedSource.id} /></div> : null}</div> : null}
      {(activeStep === 6 || activeStep === 7) && activeShot && eventSystem ? <div><div className={styles.subjectTable}><div className={styles.subjectTableIntro}><strong>选择素材单元</strong><span>父事件与子事件都会继承到这张表中；点击单元后查看完整生成背景。</span></div><div className={styles.subjectColumns}>{eventSystem.timeSlots.map((slot) => <section className={styles.subjectColumn} key={slot.id}><header><Clock3 size={15} /><strong>{slot.name}</strong></header>{slot.events.map((event) => <div className={styles.subjectGroup} key={event.id}><button data-active={selectedEventId === event.id} onClick={() => setSelectedEventId(event.id)} type="button"><small>父事件</small><strong>{event.name}</strong></button>{event.subEvents.map((subEvent) => <button data-active={selectedEventId === subEvent.id} key={subEvent.id} onClick={() => setSelectedEventId(subEvent.id)} type="button"><small>↳ 子事件</small><strong>{subEvent.name}</strong></button>)}</div>)}</section>)}</div></div>{selectedEvent && selectedParentEvent ? <><section className={styles.context}><header><Layers3 size={19} /><div><strong>本次素材会引入的生成背景</strong><span>这些信息会累积为当前单元的生成上下文。</span></div></header><div className={styles.contextLayers}><article><small>01 · 世界基础</small><strong>{selectedSource.name}</strong><p>{state.worldBible || '未填写世界设定'}</p><p>{state.worldRules || '未填写世界规律'}</p></article><article><small>02 · 视觉基准</small><strong>风格方向</strong><p>{state.visualDirection || '未填写风格方向'}</p><ContextAssetRefs assets={assetsForScope(2)} label="风格基准图片" /></article><article><small>03 · 镜头与时间</small><strong>{activeShot.name} · {selectedTimeSlot?.name || '未命名时段'}</strong><p>{activeShot.description || '未填写镜头说明'}</p><ContextAssetRefs assets={assetsForScope(3, { shotId: activeShot.id })} label={`${activeShot.name}的起始图片`} /></article>{state.characters.length ? <article><small>04 · 角色信息</small><strong>{state.characters.map((character) => character.name || '未命名角色').join('、')}</strong><p>{state.characters.map((character) => `${character.name || '角色'}：${character.description || '未填写角色描述'}；动机：${character.motivation || '未填写动机'}`).join('；')}</p><ContextAssetRefs assets={state.characters.flatMap((character) => assetsForScope(4, { characterId: character.id }))} label="角色形象图片" /></article> : null}<article><small>{state.characters.length ? '05' : '04'} · 父事件</small><strong>{selectedParentEvent.name}</strong><p>{selectedParentEvent.description || '未填写父事件说明'}</p></article>{eventSelection?.isSubEvent ? <article><small>{state.characters.length ? '06' : '05'} · 子事件主体</small><strong>{selectedEvent.name}</strong><p>{selectedEvent.description || '未填写子事件说明'}</p></article> : null}</div></section><MaterialUploader beforeUpload={saveBeforeMaterialUpload} assets={assetsForScope(activeStep, { eventId: selectedEvent.id, shotId: activeShot.id })} canUpload={editable} eventId={selectedEvent.id} mediaKind={activeStep === 6 ? 'image' : 'video'} onUploaded={(asset) => setAssets((items) => [asset, ...items])} shotId={activeShot.id} step={activeStep} title={activeStep === 6 ? `${eventSelection?.isSubEvent ? '子事件' : '父事件'}图片版本` : `${eventSelection?.isSubEvent ? '子事件' : '父事件'}视频版本`} worldId={selectedSource.id} /></> : <div className={styles.noSelection}><LockKeyhole size={22} /><strong>请选择一个父事件或子事件</strong><span>素材会绑定到当前镜头和事件主体，不会混入其他镜头。</span></div>}</div> : null}
    </section>

    <footer className={styles.actionBar}><span>{message || (editable ? '修改后请保存；准备好后提交审核。' : '当前内容为只读。')}</span><div>{isOwner && stepStatus === 'approved' && activeStep >= 5 ? <button className={styles.secondary} onClick={beginNewIteration} type="button">开启新一轮迭代</button> : null}{isOwner && editable ? <><button className={styles.secondary} disabled={pending} onClick={save} type="button"><Save size={16} />保存草稿</button><button className={styles.primary} disabled={pending} onClick={submit} type="button"><Upload size={16} />提交审核</button></> : null}{isArchitect && stepStatus === 'review' ? <><button className={styles.secondary} disabled={pending} onClick={() => review('changes')} type="button">退回修改</button><button className={styles.primary} disabled={pending} onClick={() => review('approve')} type="button"><Check size={16} />审核通过</button></> : null}</div></footer>
  </main>
}
