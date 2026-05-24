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

  const { data: recent } = await supabase
    .from('funnel_snapshots')
    .select('run_id, captured_at, version_tag')
    .order('captured_at', { ascending: false })
    .limit(limit * 6)

  if (!recent?.length) return []

  const seen = new Set<string>()
  const runs: { run_id: string; captured_at: string; version_tag: string | null }[] = []
  for (const row of recent) {
    if (!seen.has(row.run_id)) {
      seen.add(row.run_id)
      runs.push(row)
      if (runs.length === limit) break
    }
  }

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

function TrafficRef({ count, count30d }: { count: number; count30d: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '0.75rem 1rem', background: '#070c1a', border: `1px solid ${BORDER}`, marginBottom: '0.5rem' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: MUTED }}>
        HOMEPAGE TRAFFIC (去重浏览器)
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 13, color: DIM }}>
        {count.toLocaleString()} <span style={{ fontSize: 9, color: MUTED }}>all-time</span>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: MUTED }}>
        {count30d.toLocaleString()} <span style={{ fontSize: 9 }}>30d</span>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, marginLeft: 'auto' }}>
        ↓ 不计入漏斗转化率
      </div>
    </div>
  )
}

// PostHog-tracked steps (accumulate from today onward)
const POSTHOG_KEYS   = new Set(['onboarding_started', 'onboarding_q1_completed', 'onboarding_q2_completed'])
// Supabase-backed steps (full historical data)
const SUPABASE_KEYS  = new Set(['onboarding_email_submitted', 'invite_link_clicked', 'registered'])
// Retention step — shown separately below the funnel
const RETENTION_KEYS = new Set(['console_login_clicked'])

function FunnelBar({ count, max, color = ACCENT }: { count: number; max: number; color?: string }) {
  const w = max > 0 ? Math.min(Math.round((count / max) * 100), 100) : 0
  return (
    <div style={{ flex: 1, background: '#111525', height: 6, borderRadius: 1 }}>
      <div style={{ width: `${w}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function StepRow({ step, prev, maxCount, color = ACCENT }: {
  step: SnapshotRow; prev?: SnapshotRow; maxCount: number; color?: string
}) {
  // Only show conversion rate within the same data source
  const sameSource = prev && (
    (POSTHOG_KEYS.has(step.step_key) && POSTHOG_KEYS.has(prev.step_key)) ||
    (SUPABASE_KEYS.has(step.step_key) && SUPABASE_KEYS.has(prev.step_key))
  )
  const stepRate = sameSource ? pct(step.count_all_time, prev!.count_all_time) : null

  return (
    <div>
      {prev && (
        <div style={{ paddingLeft: '0.5rem', marginBottom: '0.25rem', fontFamily: 'monospace', fontSize: 9, color: stepRate ? MUTED : '#1E2840' }}>
          {stepRate ? `↓ ${stepRate}` : '↓'}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.12em', color: DIM, width: 180, flexShrink: 0 }}>
          {step.step_label.toUpperCase()}
        </div>
        <FunnelBar count={step.count_all_time} max={maxCount} color={color} />
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: STAR, width: 48, textAlign: 'right', flexShrink: 0 }}>
          {step.count_all_time.toLocaleString()}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, width: 52, textAlign: 'right', flexShrink: 0 }}>
          30d: {step.count_30d}
        </div>
      </div>
    </div>
  )
}

function RetentionCard({ step, registered }: { step: SnapshotRow; registered: number }) {
  const rate = registered > 0 ? Math.round((step.count_all_time / registered) * 100) : 0
  return (
    <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: 'rgba(34,212,224,0.03)', border: '1px solid rgba(34,212,224,0.15)', borderRadius: 2 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: '#1A4A50', marginBottom: '0.75rem' }}>
        RETENTION · RETURNING USERS
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, marginBottom: '0.25rem' }}>
            CONSOLE → LOGIN COLLECTIVE 点击
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 22, color: '#22D4E0', fontWeight: 700, lineHeight: 1 }}>
            {step.count_all_time.toLocaleString()}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, marginTop: '0.25rem' }}>
            30d: {step.count_30d}
          </div>
        </div>
        {registered > 0 && (
          <div style={{ borderLeft: `1px solid rgba(34,212,224,0.15)`, paddingLeft: '1.5rem' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, marginBottom: '0.25rem' }}>
              回归率（登录 / 注册用户）
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 22, color: '#22D4E0', fontWeight: 700, lineHeight: 1 }}>
              {rate}%
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, marginTop: '0.25rem' }}>
              {step.count_all_time} / {registered} 已注册用户
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RunFunnel({ run, isLatest }: { run: Run; isLatest: boolean }) {
  const allSteps     = [...run.steps].sort((a, b) => a.step_order - b.step_order)
  const trafficRef   = allSteps.find(s => s.step_order === 0)
  const phSteps      = allSteps.filter(s => POSTHOG_KEYS.has(s.step_key))
  const sbSteps      = allSteps.filter(s => SUPABASE_KEYS.has(s.step_key))
  const retentionStep = allSteps.find(s => RETENTION_KEYS.has(s.step_key))
  const phMax        = phSteps[0]?.count_all_time || 1
  const sbMax        = sbSteps[0]?.count_all_time || 1
  const registeredCount = sbSteps.find(s => s.step_key === 'registered')?.count_all_time ?? 0

  return (
    <div style={{ background: CARD_BG, border: `1px solid ${isLatest ? ACCENT : BORDER}`, padding: '1.25rem 1.5rem', borderRadius: 2 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.25em', color: isLatest ? ACCENT : MUTED }}>
          {new Date(run.captured_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>
        {run.version_tag && (
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: OK_COLOR, background: 'rgba(32,216,144,0.1)', border: '1px solid rgba(32,216,144,0.25)', padding: '2px 8px' }}>
            {run.version_tag}
          </div>
        )}
        {isLatest && (
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: ACCENT, background: 'rgba(232,90,0,0.08)', border: '1px solid rgba(232,90,0,0.25)', padding: '2px 8px' }}>
            LATEST
          </div>
        )}
      </div>

      {/* Traffic reference */}
      {trafficRef && <TrafficRef count={trafficRef.count_all_time} count30d={trafficRef.count_30d} />}

      {/* Section A: PostHog events (accumulating from today) */}
      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: '#2A3A5A', marginBottom: '0.5rem' }}>
          ONBOARDING INTERACTION · POSTHOG · 从今日起积累
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {phSteps.map((step, i) => (
            <StepRow key={step.step_key} step={step} prev={phSteps[i - 1]} maxCount={phMax} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ margin: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1, height: 1, background: '#1A2438' }} />
        <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#2A3A5A', letterSpacing: '0.2em' }}>SUPABASE · 完整历史数据</div>
        <div style={{ flex: 1, height: 1, background: '#1A2438' }} />
      </div>

      {/* Section B: Supabase data (full history) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sbSteps.map((step, i) => (
          <StepRow key={step.step_key} step={step} prev={sbSteps[i - 1]} maxCount={sbMax} color='#22D4E0' />
        ))}
      </div>

      {/* Retention */}
      {retentionStep && (
        <RetentionCard step={retentionStep} registered={registeredCount} />
      )}

      {/* CVR summary */}
      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {phSteps.length >= 2 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED }}>Q1→Q2</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: ACCENT, fontWeight: 700 }}>
              {pct(phSteps[phSteps.length - 1]?.count_all_time ?? 0, phSteps[0].count_all_time)}
            </div>
          </div>
        )}
        {(() => {
          const emailStep   = sbSteps.find(s => s.step_key === 'onboarding_email_submitted')
          const clickedStep = sbSteps.find(s => s.step_key === 'invite_link_clicked')
          const regStep     = sbSteps.find(s => s.step_key === 'registered')
          return (
            <>
              {emailStep && clickedStep && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED }}>Email→链接点击</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#22D4E0', fontWeight: 700 }}>
                    {pct(clickedStep.count_all_time, emailStep.count_all_time)}
                  </div>
                </div>
              )}
              {clickedStep && regStep && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED }}>点击→注册完成</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#22D4E0', fontWeight: 700 }}>
                    {pct(regStep.count_all_time, clickedStep.count_all_time)}
                  </div>
                </div>
              )}
              {emailStep && regStep && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED }}>Email→注册总转化</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#22D4E0', fontWeight: 700 }}>
                    {pct(regStep.count_all_time, emailStep.count_all_time)}
                  </div>
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}

const HISTORY_KEYS   = ['onboarding_started', 'onboarding_q1_completed', 'onboarding_q2_completed', 'onboarding_email_submitted', 'invite_link_clicked', 'registered']
const HISTORY_LABELS = ['Started', 'Q1', 'Q2', 'Email', 'Clicked', 'Reg.']

function HistoryTable({ runs }: { runs: Run[] }) {
  if (runs.length < 2) return null

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.3em', color: MUTED, marginBottom: '0.75rem' }}>
        // HISTORY — overall CVR (Onboarding Started → Email)
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 10 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left',  padding: '6px 12px', color: MUTED, letterSpacing: '0.15em', borderBottom: `1px solid ${BORDER}` }}>DATE</th>
              <th style={{ textAlign: 'left',  padding: '6px 12px', color: MUTED, letterSpacing: '0.15em', borderBottom: `1px solid ${BORDER}` }}>VER</th>
              {HISTORY_LABELS.map(l => (
                <th key={l} style={{ textAlign: 'right', padding: '6px 12px', color: MUTED, letterSpacing: '0.15em', borderBottom: `1px solid ${BORDER}` }}>{l}</th>
              ))}
              <th style={{ textAlign: 'right', padding: '6px 12px', color: ACCENT, letterSpacing: '0.15em', borderBottom: `1px solid ${BORDER}` }}>CVR</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, ri) => {
              const byKey = Object.fromEntries(run.steps.map(s => [s.step_key, s.count_all_time]))
              const top   = byKey['onboarding_started'] ?? 0
              const email = byKey['onboarding_email_submitted'] ?? 0
              return (
                <tr key={run.run_id} style={{ background: ri === 0 ? 'rgba(232,90,0,0.03)' : 'transparent' }}>
                  <td style={{ padding: '6px 12px', color: ri === 0 ? STAR : DIM, borderBottom: `1px solid ${BORDER}` }}>
                    {new Date(run.captured_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                  </td>
                  <td style={{ padding: '6px 12px', color: OK_COLOR, borderBottom: `1px solid ${BORDER}` }}>
                    {run.version_tag ?? '—'}
                  </td>
                  {HISTORY_KEYS.map(k => (
                    <td key={k} style={{ textAlign: 'right', padding: '6px 12px', color: DIM, borderBottom: `1px solid ${BORDER}` }}>
                      {(byKey[k] ?? 0).toLocaleString()}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', padding: '6px 12px', color: ACCENT, fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>
                    {pct(email, top)}
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
            Onboarding Started → Q1 → Q2 → Email → Link Clicked → Registered · all-time unique users
          </div>
        </div>
        <RefreshButton />
      </div>

      {runs.length === 0 ? (
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: DIM, lineHeight: 2 }}>
            No snapshots yet. Click <span style={{ color: ACCENT }}>CAPTURE NOW</span> to generate the first one.
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
        // Tag a version: <code style={{ color: ACCENT }}>GET /api/analytics/snapshot?version_tag=v1.2</code><br />
        // Cron: daily 09:00 UTC · PostHog (steps 1–4, cookie去重) + Supabase (step 5)
      </div>
    </div>
  )
}
