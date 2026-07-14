/**
 * Re-engagement emails (churn detection) — two rules layered on top of the
 * per-day single-miss recall:
 *
 *   1. owner_absent — a world OWNER has missed the 2 most recent revealed days
 *      of their own world (trailing streak ≥ 2). Claude-generated copy that
 *      names the world and how many members have tuned it in their absence.
 *
 *   2. voter_churn — a member who has voted in a thread before then misses the
 *      3 most recent revealed days of it (trailing streak ≥ 3). Fixed copy with
 *      a "your voice matters — help us decide" appeal.
 *
 * Anti-spam: at most ONE re-engagement email per user per run. When a user
 * qualifies for several, priority is owner_absent > voter_churn, and within a
 * rule the FRESHEST world (latest reveal) wins. The cron also skips these users
 * for the generic recall. Each episode is deduped via signal_engagement_log.
 *
 * "Revealed" = the scheduled-reveal time has passed (src/lib/signal/reveal.ts).
 */
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { resolveUserEmail } from '@/lib/signal/world-confirmed-email'
import { buildSchedule, DEFAULT_GAP_HOURS } from '@/lib/signal/reveal'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://multiverseco.org'
const ICON = `${SITE}/assets/vi-icon.png`
const WORDMARK = `${SITE}/assets/vi-wordmark.png`
const ALERT_TO = process.env.ALERT_EMAIL ?? 'misteror.ywl@gmail.com'

const OWNER_MISS_THRESHOLD = 2
const VOTER_MISS_THRESHOLD = 3

type VoteScope = 'self' | 'voters' | 'all'

export interface EngagementResult {
  ownerAbsentSent: number
  voterChurnSent: number
  errors: string[]
  emailedUserIds: string[]
}

// Local copy of the app's owner voting rule (keeps this module self-contained).
function eligibleToVote(role: string | null, userId: string | null, voteScope: VoteScope, ownerId: string | null): boolean {
  if (!role || !userId) return false
  if (role === 'architect') return true
  if (voteScope === 'self') return userId === ownerId
  if (voteScope === 'voters') return role === 'voyager'
  return true
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Shared deep-space terminal shell: logo header → body paragraphs → optional
 *  option grid → CTA → footer. Paragraphs are pre-escaped/styled HTML strings. */
function shell(opts: {
  eyebrow: string
  headline: string // may contain <br/>
  paras: string[]
  optionUrls: string[]
  ctaLabel: string
  ctaHref: string
}): string {
  const cells = opts.optionUrls
    .slice(0, 4)
    .map((u) => `<td width="25%" style="padding:0 3px;"><img src="${u}" width="100%" style="display:block;width:100%;border:1px solid #1E2840;" alt=""/></td>`)
    .join('')
  const optionsBlock = opts.optionUrls.length
    ? `<p style="margin:0 0 10px 0;font-size:9px;letter-spacing:0.25em;color:#4A5570;text-transform:uppercase;">// The latest signal</p>
       <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;"><tr>${cells}</tr></table>`
    : ''
  const bodyParas = opts.paras
    .map((p, i) => `<p style="margin:0 0 ${i === opts.paras.length - 1 && !opts.optionUrls.length ? 26 : 18}px 0;font-size:12px;line-height:1.9;color:${i === opts.paras.length - 1 ? '#C7D2E6' : '#8A9AB5'};">${p}</p>`)
    .join('\n  ')
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#0A0E27;font-family:'Courier New',Courier,monospace;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0E27;"><tr><td align="center" style="padding:48px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td align="center" style="padding-bottom:36px;"><table cellpadding="0" cellspacing="0" border="0"><tr>
  <td valign="middle"><img src="${ICON}" height="38" style="display:block;height:38px;width:auto;" alt=""/></td><td width="10"></td>
  <td valign="middle"><img src="${WORDMARK}" height="30" style="display:block;height:30px;width:auto;" alt="Multiverse Collective"/></td>
</tr></table></td></tr>
<tr><td style="background-color:#0D1020;border:1px solid #1E2840;padding:40px 36px;">
  <p style="margin:0 0 22px 0;font-size:9px;letter-spacing:0.3em;color:#4A5570;text-transform:uppercase;">${opts.eyebrow}</p>
  <h1 style="margin:0 0 18px 0;font-size:22px;font-weight:700;letter-spacing:0.08em;color:#F5F5F5;line-height:1.3;">${opts.headline}</h1>
  ${bodyParas}
  ${optionsBlock}
  <table cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#FF6B35;">
    <a href="${opts.ctaHref}" style="display:inline-block;padding:14px 32px;font-size:11px;font-weight:700;letter-spacing:0.2em;color:#0A0E27;text-decoration:none;text-transform:uppercase;">${opts.ctaLabel}</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding-top:24px;"><p style="margin:0;font-size:9px;color:#2A3A5A;text-align:center;line-height:1.8;letter-spacing:0.05em;">BUILDING BETTER WORLDS, TOGETHER.<br/><a href="${SITE}" style="color:#4A5570;text-decoration:none;">multiverseco.org</a></p></td></tr>
</table></td></tr></table></body></html>`
}

// ── Rule 1 copy (Claude-generated, world-specific) ────────────────────────────

interface OwnerCopy { subject: string; lead: string; appeal: string }

async function generateOwnerCopy(
  worldName: string,
  description: string,
  participantCount: number,
): Promise<{ copy: OwnerCopy | null; reason?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { copy: null, reason: 'ANTHROPIC_API_KEY not set' }
  const client = new Anthropic({ apiKey })

  const system = [
    'You are the copywriter for the Multiverse Collective, a fiction-flavoured community where members "discover" and then collectively "tune" parallel worlds.',
    'WORLDVIEW (critical): the Collective does NOT create, build, shape, or change worlds — every world already exists. Voting decides which frequency band we probe and which signal is the true reading of the world. Never say or imply the member shapes, builds, molds, designs, or determines what a world becomes. Frame their vote as choosing which signal/frequency is real.',
    'Voice: a deep-space mission-control terminal — second person, present tense, understated awe, plain English. No emojis, no exclamation marks, no markdown.',
    'Context: this email goes to the member who DISCOVERED a world. It has entered Signal Tuning, new signals have surfaced, but the discoverer has missed the last two and other members have been voting (choosing which signal is real) in their absence.',
    'Return three fields:',
    '- subject: under 60 characters, references the world, conveys "it is being tuned without you" (NOT "shaped").',
    `- lead: ONE sentence telling them their world has kept tuning while they were away, and that ${participantCount} member${participantCount === 1 ? ' has' : 's have'} weighed in over the last two signals. State the number.`,
    '- appeal: ONE sentence saying that, as its discoverer, their read should help decide which frequency the Collective probes toward — which signal is the true one — and inviting them back to weigh in. Do NOT say they shape or determine what the world becomes.',
    'Ground all imagery only in the world name and description. Never invent facts beyond them.',
  ].join('\n')
  const user = `World name: ${worldName}\n\nWorld description:\n${description || '(no description provided)'}\n\nMembers who voted over the last two signals: ${participantCount}`

  try {
    const res = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: { subject: { type: 'string' }, lead: { type: 'string' }, appeal: { type: 'string' } },
            required: ['subject', 'lead', 'appeal'],
            additionalProperties: false,
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    if (res.stop_reason === 'refusal') return { copy: null, reason: 'model refused' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (res.content.find((b) => b.type === 'text') as any)?.text
    if (!raw) return { copy: null, reason: 'empty response' }
    const parsed = JSON.parse(raw) as OwnerCopy
    if (!parsed.subject || !parsed.lead || !parsed.appeal) return { copy: null, reason: 'incomplete fields' }
    return { copy: parsed }
  } catch (e) {
    const status = (e as { status?: number })?.status
    const type = (e as { type?: string })?.type
    const msg = e instanceof Error ? e.message : 'unknown error'
    return { copy: null, reason: `${status ?? '?'} ${type ?? ''} ${msg}`.trim() }
  }
}

function ownerStaticCopy(worldName: string, participantCount: number): OwnerCopy {
  return {
    subject: `${worldName} is being tuned without you`,
    lead: `Your world has kept tuning while you were away — ${participantCount} member${participantCount === 1 ? ' has' : 's have'} weighed in over the last two signals.`,
    appeal: 'As its discoverer, your read should help decide which frequency we probe toward — come weigh in on which signal is real.',
  }
}

// ── Selected option image URLs for a specific task ────────────────────────────

async function taskOptionUrls(admin: DB, taskId: string): Promise<string[]> {
  const { data: opts } = await admin
    .from('signal_task_assets')
    .select('processed_url, display_url')
    .eq('task_id', taskId)
    .eq('is_selected', true)
    .eq('asset_role', 'option')
  return ((opts ?? []) as { processed_url: string | null; display_url: string | null }[])
    .map((o) => o.processed_url || o.display_url)
    .filter((u): u is string => !!u)
    .slice(0, 4)
}

// ── Core ──────────────────────────────────────────────────────────────────────

type RevealedTask = { taskId: string; dayIndex: number }
type WorldInfo = { worldId: string; name: string; description: string; ownerId: string | null; voteScope: VoteScope; scanUntil: string | null }

interface Candidate {
  userId: string
  rule: 'owner_absent' | 'voter_churn'
  threadId: string
  world: WorldInfo
  episodeKey: string
  freshness: number          // ms of latest revealed reveal-time (higher = fresher)
  latestTaskId: string       // newest revealed day (for the option grid)
  missedTaskIds: string[]    // trailing missed revealed tasks (for participant count)
}

/** Detect churn streaks and send at most one re-engagement email per user.
 *  Returns the set of users emailed so the caller can skip them for recall. */
export async function runEngagementEmails(): Promise<EngagementResult> {
  const admin = createAdminClient() as DB
  const result: EngagementResult = { ownerAbsentSent: 0, voterChurnSent: 0, errors: [], emailedUserIds: [] }
  const now = new Date()

  // 1. All threads + their world info (incl scan_until, the anchor fallback).
  const { data: threadRows } = await admin
    .from('signal_threads')
    .select('id, world_id, reveal_anchor_at, gap_hours')
  const threads = (threadRows ?? []) as { id: string; world_id: string | null; reveal_anchor_at: string | null; gap_hours: number | null }[]
  if (!threads.length) return result

  const worldIds = [...new Set(threads.map((t) => t.world_id).filter((w): w is string => !!w))]
  const worldInfo = new Map<string, WorldInfo>()
  if (worldIds.length) {
    const { data: worlds } = await admin
      .from('worlds')
      .select('id, name, description, submitted_by, discoverer_id, vote_scope, scan_until')
      .in('id', worldIds)
    for (const w of (worlds ?? []) as { id: string; name: string; description: string | null; submitted_by: string | null; discoverer_id: string | null; vote_scope: string | null; scan_until: string | null }[]) {
      worldInfo.set(w.id, {
        worldId: w.id,
        name: w.name ?? 'your world',
        description: w.description ?? '',
        ownerId: w.submitted_by || w.discoverer_id,
        voteScope: (w.vote_scope as VoteScope) ?? 'all',
        scanUntil: w.scan_until ?? null,
      })
    }
  }

  // 2. Published tasks per thread → the gap-chain open schedule (day_index → openAt ms).
  const { data: taskRows } = await admin
    .from('signal_tasks')
    .select('id, thread_id, day_index, published_at')
    .eq('is_published', true)
    .in('thread_id', threads.map((t) => t.id))
  const pubByThread = new Map<string, { id: string; dayIndex: number; publishedAtISO: string }[]>()
  for (const t of (taskRows ?? []) as { id: string; thread_id: string; day_index: number | null; published_at: string | null }[]) {
    if (!t.published_at) continue
    const arr = pubByThread.get(t.thread_id) ?? []
    arr.push({ id: t.id, dayIndex: t.day_index ?? 0, publishedAtISO: t.published_at })
    pubByThread.set(t.thread_id, arr)
  }
  const openByThread = new Map<string, Map<number, number>>()
  for (const th of threads) {
    const anchorAt = th.reveal_anchor_at ?? (th.world_id ? worldInfo.get(th.world_id)?.scanUntil ?? null : null)
    const schedule = buildSchedule(anchorAt, th.gap_hours ?? DEFAULT_GAP_HOURS, (pubByThread.get(th.id) ?? []).map((p) => ({ dayIndex: p.dayIndex, publishedAtISO: p.publishedAtISO })))
    openByThread.set(th.id, new Map(schedule.map((s) => [s.dayIndex, s.openAt.getTime()])))
  }

  // Revealed (opened) tasks per thread, ascending by day_index.
  const nowMs = now.getTime()
  const threadReveals = new Map<string, RevealedTask[]>()
  for (const th of threads) {
    const open = openByThread.get(th.id)
    if (!open) continue
    for (const p of pubByThread.get(th.id) ?? []) {
      const openMs = open.get(p.dayIndex)
      if (openMs == null || openMs > nowMs) continue
      const arr = threadReveals.get(th.id) ?? []
      arr.push({ taskId: p.id, dayIndex: p.dayIndex })
      threadReveals.set(th.id, arr)
    }
  }
  for (const arr of threadReveals.values()) arr.sort((a, b) => a.dayIndex - b.dayIndex)

  // 3. All responses → per-task participants + per-(thread,user) responded tasks.
  const { data: respRows } = await admin.from('signal_responses').select('task_id, user_id')
  const taskToThread = new Map<string, string>()
  for (const [tid, arr] of threadReveals) for (const r of arr) taskToThread.set(r.taskId, tid)
  const participantsByTask = new Map<string, Set<string>>()
  const respondedByUserThread = new Map<string, Set<string>>() // key `${userId}|${threadId}` → taskIds
  const pastVoters = new Set<string>()
  for (const r of (respRows ?? []) as { task_id: string; user_id: string }[]) {
    pastVoters.add(r.user_id)
    const set = participantsByTask.get(r.task_id) ?? new Set<string>()
    set.add(r.user_id)
    participantsByTask.set(r.task_id, set)
    const tid = taskToThread.get(r.task_id)
    if (tid) {
      const k = `${r.user_id}|${tid}`
      const s = respondedByUserThread.get(k) ?? new Set<string>()
      s.add(r.task_id)
      respondedByUserThread.set(k, s)
    }
  }

  // role lookup (cached) for eligibility
  const roleCache = new Map<string, string | null>()
  const roleOf = async (userId: string): Promise<string | null> => {
    if (roleCache.has(userId)) return roleCache.get(userId)!
    const { data } = await admin.from('voyager_profiles').select('role').eq('id', userId).maybeSingle()
    const role = (data as { role: string | null } | null)?.role ?? null
    roleCache.set(userId, role)
    return role
  }

  // trailing miss streak + last-participated index for a user in a thread
  const streakFor = (userId: string, threadId: string, reveals: RevealedTask[]) => {
    const responded = respondedByUserThread.get(`${userId}|${threadId}`) ?? new Set<string>()
    let miss = 0
    const missedTaskIds: string[] = []
    let lastParticipated = -1
    for (let i = reveals.length - 1; i >= 0; i--) {
      if (responded.has(reveals[i].taskId)) { lastParticipated = reveals[i].dayIndex; break }
      miss++
      missedTaskIds.push(reveals[i].taskId)
    }
    return { miss, missedTaskIds, lastParticipated, participatedEver: responded.size > 0 }
  }

  // 4. Build candidates.
  const candidates: Candidate[] = []
  for (const t of threads) {
    const reveals = threadReveals.get(t.id) ?? []
    if (!reveals.length || !t.world_id) continue
    const w = worldInfo.get(t.world_id)
    if (!w) continue
    const latest = reveals[reveals.length - 1]
    const freshness = openByThread.get(t.id)?.get(latest.dayIndex) ?? 0

    // Rule 1 — owner absent
    if (w.ownerId) {
      const role = await roleOf(w.ownerId)
      if (eligibleToVote(role, w.ownerId, w.voteScope, w.ownerId)) {
        const s = streakFor(w.ownerId, t.id, reveals)
        if (s.miss >= OWNER_MISS_THRESHOLD) {
          candidates.push({
            userId: w.ownerId, rule: 'owner_absent', threadId: t.id, world: w,
            episodeKey: `${t.id}:${s.lastParticipated}`, freshness, latestTaskId: latest.taskId,
            missedTaskIds: s.missedTaskIds.slice(0, OWNER_MISS_THRESHOLD),
          })
        }
      }
    }

    // Rule 2 — voter churn (per-thread; must have voted in THIS thread before)
    for (const userId of pastVoters) {
      if (userId === w.ownerId) continue // owner handled by rule 1
      const s = streakFor(userId, t.id, reveals)
      if (!s.participatedEver || s.miss < VOTER_MISS_THRESHOLD) continue
      const role = await roleOf(userId)
      if (!eligibleToVote(role, userId, w.voteScope, w.ownerId)) continue
      candidates.push({
        userId, rule: 'voter_churn', threadId: t.id, world: w,
        episodeKey: `${t.id}:${s.lastParticipated}`, freshness, latestTaskId: latest.taskId,
        missedTaskIds: s.missedTaskIds,
      })
    }
  }

  // 5. One email per user: owner_absent > voter_churn, freshest wins.
  const byUser = new Map<string, Candidate[]>()
  for (const c of candidates) {
    const arr = byUser.get(c.userId) ?? []
    arr.push(c)
    byUser.set(c.userId, arr)
  }
  const rank = (r: Candidate['rule']) => (r === 'owner_absent' ? 0 : 1)

  for (const [userId, list] of byUser) {
    list.sort((a, b) => rank(a.rule) - rank(b.rule) || b.freshness - a.freshness)
    for (const c of list) {
      // episode dedup: claim the slot; unique-violation means already sent this episode
      const { error: dupErr } = await admin
        .from('signal_engagement_log')
        .insert({ user_id: userId, rule: c.rule, episode_key: c.episodeKey })
      if (dupErr) continue // already emailed for this episode → try next candidate
      try {
        const to = await resolveUserEmail(admin, userId)
        if (!to) break
        if (c.rule === 'owner_absent') await sendOwnerEmail(admin, to, c)
        else await sendVoterEmail(admin, to, c)
        result.emailedUserIds.push(userId)
        if (c.rule === 'owner_absent') result.ownerAbsentSent++
        else result.voterChurnSent++
      } catch (e) {
        result.errors.push(`${c.rule} ${userId}: ${(e as Error).message}`)
      }
      break // one email per user per run
    }
  }

  return result
}

async function sendOwnerEmail(admin: DB, to: string, c: Candidate): Promise<void> {
  // distinct members (excluding owner) across the trailing missed days
  const participants = new Set<string>()
  for (const tid of c.missedTaskIds) {
    const set = (await participantsForTask(admin, tid))
    for (const u of set) if (u !== c.userId) participants.add(u)
  }
  const count = participants.size

  const { copy, reason } = await generateOwnerCopy(c.world.name, c.world.description, count)
  const final = copy ?? ownerStaticCopy(c.world.name, count)
  if (!copy) {
    await sendEmail({
      to: ALERT_TO,
      subject: '⚠️ Signal Dispatch: AI email copy unavailable (owner re-engagement)',
      html: `<p>Owner-absent email for <strong>${escapeHtml(c.world.name)}</strong> (${c.world.worldId}) used <strong>fallback copy</strong> — Claude failed.</p><p>Reason: <code>${escapeHtml(reason ?? 'unknown')}</code></p><p>Top up at <a href="https://console.anthropic.com/settings/billing">console.anthropic.com</a>.</p>`,
    })
  }
  const safeName = escapeHtml(c.world.name)
  const lead = escapeHtml(final.lead).replace(safeName, `<span style="color:#FF6B35;">${safeName}</span>`)
  const optionUrls = await taskOptionUrls(admin, c.latestTaskId)
  const html = shell({
    eyebrow: '// Your world is tuning',
    headline: 'YOUR WORLD IS<br/>TUNING WITHOUT YOU',
    paras: [lead, escapeHtml(final.appeal)],
    optionUrls,
    ctaLabel: '[ TUNE YOUR WORLD ]',
    ctaHref: `${SITE}/worlds/${c.world.worldId}`,
  })
  await sendEmail({ to, subject: final.subject, html })
}

async function sendVoterEmail(admin: DB, to: string, c: Candidate): Promise<void> {
  const safeName = escapeHtml(c.world.name)
  const optionUrls = await taskOptionUrls(admin, c.latestTaskId)
  const html = shell({
    eyebrow: '// Signal lost',
    headline: "WE'VE LOST<br/>YOUR SIGNAL",
    paras: [
      `It has been a few transmissions since you last helped tune <span style="color:#FF6B35;">${safeName}</span>, and the signals have kept arriving without you.`,
      'We want you back in the decision — your read helps choose which frequency we probe toward, and which signal is the real one. Your voice matters here.',
    ],
    optionUrls,
    ctaLabel: '[ CAST YOUR SIGNAL ]',
    ctaHref: `${SITE}/worlds/${c.world.worldId}`,
  })
  await sendEmail({ to, subject: `We've lost your signal — ${c.world.name}`, html })
}

async function participantsForTask(admin: DB, taskId: string): Promise<Set<string>> {
  const { data } = await admin.from('signal_responses').select('user_id').eq('task_id', taskId)
  return new Set(((data ?? []) as { user_id: string }[]).map((r) => r.user_id))
}
