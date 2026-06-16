/**
 * Signal Dispatch recall (re-engagement) — doc 3.3.
 *
 * 24 hours after a day's puzzle is published, email the world's PRIOR
 * participants who haven't yet responded to the new day, telling them a new
 * signal has appeared. Run by the hourly cron at /api/cron/signal-recall.
 *
 * Idempotent: each task is processed once (recall_sent_at guard) and each
 * (task, user) reminder is logged (signal_recall_log unique key) so re-runs
 * never double-send.
 */
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://multiverseco.org'
const RECALL_DELAY_MS = 24 * 60 * 60 * 1000 // 24h after publish

export interface RecallResult {
  tasksProcessed: number
  emailsSent: number
  errors: string[]
}

function recallEmailHtml(worldName: string, dayNum: number, url: string): string {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a2e;">
    <p style="font-size: 12px; letter-spacing: 0.2em; color: #E85D04; text-transform: uppercase;">// Signal Dispatch</p>
    <h1 style="font-size: 20px; margin: 8px 0 4px;">A new signal has appeared</h1>
    <p style="font-size: 15px; line-height: 1.6;">
      <strong>${worldName}</strong> has a new transmission — Day ${dayNum} is live.
      Your intuition helped tune it before; come see what surfaced.
    </p>
    <p style="margin: 24px 0;">
      <a href="${url}" style="background: #E85D04; color: #fff; text-decoration: none; padding: 11px 22px; font-size: 14px; letter-spacing: 0.05em; display: inline-block;">
        Decipher the new signal →
      </a>
    </p>
    <p style="font-size: 12px; color: #888;">Multiverse Collective · Signal Dispatch</p>
  </div>`
}

/** Find tasks published ≥24h ago that haven't been recalled yet, and remind
 *  prior participants who haven't responded to the new day. */
export async function runSignalRecall(): Promise<RecallResult> {
  const admin = createAdminClient() as DB
  const result: RecallResult = { tasksProcessed: 0, emailsSent: 0, errors: [] }
  const cutoff = new Date(Date.now() - RECALL_DELAY_MS).toISOString()

  const { data: tasks } = await admin
    .from('signal_tasks')
    .select('id, thread_id, day_index')
    .eq('is_published', true)
    .is('recall_sent_at', null)
    .not('thread_id', 'is', null)
    .lte('published_at', cutoff)

  for (const task of (tasks ?? []) as { id: string; thread_id: string; day_index: number | null }[]) {
    try {
      const dayIndex = task.day_index ?? 0

      // world (name + id) via the thread
      const { data: thread } = await admin.from('signal_threads').select('world_id').eq('id', task.thread_id).maybeSingle()
      const worldId: string | null = thread?.world_id ?? null
      let worldName = 'a world you follow'
      if (worldId) {
        const { data: world } = await admin.from('worlds').select('name').eq('id', worldId).maybeSingle()
        worldName = world?.name ?? worldName
      }

      // prior days of this thread (day_index < current)
      const { data: priorTasks } = await admin
        .from('signal_tasks')
        .select('id')
        .eq('thread_id', task.thread_id)
        .lt('day_index', dayIndex)
      const priorIds = ((priorTasks ?? []) as { id: string }[]).map((t) => t.id)

      let recipientIds: string[] = []
      if (priorIds.length) {
        const { data: priorResp } = await admin
          .from('signal_responses')
          .select('user_id')
          .in('task_id', priorIds)
        const participants = new Set(((priorResp ?? []) as { user_id: string }[]).map((r) => r.user_id))

        // exclude those who already responded to the new day
        const { data: doneResp } = await admin
          .from('signal_responses')
          .select('user_id')
          .eq('task_id', task.id)
        for (const r of (doneResp ?? []) as { user_id: string }[]) participants.delete(r.user_id)

        recipientIds = [...participants]
      }

      const url = worldId ? `${SITE_URL}/worlds/${encodeURIComponent(worldId)}` : `${SITE_URL}/signal`

      for (const userId of recipientIds) {
        // dedup guard: claim the (task,user) slot first; skip if already logged
        const { error: logErr } = await admin.from('signal_recall_log').insert({ task_id: task.id, user_id: userId })
        if (logErr) continue // unique violation → already reminded

        const { data: profile } = await admin
          .from('voyager_profiles')
          .select('email')
          .eq('id', userId)
          .maybeSingle()
        const to = (profile as { email: string | null } | null)?.email
        if (!to) continue

        const { error: mailErr } = await sendEmail({
          to,
          subject: `A new signal has appeared — ${worldName}`,
          html: recallEmailHtml(worldName, dayIndex + 1, url),
        })
        if (mailErr) result.errors.push(`task ${task.id} user ${userId}: ${mailErr}`)
        else result.emailsSent++
      }

      // mark processed regardless of recipient count so we don't re-scan
      await admin.from('signal_tasks').update({ recall_sent_at: new Date().toISOString() }).eq('id', task.id)
      result.tasksProcessed++
    } catch (e) {
      result.errors.push(`task ${task.id}: ${(e as Error).message}`)
    }
  }

  return result
}
