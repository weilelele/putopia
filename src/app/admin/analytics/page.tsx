import { createAdminClient } from '@/lib/supabase/server'
import { RefreshButton } from './refresh-button'

const ACCENT   = '#E85A00'
const MUTED    = '#4A5570'
const DIM      = '#8A9AB5'
const STAR     = '#EDE8DE'
const CARD_BG  = '#0D1020'
const BORDER   = '#1E2840'
const OK_COLOR = '#20D890'

type SnapshotRow = {
  step_key: string
  step_label: string
  step_order: number
  count_all_time: number
  count_30d: number
}

type Run = {
  run_id: string
  captured_at: string
  version_tag: string | null
  steps: SnapshotRow[]
}

async function getLatestRuns(limit = 10): Promise<Run[]> {
  const supabase = createAdminClient()

  // Fetch the most recent `limit` distinct run_ids
  const { data: recent } = await supabase
    .from('funnel_snapshots')
    .select('run_id, captured_at, version_tag')
    .order('captured_at', { ascending: false })
    .limit(limit * 7) // up to 7 steps per run

  if (!recent?.length) return []

  // Deduplicate by run_id (preserve insertion order = newest first)
  const seen = new Set<string>()
  const runs: { run_id: string; captured_at: string; version_tag: string | null }[] = []
  for (const row of recent) {
    if (!seen.has(row.run_id)) {
      seen.add(row.run_id)
      runs.push(row)
      if (runs.length === limit) break
    }
  }

  // Fetch all steps for those run_ids
  const runIds = runs.map(r => r.run_id)
  const { data: steps } = await supabase
    .from('funnel_snapshots')
    .select('run_id, step_key, step_label, step_order, count_all_time, count_30d')
    .in('run_id', runIds)
    .order('step_order', { ascending: true })

  return runs.map(run => ({
    ...run,
    steps: (steps ?? []).filter(s => s.run_id === run.run_id),
  }))
}

function pct(a: number, b: number) {
  if (!b) return '—'
  return `${Math.round((a / b) * 100)}%`
}

function FunnelBar({ count, max, color = ACCENT }: { count: number; max: number; color?: string }) {
  const w = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div style={{ flex: 1, background: '#111525', height: 6, borderRadius: 1 }}>
      <div style={{ width: `${w}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function RunFunnel({ run, isLatest }: { run: Run; isLatest: boolean }) {
  const steps = [...run.steps].sort((a, b) => a.step_order - b.step_order)
  const maxCount = steps[0]?.count_all_time ?? 1

  return (
    <div style={{ background: CARD_BG, border: `1px solid ${isLatest ? ACCENT : BORDER}`, padding: '1.25rem 1.5rem', borderRadius: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.25em', color: isLatest ? ACCENT : MUTED }}>
          {new Date(run.captured_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>
        {run.version_tag && (
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: OK_COLOR, background: 'rgba(32,216,144,0.1)', border: '1px solid rgba(32,216,144,0.25)', padding: '2px 8px' }}>
            {run.version_tag}
          </div>
        )}
        {isLatest && (
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: ACCENT, background: 'rgba(232,90,0,0.08)', border: '1px solid rgba(232,90,0,0.25)', padding: '2px 8px' }}>
            LATEST
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {steps.map((step, i) => {
          const prev = steps[i - 1]
          const rate = prev ? pct(step.count_all_time, prev.count_all_time) : null
          return (
            <div key={step.step_key}>
              {rate && (
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: MUTED, paddingLeft: '0.5rem', marginBottom: '0.25rem' }}>
                  ↓ {rate}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: DIM, width: 180, flexShrink: 0 }}>
                  {step.step_label.toUpperCase()}
                </div>
                <FunnelBar count={step.count_all_time} max={maxCount} />
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: STAR, width: 48, textAlign: 'right', flexShrink: 0 }}>
                  {step.count_all_time.toLocaleString()}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, width: 52, textAlign: 'right', flexShrink: 0 }}>
                  30d: {step.count_30d}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HistoryTable({ runs }: { runs: Run[] }) {
  if (runs.length < 2) return null
  const stepKeys = ['homepage_visit', 'onboarding_started', 'onboarding_q1_completed', 'onboarding_q2_completed', 'onboarding_email_submitted', 'registered', 'voyager']
  const stepNames = ['Visit', 'Started', 'Q1', 'Q2', 'Email', 'Reg.', 'Voyager']

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.3em', color: MUTED, marginBottom: '0.75rem' }}>
        // CONVERSION RATE HISTORY (all-time, visit → email)
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 10 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 12px', color: MUTED, letterSpacing: '0.15em', borderBottom: `1px solid ${BORDER}` }}>DATE</th>
              <th style={{ textAlign: 'left', padding: '6px 12px', color: MUTED, letterSpacing: '0.15em', borderBottom: `1px solid ${BORDER}` }}>VER</th>
              {stepNames.map(n => (
                <th key={n} style={{ textAlign: 'right', padding: '6px 12px', color: MUTED, letterSpacing: '0.15em', borderBottom: `1px solid ${BORDER}` }}>{n}</th>
              ))}
              <th style={{ textAlign: 'right', padding: '6px 12px', color: ACCENT, letterSpacing: '0.15em', borderBottom: `1px solid ${BORDER}` }}>TOTAL CVR</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, ri) => {
              const byKey = Object.fromEntries(run.steps.map(s => [s.step_key, s.count_all_time]))
              const topCount = byKey['homepage_visit'] ?? 0
              const emailCount = byKey['onboarding_email_submitted'] ?? 0
              return (
                <tr key={run.run_id} style={{ background: ri === 0 ? 'rgba(232,90,0,0.03)' : 'transparent' }}>
                  <td style={{ padding: '6px 12px', color: ri === 0 ? STAR : DIM, borderBottom: `1px solid ${BORDER}` }}>
                    {new Date(run.captured_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                  </td>
                  <td style={{ padding: '6px 12px', color: OK_COLOR, borderBottom: `1px solid ${BORDER}` }}>
                    {run.version_tag ?? '—'}
                  </td>
                  {stepKeys.map(k => (
                    <td key={k} style={{ textAlign: 'right', padding: '6px 12px', color: DIM, borderBottom: `1px solid ${BORDER}` }}>
                      {(byKey[k] ?? 0).toLocaleString()}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', padding: '6px 12px', color: ACCENT, fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>
                    {pct(emailCount, topCount)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default async function AnalyticsPage() {
  const runs = await getLatestRuns(10)

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.3em', color: MUTED, marginBottom: '0.5rem' }}>
            // ONBOARDING FUNNEL
          </div>
          <h1 style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: '0.15em', color: STAR, margin: 0 }}>
            CONVERSION FUNNEL
          </h1>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: MUTED, marginTop: '0.4rem' }}>
            Homepage → Onboarding → Email → Voyager · all-time unique users
          </div>
        </div>
        <RefreshButton />
      </div>

      {runs.length === 0 ? (
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: DIM, lineHeight: 2 }}>
            No snapshots yet.<br />
            <span style={{ color: MUTED }}>The cron runs daily at 09:00 UTC.<br />
            Or trigger manually:</span>{' '}
            <code style={{ color: ACCENT }}>GET /api/analytics/snapshot</code>
          </div>
        </div>
      ) : (
        <>
          <RunFunnel run={runs[0]} isLatest={true} />
          <HistoryTable runs={runs} />
          {runs.length > 1 && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.3em', color: MUTED, marginBottom: '0.75rem' }}>
                // PREVIOUS RUNS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {runs.slice(1).map(run => (
                  <RunFunnel key={run.run_id} run={run} isLatest={false} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: '2rem', fontFamily: 'monospace', fontSize: 9, color: MUTED, lineHeight: 2 }}>
        // To tag a version: <code style={{ color: ACCENT }}>GET /api/analytics/snapshot?version_tag=v1.2</code><br />
        // Cron: daily 09:00 UTC · Data sources: PostHog (steps 1–5) + Supabase (steps 6–7)
      </div>
    </div>
  )
}
