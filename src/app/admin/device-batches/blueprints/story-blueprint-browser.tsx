'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarClock,
  Check,
  CircleAlert,
  FileCheck2,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  Send,
  Sparkles,
} from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveTabs } from '@/components/archive-tabs'
import {
  createStoryWorkflow,
  publishStoryContentNow,
  reviewStoryAdaptation,
  reviewStoryContentItem,
  saveStoryAdaptation,
  saveStoryContentItem,
  saveStorySource,
} from '@/lib/actions/story-workflows'
import {
  STORY_CONTENT_LABELS,
  STORY_REVIEW_LABELS,
  canPublishContent,
  toStoryWorkspaceSlug,
  type StoryAdaptation,
  type StoryContentDraft,
  type StoryWorkflow,
  type StoryWorkflowDraft,
} from '@/lib/story-workflows'
import styles from './story-blueprints.module.css'

type SourceDraft = Pick<StoryWorkflow, 'batchName' | 'location' | 'sourceStory'>
type WorkspaceStage = 'adaptation' | 'content'

const EMPTY_WORKSPACE: StoryWorkflowDraft = {
  workspaceSlug: '',
  batchName: '',
  location: '',
  sourceStory: '',
}

function splitLines(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean)
}

function joinLines(value: string[]) {
  return value.join('\n')
}

function toLocalDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toContentDraft(item: StoryWorkflow['contentItems'][number]): StoryContentDraft {
  return {
    position: item.position,
    title: item.title,
    channel: item.channel,
    contentType: item.contentType,
    body: item.body,
    narrativePurpose: item.narrativePurpose,
    facts: item.facts,
    requiredAssets: item.requiredAssets,
    recommendedPublishAt: item.recommendedPublishAt,
    timingRationale: item.timingRationale,
    dependencies: item.dependencies,
    followUp: item.followUp,
  }
}

function StoryStatus({ status, label }: { status: string; label: string }) {
  return <span className={styles.statusPill} data-status={status}>{label}</span>
}

export function StoryBlueprintBrowser({
  workflows,
  setupError,
  setupRequired,
}: {
  workflows: StoryWorkflow[]
  setupError: string | null
  setupRequired: boolean
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(workflows[0]?.id ?? '')
  const [activeStage, setActiveStage] = useState<WorkspaceStage>('adaptation')
  const [showCreate, setShowCreate] = useState(workflows.length === 0)
  const [newWorkspace, setNewWorkspace] = useState(EMPTY_WORKSPACE)
  const [newSlugTouched, setNewSlugTouched] = useState(false)
  const [sourceDrafts, setSourceDrafts] = useState<Record<string, SourceDraft>>({})
  const [adaptationDrafts, setAdaptationDrafts] = useState<Record<string, StoryAdaptation>>({})
  const [adaptationNotes, setAdaptationNotes] = useState<Record<string, string>>({})
  const [contentDrafts, setContentDrafts] = useState<Record<string, StoryContentDraft>>({})
  const [contentNotes, setContentNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  const workflow = workflows.find((item) => item.id === selectedId) ?? workflows[0]
  const sourceDraft = workflow
    ? sourceDrafts[workflow.id] ?? {
        batchName: workflow.batchName,
        location: workflow.location,
        sourceStory: workflow.sourceStory,
      }
    : null
  const adaptationDraft = workflow?.adaptation
    ? adaptationDrafts[workflow.id] ?? workflow.adaptation
    : null
  const reviewNote = workflow
    ? adaptationNotes[workflow.id] ?? workflow.reviewNote
    : ''
  const sourceDirty = Boolean(workflow && sourceDraft && (
    sourceDraft.batchName !== workflow.batchName
    || sourceDraft.location !== workflow.location
    || sourceDraft.sourceStory !== workflow.sourceStory
  ))
  const adaptationDirty = Boolean(workflow && adaptationDraft && (
    JSON.stringify(adaptationDraft) !== JSON.stringify(workflow.adaptation)
    || reviewNote !== workflow.reviewNote
  ))

  function report(error: string | null, success: string) {
    setBusy('')
    if (error) {
      setMessage(error)
      return false
    }
    setMessage(success)
    router.refresh()
    return true
  }

  async function createWorkspace() {
    setBusy('create')
    setMessage('')
    const result = await createStoryWorkflow(newWorkspace)
    if (report(result.error, 'Story workspace created.')) {
      if (result.workflowId) setSelectedId(result.workflowId)
      setNewWorkspace(EMPTY_WORKSPACE)
      setNewSlugTouched(false)
      setShowCreate(false)
    }
  }

  async function persistSource() {
    if (!workflow || !sourceDraft) return false
    setBusy('source-save')
    setMessage('')
    const result = await saveStorySource({
      workflowId: workflow.id,
      ...sourceDraft,
      expectedVersion: workflow.version,
    })
    const ok = report(result.error, 'Source story saved.')
    if (ok) {
      setSourceDrafts((current) => {
        const next = { ...current }
        delete next[workflow.id]
        return next
      })
    }
    return ok
  }

  async function generateAdaptation() {
    if (!workflow) return
    if (sourceDirty) {
      const saved = await persistSource()
      if (!saved) return
    }
    setBusy('adaptation-generate')
    setMessage('Codex is creating an English structural draft. This can take several minutes.')
    try {
      const response = await fetch('/api/admin/device-batch-blueprints/iterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: workflow.id }),
      })
      const result = await response.json() as { error?: string; message?: string }
      report(response.ok ? null : result.error ?? 'Adaptation failed.', result.message ?? 'Adaptation created.')
    } catch (error) {
      report(error instanceof Error ? error.message : 'Adaptation failed.', '')
    }
  }

  async function persistAdaptation() {
    if (!workflow || !adaptationDraft) return
    setBusy('adaptation-save')
    setMessage('')
    const result = await saveStoryAdaptation({
      workflowId: workflow.id,
      adaptation: adaptationDraft,
      reviewNote,
      expectedVersion: workflow.version,
    })
    if (report(result.error, 'Adaptation draft saved. Downstream drafts require re-review.')) {
      setAdaptationDrafts((current) => {
        const next = { ...current }
        delete next[workflow.id]
        return next
      })
    }
  }

  async function reviewAdaptation(action: 'submit' | 'request_changes' | 'approve') {
    if (!workflow) return
    setBusy(`adaptation-${action}`)
    setMessage('')
    const result = await reviewStoryAdaptation({
      workflowId: workflow.id,
      action,
      reviewNote,
      expectedVersion: workflow.version,
    })
    report(result.error, action === 'approve'
      ? 'Review Gate 1 approved. Stage 2 is now available.'
      : action === 'submit'
        ? 'Adaptation submitted for review.'
        : 'Changes requested for the adaptation.')
  }

  async function generateContentPlan() {
    if (!workflow) return
    const replaceExisting = workflow.contentItems.length > 0
    if (
      replaceExisting
      && !window.confirm('Replace every unapproved content draft with a newly generated plan?')
    ) return

    setBusy('content-generate')
    setMessage('Codex is turning the approved structure into English content drafts and timing recommendations.')
    try {
      const response = await fetch('/api/admin/device-batch-blueprints/content-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: workflow.id, replaceExisting }),
      })
      const result = await response.json() as { error?: string; message?: string }
      report(response.ok ? null : result.error ?? 'Content planning failed.', result.message ?? 'Content plan created.')
    } catch (error) {
      report(error instanceof Error ? error.message : 'Content planning failed.', '')
    }
  }

  async function persistContentItem(item: StoryWorkflow['contentItems'][number]) {
    const draft = contentDrafts[item.id] ?? toContentDraft(item)
    setBusy(`content-save-${item.id}`)
    setMessage('')
    const result = await saveStoryContentItem({
      itemId: item.id,
      draft,
      reviewNote: contentNotes[item.id] ?? item.reviewNote,
      expectedVersion: item.version,
    })
    if (report(result.error, `Content ${item.position} saved as a draft.`)) {
      setContentDrafts((current) => {
        const next = { ...current }
        delete next[item.id]
        return next
      })
    }
  }

  async function reviewContentItem(
    item: StoryWorkflow['contentItems'][number],
    action: 'submit' | 'request_changes' | 'approve',
  ) {
    setBusy(`content-${action}-${item.id}`)
    setMessage('')
    const result = await reviewStoryContentItem({
      itemId: item.id,
      action,
      reviewNote: contentNotes[item.id] ?? item.reviewNote,
      expectedVersion: item.version,
    })
    report(result.error, action === 'approve'
      ? `Content ${item.position} approved.`
      : action === 'submit'
        ? `Content ${item.position} submitted for review.`
        : `Changes requested for content ${item.position}.`)
  }

  async function publishNow(item: StoryWorkflow['contentItems'][number]) {
    if (!window.confirm(`Have you published “${item.title}” in the Batch editor or its intended channel? This records the publication and locks the copy. It does not update the public Device page.`)) return
    setBusy(`content-publish-${item.id}`)
    setMessage('')
    const result = await publishStoryContentNow({ itemId: item.id, expectedVersion: item.version })
    report(result.error, `Publication recorded for content ${item.position}.`)
  }

  function updateSource(patch: Partial<SourceDraft>) {
    if (!workflow || !sourceDraft) return
    setSourceDrafts((current) => ({
      ...current,
      [workflow.id]: { ...sourceDraft, ...patch },
    }))
    setMessage('')
  }

  function updateAdaptation(next: StoryAdaptation) {
    if (!workflow) return
    setAdaptationDrafts((current) => ({ ...current, [workflow.id]: next }))
    setMessage('')
  }

  function updateContent(itemId: string, next: StoryContentDraft) {
    setContentDrafts((current) => ({ ...current, [itemId]: next }))
    setMessage('')
  }

  if (setupRequired) {
    return (
      <section className={styles.setupNotice}>
        <CircleAlert aria-hidden size={22} />
        <div>
          <h2>Story Lab database setup required</h2>
          <p>Apply <code>supabase/schema_v63.sql</code> before creating the first story workspace.</p>
          {setupError ? <small>{setupError}</small> : null}
        </div>
      </section>
    )
  }

  return (
    <div className={styles.workspace}>
      <section className={styles.workspaceBar}>
        {workflows.length > 0 ? (
          <ArchiveField htmlFor="story-workspace" label="STORY WORKSPACE">
            <select
              id="story-workspace"
              onChange={(event) => {
                setSelectedId(event.target.value)
                setActiveStage('adaptation')
                setShowCreate(false)
                setMessage('')
              }}
              value={workflow?.id ?? ''}
            >
              {workflows.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.batchName} · {STORY_REVIEW_LABELS[item.adaptationStatus]}
                </option>
              ))}
            </select>
          </ArchiveField>
        ) : <p>No story workspace exists yet.</p>}
        <ArchiveButton onClick={() => setShowCreate((current) => !current)} variant="secondary">
          <Plus aria-hidden size={15} /> NEW STORY
        </ArchiveButton>
      </section>

      {showCreate ? (
        <section className={styles.createPanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionLabel}>New author-controlled source</span>
              <h2>Create a story workspace</h2>
            </div>
            <p>Create the private workspace first. AI adaptation begins only when you explicitly request it.</p>
          </div>
          <div className={styles.twoColumnGrid}>
            <ArchiveField htmlFor="new-story-name" label="BATCH / STORY NAME">
              <input
                id="new-story-name"
                onChange={(event) => setNewWorkspace((current) => ({
                  ...current,
                  batchName: event.target.value,
                  workspaceSlug: newSlugTouched
                    ? current.workspaceSlug
                    : toStoryWorkspaceSlug(event.target.value),
                }))}
                value={newWorkspace.batchName}
              />
            </ArchiveField>
            <ArchiveField htmlFor="new-story-location" label="LOCATION">
              <input
                id="new-story-location"
                onChange={(event) => setNewWorkspace((current) => ({ ...current, location: event.target.value }))}
                value={newWorkspace.location}
              />
            </ArchiveField>
          </div>
          <ArchiveField htmlFor="new-story-slug" label="WORKSPACE SLUG">
            <input
              id="new-story-slug"
              onChange={(event) => {
                setNewSlugTouched(true)
                setNewWorkspace((current) => ({
                  ...current,
                  workspaceSlug: toStoryWorkspaceSlug(event.target.value),
                }))
              }}
              value={newWorkspace.workspaceSlug}
            />
          </ArchiveField>
          <ArchiveField htmlFor="new-source-story" label="COMPLETE SOURCE STORY">
            <textarea
              id="new-source-story"
              maxLength={20_000}
              onChange={(event) => setNewWorkspace((current) => ({ ...current, sourceStory: event.target.value }))}
              rows={14}
              value={newWorkspace.sourceStory}
            />
          </ArchiveField>
          <div className={styles.actionRow}>
            <span>{newWorkspace.sourceStory.length.toLocaleString()} / 20,000</span>
            <ArchiveButton
              disabled={busy === 'create' || newWorkspace.sourceStory.trim().length < 20}
              onClick={() => void createWorkspace()}
            >
              <Plus aria-hidden size={15} /> {busy === 'create' ? 'CREATING…' : 'CREATE PRIVATE WORKSPACE'}
            </ArchiveButton>
          </div>
        </section>
      ) : null}

      {workflow && sourceDraft ? (
        <>
          <section className={styles.workflowSummary}>
            <div>
              <span>STORY</span>
              <strong>{workflow.batchName}</strong>
              <small>{workflow.location || 'Location pending'}</small>
            </div>
            <div>
              <span>REVIEW GATE 1</span>
              <StoryStatus
                label={STORY_REVIEW_LABELS[workflow.adaptationStatus]}
                status={workflow.adaptationStatus}
              />
            </div>
            <div>
              <span>REVIEW GATE 2</span>
              <strong>{workflow.contentItems.filter((item) => ['approved', 'scheduled', 'published'].includes(item.status)).length} / {workflow.contentItems.length} CLEARED</strong>
            </div>
          </section>

          <ArchiveTabs
            activeId={activeStage}
            ariaLabel="Story review stages"
            items={[
              { id: 'adaptation', label: '1 · STRUCTURE REVIEW' },
              { id: 'content', label: '2 · CONTENT & SCHEDULE', count: workflow.contentItems.length },
            ]}
            onChange={(id) => setActiveStage(id as WorkspaceStage)}
          />

          {message ? <div className={styles.message} role="status">{message}</div> : null}

          {activeStage === 'adaptation' ? (
            <div className={styles.stageStack}>
              <section className={styles.panel}>
                <div className={styles.sectionHeading}>
                  <div>
                    <span className={styles.sectionLabel}>Author-controlled input</span>
                    <h2>Source story</h2>
                  </div>
                  <p>Changing the source invalidates every unreviewed downstream item. Published records remain immutable.</p>
                </div>
                <div className={styles.twoColumnGrid}>
                  <ArchiveField htmlFor="source-batch-name" label="BATCH / STORY NAME">
                    <input
                      id="source-batch-name"
                      onChange={(event) => updateSource({ batchName: event.target.value })}
                      value={sourceDraft.batchName}
                    />
                  </ArchiveField>
                  <ArchiveField htmlFor="source-location" label="LOCATION">
                    <input
                      id="source-location"
                      onChange={(event) => updateSource({ location: event.target.value })}
                      value={sourceDraft.location}
                    />
                  </ArchiveField>
                </div>
                <ArchiveField htmlFor="source-story" label="COMPLETE SOURCE STORY">
                  <textarea
                    id="source-story"
                    maxLength={20_000}
                    onChange={(event) => updateSource({ sourceStory: event.target.value })}
                    rows={16}
                    value={sourceDraft.sourceStory}
                  />
                </ArchiveField>
                <div className={styles.actionRow}>
                  <span>Source v{workflow.sourceVersion} · {sourceDraft.sourceStory.length.toLocaleString()} / 20,000</span>
                  <div>
                    <ArchiveButton
                      disabled={!sourceDirty || Boolean(busy)}
                      onClick={() => void persistSource()}
                      variant="secondary"
                    >
                      <Save aria-hidden size={15} /> SAVE SOURCE
                    </ArchiveButton>
                    <ArchiveButton
                      disabled={Boolean(busy) || sourceDraft.sourceStory.trim().length < 20}
                      onClick={() => void generateAdaptation()}
                    >
                      <Sparkles aria-hidden size={15} />
                      {busy === 'adaptation-generate' ? 'ADAPTING…' : 'GENERATE ENGLISH ADAPTATION'}
                    </ArchiveButton>
                  </div>
                </div>
              </section>

              {adaptationDraft ? (
                <AdaptationEditor
                  adaptation={adaptationDraft}
                  busy={busy}
                  dirty={adaptationDirty}
                  onChange={updateAdaptation}
                  onReview={(action) => void reviewAdaptation(action)}
                  onSave={() => void persistAdaptation()}
                  reviewNote={reviewNote}
                  setReviewNote={(value) => setAdaptationNotes((current) => ({ ...current, [workflow.id]: value }))}
                  status={workflow.adaptationStatus}
                />
              ) : (
                <section className={styles.emptyPanel}>
                  <PencilLine aria-hidden size={22} />
                  <div>
                    <h2>No structural adaptation yet</h2>
                    <p>Generate the first English draft from the source story, then edit and submit it to Review Gate 1.</p>
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className={styles.stageStack}>
              {workflow.adaptationStatus !== 'approved' ? (
                <section className={styles.lockedPanel}>
                  <FileCheck2 aria-hidden size={22} />
                  <div>
                    <h2>Review Gate 1 is not approved</h2>
                    <p>Individual content and timing recommendations stay locked until the structural adaptation is approved.</p>
                  </div>
                </section>
              ) : (
                <>
                  <section className={styles.contentPlanHeader}>
                    <div>
                      <span className={styles.sectionLabel}>Approved source revision {workflow.adaptationApprovedRevision}</span>
                      <h2>Individual content review</h2>
                      <p>Dates are planning notes only. Review and approve each item, publish it manually in its intended channel, then record the release here.</p>
                    </div>
                    <ArchiveButton
                      disabled={Boolean(busy) || workflow.contentItems.some((item) => ['approved', 'scheduled', 'published'].includes(item.status))}
                      onClick={() => void generateContentPlan()}
                    >
                      <RefreshCw aria-hidden size={15} />
                      {busy === 'content-generate'
                        ? 'PLANNING…'
                        : workflow.contentItems.length > 0
                          ? 'REGENERATE UNAPPROVED PLAN'
                          : 'GENERATE CONTENT PLAN'}
                    </ArchiveButton>
                  </section>

                  {workflow.contentItems.length === 0 ? (
                    <section className={styles.emptyPanel}>
                      <CalendarClock aria-hidden size={22} />
                      <div>
                        <h2>No content drafts yet</h2>
                        <p>Generate the plan from the approved adaptation. Nothing will be scheduled or published automatically.</p>
                      </div>
                    </section>
                  ) : (
                    <div className={styles.contentList}>
                      {workflow.contentItems.map((item) => {
                        const draft = contentDrafts[item.id] ?? toContentDraft(item)
                        const note = contentNotes[item.id] ?? item.reviewNote
                        const dirty = JSON.stringify(draft) !== JSON.stringify(toContentDraft(item)) || note !== item.reviewNote
                        const immutable = item.status === 'published'
                        return (
                          <ContentEditor
                            busy={busy}
                            dirty={dirty}
                            draft={draft}
                            immutable={immutable}
                            item={item}
                            key={item.id}
                            note={note}
                            onChange={(next) => updateContent(item.id, next)}
                            onNoteChange={(value) => setContentNotes((current) => ({ ...current, [item.id]: value }))}
                            onPublish={() => void publishNow(item)}
                            onReview={(action) => void reviewContentItem(item, action)}
                            onSave={() => void persistContentItem(item)}
                            workflow={workflow}
                          />
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      ) : null}

      {!setupRequired && setupError ? (
        <div className={styles.message} data-tone="error">{setupError}</div>
      ) : null}
    </div>
  )
}

function AdaptationEditor({
  adaptation,
  busy,
  dirty,
  onChange,
  onReview,
  onSave,
  reviewNote,
  setReviewNote,
  status,
}: {
  adaptation: StoryAdaptation
  busy: string
  dirty: boolean
  onChange: (adaptation: StoryAdaptation) => void
  onReview: (action: 'submit' | 'request_changes' | 'approve') => void
  onSave: () => void
  reviewNote: string
  setReviewNote: (value: string) => void
  status: StoryWorkflow['adaptationStatus']
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.reviewHeader}>
        <div>
          <span className={styles.sectionLabel}>Review Gate 1</span>
          <h2>English structural adaptation</h2>
        </div>
        <StoryStatus label={STORY_REVIEW_LABELS[status]} status={status} />
      </div>

      <div className={styles.coreEditorGrid}>
        {adaptation.core.map((item, index) => (
          <div className={styles.fieldGroup} key={`${item.label}-${index}`}>
            <ArchiveField htmlFor={`core-label-${index}`} label={`CORE FIELD ${index + 1}`}>
              <input
                id={`core-label-${index}`}
                onChange={(event) => onChange({
                  ...adaptation,
                  core: adaptation.core.map((core, coreIndex) => coreIndex === index
                    ? { ...core, label: event.target.value }
                    : core),
                })}
                value={item.label}
              />
            </ArchiveField>
            <ArchiveField htmlFor={`core-value-${index}`} label="STRUCTURED VALUE">
              <textarea
                id={`core-value-${index}`}
                onChange={(event) => onChange({
                  ...adaptation,
                  core: adaptation.core.map((core, coreIndex) => coreIndex === index
                    ? { ...core, value: event.target.value }
                    : core),
                })}
                rows={5}
                value={item.value}
              />
            </ArchiveField>
          </div>
        ))}
      </div>

      <ArchiveField htmlFor="story-engine" label="STORY ENGINE">
        <textarea
          id="story-engine"
          onChange={(event) => onChange({ ...adaptation, storyEngine: event.target.value })}
          rows={5}
          value={adaptation.storyEngine}
        />
      </ArchiveField>

      <div className={styles.threeColumnGrid}>
        {([
          ['confirmed', 'CONFIRMED FACTS'],
          ['estimates', 'CURRENT INTERPRETATIONS'],
          ['unresolved', 'INTENTIONALLY UNRESOLVED'],
        ] as const).map(([field, label]) => (
          <ArchiveField htmlFor={`adaptation-${field}`} key={field} label={label}>
            <textarea
              id={`adaptation-${field}`}
              onChange={(event) => onChange({ ...adaptation, [field]: splitLines(event.target.value) })}
              rows={10}
              value={joinLines(adaptation[field])}
            />
          </ArchiveField>
        ))}
      </div>

      <div className={styles.phaseEditorList}>
        {adaptation.phases.map((phase, index) => (
          <div className={styles.phaseEditor} key={`${phase.number}-${index}`}>
            <div className={styles.phaseTitle}>
              <span>{phase.number}</span>
              <strong>{phase.label || `Phase ${index + 1}`}</strong>
            </div>
            <div className={styles.twoColumnGrid}>
              <ArchiveField htmlFor={`phase-label-${index}`} label="PHASE LABEL">
                <input
                  id={`phase-label-${index}`}
                  onChange={(event) => onChange({
                    ...adaptation,
                    phases: adaptation.phases.map((item, phaseIndex) => phaseIndex === index
                      ? { ...item, label: event.target.value }
                      : item),
                  })}
                  value={phase.label}
                />
              </ArchiveField>
              <ArchiveField htmlFor={`phase-purpose-${index}`} label="PURPOSE">
                <input
                  id={`phase-purpose-${index}`}
                  onChange={(event) => onChange({
                    ...adaptation,
                    phases: adaptation.phases.map((item, phaseIndex) => phaseIndex === index
                      ? { ...item, purpose: event.target.value }
                      : item),
                  })}
                  value={phase.purpose}
                />
              </ArchiveField>
            </div>
            <ArchiveField htmlFor={`phase-beats-${index}`} label="ESSENTIAL BEATS · ONE PER LINE · MAX 3">
              <textarea
                id={`phase-beats-${index}`}
                onChange={(event) => onChange({
                  ...adaptation,
                  phases: adaptation.phases.map((item, phaseIndex) => phaseIndex === index
                    ? { ...item, beats: splitLines(event.target.value) }
                    : item),
                })}
                rows={5}
                value={joinLines(phase.beats)}
              />
            </ArchiveField>
            <ArchiveField htmlFor={`phase-gate-${index}`} label="EXPLICIT GATE">
              <textarea
                id={`phase-gate-${index}`}
                onChange={(event) => onChange({
                  ...adaptation,
                  phases: adaptation.phases.map((item, phaseIndex) => phaseIndex === index
                    ? { ...item, gate: event.target.value }
                    : item),
                })}
                rows={3}
                value={phase.gate}
              />
            </ArchiveField>
          </div>
        ))}
      </div>

      <div className={styles.threeColumnGrid}>
        {([
          ['atmosphere', 'MATERIAL & TONE'],
          ['boundaries', 'CREATIVE BOUNDARIES'],
          ['nextQuestions', 'AUTHOR QUESTIONS'],
        ] as const).map(([field, label]) => (
          <ArchiveField htmlFor={`adaptation-${field}`} key={field} label={label}>
            <textarea
              id={`adaptation-${field}`}
              onChange={(event) => onChange({ ...adaptation, [field]: splitLines(event.target.value) })}
              rows={9}
              value={joinLines(adaptation[field])}
            />
          </ArchiveField>
        ))}
      </div>

      {adaptation.votes.map((vote, index) => (
        <div className={styles.voteEditor} key={`${vote.question}-${index}`}>
          <ArchiveField htmlFor={`vote-question-${index}`} label="OPTIONAL INVESTIGATION VOTE">
            <input
              id={`vote-question-${index}`}
              onChange={(event) => onChange({
                ...adaptation,
                votes: adaptation.votes.map((item, voteIndex) => voteIndex === index
                  ? { ...item, question: event.target.value }
                  : item),
              })}
              value={vote.question}
            />
          </ArchiveField>
          <div className={styles.twoColumnGrid}>
            <ArchiveField htmlFor={`vote-why-${index}`} label="WHY NOW">
              <textarea
                id={`vote-why-${index}`}
                onChange={(event) => onChange({
                  ...adaptation,
                  votes: adaptation.votes.map((item, voteIndex) => voteIndex === index
                    ? { ...item, whyNow: event.target.value }
                    : item),
                })}
                rows={4}
                value={vote.whyNow}
              />
            </ArchiveField>
            <ArchiveField htmlFor={`vote-options-${index}`} label="OPTIONS · ONE PER LINE">
              <textarea
                id={`vote-options-${index}`}
                onChange={(event) => onChange({
                  ...adaptation,
                  votes: adaptation.votes.map((item, voteIndex) => voteIndex === index
                    ? { ...item, options: splitLines(event.target.value) }
                    : item),
                })}
                rows={4}
                value={joinLines(vote.options)}
              />
            </ArchiveField>
          </div>
        </div>
      ))}

      <ArchiveField htmlFor="adaptation-review-note" label="REVIEW NOTE">
        <textarea
          id="adaptation-review-note"
          onChange={(event) => setReviewNote(event.target.value)}
          placeholder="Explain required changes or record the approval rationale."
          rows={4}
          value={reviewNote}
        />
      </ArchiveField>

      <div className={styles.reviewActions}>
        <ArchiveButton disabled={!dirty || Boolean(busy)} onClick={onSave} variant="secondary">
          <Save aria-hidden size={15} /> SAVE DRAFT
        </ArchiveButton>
        {['draft', 'changes_requested'].includes(status) ? (
          <ArchiveButton disabled={dirty || Boolean(busy)} onClick={() => onReview('submit')}>
            <Send aria-hidden size={15} /> SUBMIT FOR REVIEW
          </ArchiveButton>
        ) : null}
        {status === 'in_review' ? (
          <>
            <ArchiveButton disabled={dirty || Boolean(busy)} onClick={() => onReview('request_changes')} variant="secondary">
              <PencilLine aria-hidden size={15} /> REQUEST CHANGES
            </ArchiveButton>
            <ArchiveButton disabled={dirty || Boolean(busy)} onClick={() => onReview('approve')}>
              <Check aria-hidden size={15} /> APPROVE GATE 1
            </ArchiveButton>
          </>
        ) : null}
      </div>
    </section>
  )
}

function ContentEditor({
  busy,
  dirty,
  draft,
  immutable,
  item,
  note,
  onChange,
  onNoteChange,
  onPublish,
  onReview,
  onSave,
  workflow,
}: {
  busy: string
  dirty: boolean
  draft: StoryContentDraft
  immutable: boolean
  item: StoryWorkflow['contentItems'][number]
  note: string
  onChange: (draft: StoryContentDraft) => void
  onNoteChange: (value: string) => void
  onPublish: () => void
  onReview: (action: 'submit' | 'request_changes' | 'approve') => void
  onSave: () => void
  workflow: StoryWorkflow
}) {
  const blocked = Boolean(busy) || immutable
  const currentRevision = item.storyRevision === workflow.adaptationApprovedRevision

  return (
    <article className={styles.contentCard} data-status={item.status}>
      <header className={styles.contentCardHeader}>
        <div>
          <span>CONTENT {String(item.position).padStart(2, '0')} · STORY REVISION {item.storyRevision}</span>
          <h3>{item.title}</h3>
        </div>
        <StoryStatus label={STORY_CONTENT_LABELS[item.status]} status={item.status} />
      </header>

      {!currentRevision && item.status !== 'published' ? (
        <div className={styles.warningNote}>
          <CircleAlert aria-hidden size={18} />
          This draft was created from an older story revision. Edit and save it before review.
        </div>
      ) : null}

      <div className={styles.twoColumnGrid}>
        <ArchiveField htmlFor={`content-title-${item.id}`} label="TITLE">
          <input
            disabled={immutable}
            id={`content-title-${item.id}`}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
            value={draft.title}
          />
        </ArchiveField>
        <ArchiveField htmlFor={`content-position-${item.id}`} label="ORDER">
          <input
            disabled={immutable}
            id={`content-position-${item.id}`}
            min={1}
            onChange={(event) => onChange({ ...draft, position: Number(event.target.value) })}
            type="number"
            value={draft.position}
          />
        </ArchiveField>
      </div>
      <div className={styles.twoColumnGrid}>
        <ArchiveField htmlFor={`content-channel-${item.id}`} label="CHANNEL">
          <input
            disabled={immutable}
            id={`content-channel-${item.id}`}
            onChange={(event) => onChange({ ...draft, channel: event.target.value })}
            value={draft.channel}
          />
        </ArchiveField>
        <ArchiveField htmlFor={`content-type-${item.id}`} label="CONTENT TYPE">
          <input
            disabled={immutable}
            id={`content-type-${item.id}`}
            onChange={(event) => onChange({ ...draft, contentType: event.target.value })}
            value={draft.contentType}
          />
        </ArchiveField>
      </div>
      <ArchiveField htmlFor={`content-body-${item.id}`} label="ENGLISH PUBLISHABLE COPY">
        <textarea
          disabled={immutable}
          id={`content-body-${item.id}`}
          onChange={(event) => onChange({ ...draft, body: event.target.value })}
          rows={10}
          value={draft.body}
        />
      </ArchiveField>
      <ArchiveField htmlFor={`content-purpose-${item.id}`} label="NARRATIVE PURPOSE">
        <textarea
          disabled={immutable}
          id={`content-purpose-${item.id}`}
          onChange={(event) => onChange({ ...draft, narrativePurpose: event.target.value })}
          rows={4}
          value={draft.narrativePurpose}
        />
      </ArchiveField>
      <div className={styles.threeColumnGrid}>
        <ArchiveField htmlFor={`content-facts-${item.id}`} label="FACTS USED · ONE PER LINE">
          <textarea
            disabled={immutable}
            id={`content-facts-${item.id}`}
            onChange={(event) => onChange({ ...draft, facts: splitLines(event.target.value) })}
            rows={7}
            value={joinLines(draft.facts)}
          />
        </ArchiveField>
        <ArchiveField htmlFor={`content-assets-${item.id}`} label="REQUIRED ASSETS · ONE PER LINE">
          <textarea
            disabled={immutable}
            id={`content-assets-${item.id}`}
            onChange={(event) => onChange({ ...draft, requiredAssets: splitLines(event.target.value) })}
            rows={7}
            value={joinLines(draft.requiredAssets)}
          />
        </ArchiveField>
        <ArchiveField htmlFor={`content-dependencies-${item.id}`} label="DEPENDENCIES · ONE PER LINE">
          <textarea
            disabled={immutable}
            id={`content-dependencies-${item.id}`}
            onChange={(event) => onChange({ ...draft, dependencies: splitLines(event.target.value) })}
            rows={7}
            value={joinLines(draft.dependencies)}
          />
        </ArchiveField>
      </div>
      <div className={styles.twoColumnGrid}>
        <ArchiveField htmlFor={`content-recommended-${item.id}`} label="AI-RECOMMENDED TIME">
          <input
            disabled={immutable}
            id={`content-recommended-${item.id}`}
            onChange={(event) => onChange({
              ...draft,
              recommendedPublishAt: event.target.value ? new Date(event.target.value).toISOString() : null,
            })}
            type="datetime-local"
            value={toLocalDateTime(draft.recommendedPublishAt)}
          />
        </ArchiveField>
        <ArchiveField htmlFor={`content-follow-up-${item.id}`} label="FOLLOW-UP / PAYOFF">
          <input
            disabled={immutable}
            id={`content-follow-up-${item.id}`}
            onChange={(event) => onChange({ ...draft, followUp: event.target.value })}
            value={draft.followUp}
          />
        </ArchiveField>
      </div>
      <ArchiveField htmlFor={`content-timing-${item.id}`} label="TIMING RATIONALE">
        <textarea
          disabled={immutable}
          id={`content-timing-${item.id}`}
          onChange={(event) => onChange({ ...draft, timingRationale: event.target.value })}
          rows={4}
          value={draft.timingRationale}
        />
      </ArchiveField>
      <ArchiveField htmlFor={`content-note-${item.id}`} label="REVIEW NOTE">
        <textarea
          disabled={immutable}
          id={`content-note-${item.id}`}
          onChange={(event) => onNoteChange(event.target.value)}
          rows={3}
          value={note}
        />
      </ArchiveField>

      {!immutable ? (
        <div className={styles.contentActions}>
          <ArchiveButton disabled={!dirty || blocked} onClick={onSave} variant="secondary">
            <Save aria-hidden size={15} /> SAVE DRAFT
          </ArchiveButton>
          {['draft', 'changes_requested'].includes(item.status) ? (
            <ArchiveButton disabled={dirty || blocked || !currentRevision} onClick={() => onReview('submit')}>
              <Send aria-hidden size={15} /> SUBMIT FOR REVIEW
            </ArchiveButton>
          ) : null}
          {item.status === 'in_review' ? (
            <>
              <ArchiveButton disabled={dirty || blocked} onClick={() => onReview('request_changes')} variant="secondary">
                <PencilLine aria-hidden size={15} /> REQUEST CHANGES
              </ArchiveButton>
              <ArchiveButton disabled={dirty || blocked || !currentRevision} onClick={() => onReview('approve')}>
                <Check aria-hidden size={15} /> APPROVE CONTENT
              </ArchiveButton>
            </>
          ) : null}
        </div>
      ) : null}

      {['approved', 'scheduled'].includes(item.status) ? (
        <div className={styles.publishControls}>
          <p className={styles.manualPublicationNote}>
            Publish the approved copy in the Batch editor or its intended channel first.
            Recording it here does not change the public Device page.
          </p>
          <div>
            <ArchiveLinkButton href={`/admin/device-batches?batch=${encodeURIComponent(workflow.workspaceSlug)}`} variant="secondary">
              OPEN BATCH EDITOR
            </ArchiveLinkButton>
            <ArchiveButton disabled={Boolean(busy) || dirty || !canPublishContent(item, workflow)} onClick={onPublish}>
              <Send aria-hidden size={15} /> RECORD AS PUBLISHED
            </ArchiveButton>
          </div>
        </div>
      ) : null}

      {item.status === 'scheduled' && item.scheduledFor ? (
        <p className={styles.scheduledLine}>Previously planned for {new Date(item.scheduledFor).toLocaleString()} · automatic publication is paused.</p>
      ) : null}
      {item.status === 'published' && item.publishedAt ? (
        <p className={styles.publishedLine}>Published {new Date(item.publishedAt).toLocaleString()} · record is immutable</p>
      ) : null}
    </article>
  )
}
