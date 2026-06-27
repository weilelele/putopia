import { createAdminClient } from '@/lib/supabase/server'
import { queryPostHog } from '@/lib/analytics/posthog-query'
import { getMembershipFunnel } from '@/lib/analytics/membership-funnel'
import { getNewsletterFunnel } from '@/lib/analytics/newsletter-funnel'
import { NewsletterPanel } from './newsletter-panel'
import { RefreshButton } from './refresh-button'
import { FunnelTabs } from './tabs'
import { MembershipPanel } from './membership-panel'
import { DaySelector } from './day-selector'

const ACCENT   = '#E85D04'
const MUTED    = 'rgba(245,245,245,0.35)'
const DIM      = 'rgba(245,245,245,0.55)'
const STAR     = '#F5F5F5'
const CARD_BG  = '#0F1430'
const BORDER   = '#151B3A'
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

function TrafficRef({ count, count30d, hide30d = false }: { count: number; count30d: number; hide30d?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '0.75rem 1rem', background: '#070c1a', border: `1px solid ${BORDER}`, marginBottom: '0.5rem' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: MUTED }}>
        HOMEPAGE TRAFFIC (去重浏览器)
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 13, color: DIM }}>
        {count.toLocaleString()} <span style={{ fontSize: 9, color: MUTED }}>{hide30d ? '当日' : 'all-time'}</span>
      </div>
      {!hide30d && (
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: MUTED }}>
          {count30d.toLocaleString()} <span style={{ fontSize: 9 }}>30d</span>
        </div>
      )}
      <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, marginLeft: 'auto' }}>
        ↓ 不计入漏斗转化率
      </div>
    </div>
  )
}

// PostHog-tracked steps (accumulate from today onward)
const POSTHOG_KEYS   = new Set(['onboarding_started', 'onboarding_q1_completed', 'onboarding_q2_completed', 'onboarding_slider_touched', 'onboarding_q3_completed'])
// Supabase-backed steps (full historical data)
const SUPABASE_KEYS  = new Set(['onboarding_email_submitted', 'invite_link_clicked', 'registered'])
// Ad traffic reference — shown above funnel, not in conversion rates
const AD_REF_KEYS    = new Set(['ad_landing'])

function FunnelBar({ count, max, color = ACCENT }: { count: number; max: number; color?: string }) {
  const w = max > 0 ? Math.min(Math.round((count / max) * 100), 100) : 0
  return (
    <div style={{ flex: 1, background: '#151B3A', height: 6, borderRadius: 1 }}>
      <div style={{ width: `${w}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function StepRow({ step, prev, maxCount, color = ACCENT, hide30d = false }: {
  step: SnapshotRow; prev?: SnapshotRow; maxCount: number; color?: string; hide30d?: boolean
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
        <div style={{ paddingLeft: '0.5rem', marginBottom: '0.25rem', fontFamily: 'monospace', fontSize: 9, color: stepRate ? MUTED : '#151B3A' }}>
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
        {!hide30d && (
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, width: 52, textAlign: 'right', flexShrink: 0 }}>
            30d: {step.count_30d}
          </div>
        )}
      </div>
    </div>
  )
}

// Two core conversion rates: email capture (email / started) and register rate
// (registered / email). `daily` adds the same-day-cohort caveat for register rate.
function CoreRatesCard({ started, email, registered, daily = false }: {
  started: number; email: number; registered: number; daily?: boolean
}) {
  const emailRate = started > 0 ? Math.round((email / started) * 100) : 0
  const regRate   = email   > 0 ? Math.round((registered / email) * 100) : 0

  const labelStyle = { fontFamily: 'monospace', fontSize: 9, color: MUTED, marginBottom: '0.25rem' } as const
  const numStyle   = { fontFamily: 'monospace', fontSize: 22, color: ACCENT, fontWeight: 700, lineHeight: 1 } as const
  const denStyle   = { fontFamily: 'monospace', fontSize: 9, color: MUTED, marginTop: '0.25rem' } as const

  return (
    <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: 'rgba(232,93,4,0.03)', border: '1px solid rgba(232,93,4,0.15)', borderRadius: 2 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: '#6E6B5E', marginBottom: '0.75rem' }}>
        CORE CONVERSION · 核心转化
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <div style={labelStyle}>留邮箱率（Email / 进入 onboarding）</div>
          <div style={numStyle}>{emailRate}%</div>
          <div style={denStyle}>{email.toLocaleString()} / {started.toLocaleString()} started</div>
        </div>
        <div style={{ borderLeft: '1px solid rgba(232,93,4,0.15)', paddingLeft: '1.5rem' }}>
          <div style={labelStyle}>注册完成率（注册 / 留邮箱）</div>
          <div style={numStyle}>{regRate}%</div>
          <div style={denStyle}>{registered.toLocaleString()} / {email.toLocaleString()} email</div>
        </div>
      </div>
      {daily && (
        <div style={{ fontFamily: 'monospace', fontSize: 8, color: MUTED, marginTop: '0.75rem', lineHeight: 1.7 }}>
          {'* 单日注册完成率为同日比值——留邮箱与完成注册往往不是同一批人（注册常晚邮箱数天），仅作方向参考；准确口径看 LATEST 累计卡。'}
        </div>
      )}
    </div>
  )
}

/* ── Before / After slider-tracking comparison ─────────────────────────────── */

type BeforeAfterRow = { label: string; pre: number; post: number }

function BeforeAfterComparison({ steps }: { steps: SnapshotRow[] }) {
  const byKey = Object.fromEntries(steps.map(s => [s.step_key, s.count_all_time]))

  const preStarted  = byKey['pre_onboarding_started']         ?? 0
  const preQ1       = byKey['pre_onboarding_q1_completed']    ?? 0
  const preQ2       = byKey['pre_onboarding_q2_completed']    ?? 0
  const postStarted = byKey['post_onboarding_started']        ?? 0
  const postSlider  = byKey['post_onboarding_slider_touched'] ?? 0
  const postQ1      = byKey['post_onboarding_q1_completed']   ?? 0
  const postQ2      = byKey['post_onboarding_q2_completed']   ?? 0

  if (preStarted + postStarted === 0) return null

  const rows: (BeforeAfterRow & { postOnly?: boolean })[] = [
    { label: 'Onboarding Started', pre: preStarted, post: postStarted },
    { label: 'Slider Touched',      pre: 0,         post: postSlider,  postOnly: true },
    { label: 'Q1 Completed',        pre: preQ1,     post: postQ1 },
    { label: 'Q2 Completed',        pre: preQ2,     post: postQ2 },
  ]

  const preMax  = preStarted  || 1
  const postMax = postStarted || 1

  return (
    <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: 'rgba(255,90,31,0.03)', border: `1px solid rgba(255,90,31,0.18)`, borderRadius: 2 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: MUTED, marginBottom: '1rem' }}>
        BEFORE / AFTER SLIDER TRACKING · 2026-05-26 切分
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 52px 1fr 52px', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div />
        <div style={{ fontFamily: 'monospace', fontSize: 8, color: MUTED, letterSpacing: '0.15em' }}>BEFORE</div>
        <div />
        <div style={{ fontFamily: 'monospace', fontSize: 8, color: ACCENT, letterSpacing: '0.15em' }}>AFTER</div>
        <div />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {rows.map((row, i) => {
          const prevPre  = i > 0 ? rows[i - 1].pre  : 0
          const prevPost = i > 0 ? rows[i - 1].post : 0
          const preRate  = (i > 0 && prevPre  > 0) ? `↓ ${Math.round((row.pre  / prevPre)  * 100)}%` : null
          const postRate = (i > 0 && prevPost > 0) ? `↓ ${Math.round((row.post / prevPost) * 100)}%` : null
          const preBarW  = row.postOnly ? 0 : Math.round((row.pre  / preMax)  * 100)
          const postBarW = Math.round((row.post / postMax) * 100)

          return (
            <div key={row.label}>
              {i > 0 && (preRate || postRate) && (
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 52px 1fr 52px', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <div />
                  <div style={{ fontFamily: 'monospace', fontSize: 8, color: MUTED, paddingLeft: '0.25rem' }}>{preRate ?? ''}</div>
                  <div />
                  <div style={{ fontFamily: 'monospace', fontSize: 8, color: ACCENT, opacity: 0.7, paddingLeft: '0.25rem' }}>{postRate ?? ''}</div>
                  <div />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 52px 1fr 52px', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.08em', color: row.postOnly ? MUTED : DIM }}>
                  {row.label.toUpperCase()}{row.postOnly ? ' *' : ''}
                </div>
                {/* Before bar */}
                <div style={{ background: '#151B3A', height: 6, borderRadius: 1, opacity: row.postOnly ? 0.2 : 1 }}>
                  <div style={{ width: `${preBarW}%`, height: '100%', background: DIM }} />
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: row.postOnly ? MUTED : STAR, textAlign: 'right' }}>
                  {row.postOnly ? '—' : row.pre.toLocaleString()}
                </div>
                {/* After bar */}
                <div style={{ background: '#151B3A', height: 6, borderRadius: 1 }}>
                  <div style={{ width: `${postBarW}%`, height: '100%', background: row.postOnly ? OK_COLOR : ACCENT }} />
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: STAR, textAlign: 'right' }}>
                  {row.post.toLocaleString()}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: '0.75rem', fontFamily: 'monospace', fontSize: 8, color: MUTED }}>
        * Slider Touched 为新增埋点，仅 after 有数据为正常现象。
      </div>
    </div>
  )
}

function RunFunnel({ run, isLatest }: { run: Run; isLatest: boolean }) {
  const allSteps     = [...run.steps].sort((a, b) => a.step_order - b.step_order)
  const trafficRef   = allSteps.find(s => s.step_key === 'homepage_visit')
  const adRef        = allSteps.find(s => AD_REF_KEYS.has(s.step_key))
  const phSteps      = allSteps.filter(s => POSTHOG_KEYS.has(s.step_key))
  const sbSteps      = allSteps.filter(s => SUPABASE_KEYS.has(s.step_key))
  const phMax        = phSteps[0]?.count_all_time || 1
  const sbMax        = sbSteps[0]?.count_all_time || 1
  const startedCount    = phSteps.find(s => s.step_key === 'onboarding_started')?.count_all_time ?? 0
  const emailCount      = sbSteps.find(s => s.step_key === 'onboarding_email_submitted')?.count_all_time ?? 0
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
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: ACCENT, background: 'rgba(232,93,4,0.08)', border: '1px solid rgba(232,93,4,0.25)', padding: '2px 8px' }}>
            LATEST
          </div>
        )}
      </div>

      {/* Traffic reference */}
      {trafficRef && <TrafficRef count={trafficRef.count_all_time} count30d={trafficRef.count_30d} />}

      {/* Ad traffic reference */}
      {adRef && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '0.75rem 1rem', background: '#070c1a', border: `1px solid ${BORDER}`, marginBottom: '0.5rem' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: MUTED }}>
            AD TRAFFIC (utm_source 存在)
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: DIM }}>
            {adRef.count_all_time.toLocaleString()} <span style={{ fontSize: 9, color: MUTED }}>all-time</span>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: MUTED }}>
            {adRef.count_30d.toLocaleString()} <span style={{ fontSize: 9 }}>30d</span>
          </div>
          {phSteps[0]?.count_all_time > 0 && (
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: ACCENT, marginLeft: 'auto' }}>
              占 Started {Math.round((adRef.count_all_time / phSteps[0].count_all_time) * 100)}%
            </div>
          )}
        </div>
      )}

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
          <StepRow key={step.step_key} step={step} prev={sbSteps[i - 1]} maxCount={sbMax} color='#E8A020' />
        ))}
      </div>

      {/* Core conversion rates */}
      <CoreRatesCard started={startedCount} email={emailCount} registered={registeredCount} />

      {/* Before / After slider comparison */}
      <BeforeAfterComparison steps={run.steps} />

      {/* CVR summary */}
      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {phSteps.length >= 2 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED }}>Started→末题完成</div>
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
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#E8A020', fontWeight: 700 }}>
                    {pct(clickedStep.count_all_time, emailStep.count_all_time)}
                  </div>
                </div>
              )}
              {clickedStep && regStep && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED }}>点击→注册完成</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#E8A020', fontWeight: 700 }}>
                    {pct(regStep.count_all_time, clickedStep.count_all_time)}
                  </div>
                </div>
              )}
              {emailStep && regStep && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED }}>Email→注册总转化</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#E8A020', fontWeight: 700 }}>
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

/* ── Single-day funnel: each day's own numbers (not cumulative) ─────────────── */

type DailyFunnel = {
  day: string            // 'YYYY-MM-DD' (UTC)
  homepage: number
  ad: number
  started: number
  q1: number
  q2: number
  slider: number
  q3: number
  email: number
  inviteClicked: number
  registered: number
  loginClicked: number
}

// Last `days` UTC calendar dates, newest first.
function utcDaysBack(days: number): string[] {
  const now = new Date()
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Array.from({ length: days }, (_, i) =>
    new Date(todayUTC - i * 86_400_000).toISOString().slice(0, 10),
  )
}

// Per-day funnel counts straight from source — PostHog grouped by toDate(timestamp)
// (UTC), Supabase tables bucketed by their date columns, invite-link clicks via the
// confirmed_auth_users_by_day RPC. Mirrors the snapshot route's step definitions but
// one row per day instead of one cumulative total.
async function getDailyFunnel(days = 30): Promise<DailyFunnel[]> {
  const supabase = createAdminClient()
  const dayList  = utcDaysBack(days)
  const cutoffISO = `${dayList[dayList.length - 1]}T00:00:00.000Z`

  const [phRows, appRows, regRows, clickedRows] = await Promise.all([
    queryPostHog(`
      SELECT
        toDate(timestamp) AS day,
        count(distinct if(event = '$pageview' AND properties.$pathname = '/', person_id, NULL))           AS homepage,
        count(distinct if(event = 'onboarding_started' AND properties.utm_source IS NOT NULL, person_id, NULL)) AS ad,
        count(distinct if(event = 'onboarding_started', person_id, NULL))                                  AS started,
        count(distinct if(event = 'onboarding_q1_completed', person_id, NULL))                             AS q1,
        count(distinct if(event = 'onboarding_q2_completed', person_id, NULL))                             AS q2,
        count(distinct if(event = 'onboarding_slider_touched', person_id, NULL))                           AS slider,
        count(distinct if(event = 'onboarding_q3_completed', person_id, NULL))                             AS q3,
        count(distinct if(event = 'console_login_clicked', person_id, NULL))                               AS loginClicked
      FROM events
      WHERE toDate(timestamp) >= today() - ${days - 1}
      GROUP BY day
      ORDER BY day DESC
    `),
    // Email submitted = applications (full history, has created_at). Newest-first +
    // explicit high limit: a bare select caps at PostgREST's 1000-row default, which
    // for a 30-day window of thousands of rows silently drops the most recent days.
    supabase.from('applications').select('created_at').gte('created_at', cutoffISO).order('created_at', { ascending: false }).limit(50_000),
    // Registered = completed /register (same 1000-row-default guard)
    supabase.from('voyager_profiles').select('registered_at').not('registered_at', 'is', null).gte('registered_at', cutoffISO).order('registered_at', { ascending: false }).limit(50_000),
    // Invite link clicked = confirmed auth.users, per day (SECURITY DEFINER RPC)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('confirmed_auth_users_by_day', { cutoff: cutoffISO }),
  ])

  const map = new Map<string, DailyFunnel>(
    dayList.map(day => [day, {
      day, homepage: 0, ad: 0, started: 0, q1: 0, q2: 0, slider: 0, q3: 0,
      email: 0, inviteClicked: 0, registered: 0, loginClicked: 0,
    }]),
  )

  // email is sourced from Supabase applications below (full history); registered &
  // inviteClicked likewise come from Supabase — PostHog supplies the rest.
  for (const r of phRows as [string, number, number, number, number, number, number, number, number][]) {
    const row = map.get(String(r[0]))
    if (!row) continue
    row.homepage     = Number(r[1]) || 0
    row.ad           = Number(r[2]) || 0
    row.started      = Number(r[3]) || 0
    row.q1           = Number(r[4]) || 0
    row.q2           = Number(r[5]) || 0
    row.slider       = Number(r[6]) || 0
    row.q3           = Number(r[7]) || 0
    row.loginClicked = Number(r[8]) || 0
  }

  const bucket = (rows: { [k: string]: unknown }[] | null, col: string, field: keyof DailyFunnel) => {
    for (const r of rows ?? []) {
      const ts = r[col]
      if (typeof ts !== 'string') continue
      const row = map.get(new Date(ts).toISOString().slice(0, 10))
      if (row) (row[field] as number) += 1
    }
  }
  bucket(appRows.data, 'created_at',    'email')
  bucket(regRows.data, 'registered_at', 'registered')

  // "Invite Link Clicked" = confirmed auth.users that day, via the SECURITY DEFINER
  // RPC (auth.users isn't reachable through PostgREST). Absent until schema_v52 is
  // applied to prod → rpc returns no data → count stays 0 (graceful).
  for (const r of (clickedRows.data ?? []) as { day: string; cnt: number }[]) {
    const row = map.get(String(r.day).slice(0, 10))
    if (row) row.inviteClicked = Number(r.cnt) || 0
  }

  return dayList.map(day => map.get(day)!)
}

// Reshape one day into the SnapshotRow[] the funnel renderers expect.
function dailyToRun(d: DailyFunnel): Run {
  const mk = (step_key: string, step_label: string, step_order: number, count: number): SnapshotRow =>
    ({ step_key, step_label, step_order, count_all_time: count, count_30d: 0 })
  return {
    run_id: `daily-${d.day}`,
    captured_at: `${d.day}T00:00:00.000Z`,
    version_tag: null,
    steps: [
      mk('homepage_visit',             'Homepage (traffic ref)',  0, d.homepage),
      mk('ad_landing',                 'Ad Landing (utm_source)', 0, d.ad),
      // v3 flow order (since 2026-06-26): started → q1 console → q2 world → slider → q3 urgency
      mk('onboarding_started',         'Onboarding Started',      1, d.started),
      mk('onboarding_q1_completed',    'Q1 · Console',            2, d.q1),
      mk('onboarding_q2_completed',    'Q2 · World',              3, d.q2),
      mk('onboarding_slider_touched',  'Slider Touched',          4, d.slider),
      mk('onboarding_q3_completed',    'Q3 · Urgency',            5, d.q3),
      mk('onboarding_email_submitted', 'Email Submitted',         6, d.email),
      mk('invite_link_clicked',        'Invite Link Clicked',     7, d.inviteClicked),
      mk('registered',                 'Account Registered',      8, d.registered),
      mk('console_login_clicked',      'Returned to Login',       9, d.loginClicked),
    ],
  }
}

function DailyFunnelCard({ rows, selected }: { rows: DailyFunnel[]; selected: string }) {
  const days = rows.map(r => r.day)
  const day  = rows.find(r => r.day === selected) ?? rows[0]
  if (!day) return null

  const run            = dailyToRun(day)
  const allSteps       = [...run.steps].sort((a, b) => a.step_order - b.step_order)
  const trafficRef     = allSteps.find(s => s.step_key === 'homepage_visit')
  const adRef          = allSteps.find(s => AD_REF_KEYS.has(s.step_key))
  const phSteps        = allSteps.filter(s => POSTHOG_KEYS.has(s.step_key))
  const sbSteps        = allSteps.filter(s => SUPABASE_KEYS.has(s.step_key))
  const phMax          = phSteps[0]?.count_all_time || 1
  const sbMax          = sbSteps[0]?.count_all_time || 1
  const startedCount    = phSteps.find(s => s.step_key === 'onboarding_started')?.count_all_time ?? 0
  const emailCount      = sbSteps.find(s => s.step_key === 'onboarding_email_submitted')?.count_all_time ?? 0
  const registeredCount = sbSteps.find(s => s.step_key === 'registered')?.count_all_time ?? 0

  return (
    <div style={{ background: CARD_BG, border: `1px solid ${ACCENT}`, padding: '1.25rem 1.5rem', borderRadius: 2, marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: ACCENT }}>
          单日漏斗 · DAILY FUNNEL
        </div>
        <DaySelector days={days} selected={day.day} />
      </div>

      {trafficRef && <TrafficRef count={trafficRef.count_all_time} count30d={0} hide30d />}

      {adRef && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '0.75rem 1rem', background: '#070c1a', border: `1px solid ${BORDER}`, marginBottom: '0.5rem' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: MUTED }}>
            AD TRAFFIC (utm_source 存在)
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: DIM }}>
            {adRef.count_all_time.toLocaleString()} <span style={{ fontSize: 9, color: MUTED }}>当日</span>
          </div>
          {phSteps[0]?.count_all_time > 0 && (
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: ACCENT, marginLeft: 'auto' }}>
              占 Started {Math.round((adRef.count_all_time / phSteps[0].count_all_time) * 100)}%
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: '#2A3A5A', marginBottom: '0.5rem' }}>
          ONBOARDING INTERACTION · POSTHOG · 当日
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {phSteps.map((step, i) => (
            <StepRow key={step.step_key} step={step} prev={phSteps[i - 1]} maxCount={phMax} hide30d />
          ))}
        </div>
      </div>

      <div style={{ margin: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1, height: 1, background: '#1A2438' }} />
        <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#2A3A5A', letterSpacing: '0.2em' }}>SUPABASE · 当日</div>
        <div style={{ flex: 1, height: 1, background: '#1A2438' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sbSteps.map((step, i) => (
          <StepRow key={step.step_key} step={step} prev={sbSteps[i - 1]} maxCount={sbMax} color='#E8A020' hide30d />
        ))}
      </div>

      <CoreRatesCard started={startedCount} email={emailCount} registered={registeredCount} daily />

      <div style={{ marginTop: '1rem', fontFamily: 'monospace', fontSize: 9, color: MUTED, lineHeight: 1.8 }}>
        {'// 仅显示选中那一天发生的事件（UTC 日历日），与上方 LATEST 累计卡不同。'}<br />
        {'// PostHog 步骤按埋点上线起有数据 · Supabase 步骤为完整历史。'}
      </div>
    </div>
  )
}

/* ── Onboarding before/after: email-capture rate by version (v2 → v3) ────────── */

// waitlist_submitted shipped 2026-06-01 — ~4 days after onboarding_started. Floor
// the comparison here so v2's denominator isn't padded by its early window where
// `started` fired but the email event didn't exist yet. v3 is entirely post-06-26,
// so this floor only trims v2's untracked head, making the two rates comparable.
const EMAIL_EVENT_FLOOR = '2026-06-01 00:00:00'
// The v2 → v3 cutover (3-question flow go-live), for the panel subtitle.
const V3_CUTOVER_LABEL  = '2026-06-26 09:11 UTC'

type VersionCapture = { version: string; started: number; email: number }

// Email-capture rate (waitlist_submitted / onboarding_started) split by the
// onboarding_version event property — the actual treatment, so it's immune to the
// cutover-day mixing that confuses a date-based split. Both events carry the version.
async function getEmailCaptureByVersion(): Promise<VersionCapture[]> {
  const rows = await queryPostHog(`
    SELECT
      properties.onboarding_version AS version,
      count(distinct if(event = 'onboarding_started', person_id, NULL)) AS started,
      count(distinct if(event = 'waitlist_submitted', person_id, NULL)) AS email
    FROM events
    WHERE event IN ('onboarding_started', 'waitlist_submitted')
      AND properties.onboarding_version IN ('v2', 'v3')
      AND timestamp >= '${EMAIL_EVENT_FLOOR}'
    GROUP BY version
    ORDER BY version
  `)
  return (rows as [string, number, number][]).map(r => ({
    version: String(r[0]), started: Number(r[1]) || 0, email: Number(r[2]) || 0,
  }))
}

function EmailCaptureComparison({ rows }: { rows: VersionCapture[] }) {
  const v2 = rows.find(r => r.version === 'v2')
  const v3 = rows.find(r => r.version === 'v3')
  const rateOf = (r?: VersionCapture) => (r && r.started > 0) ? (r.email / r.started) * 100 : null
  const r2 = rateOf(v2)
  const r3 = rateOf(v3)
  const delta = (r2 != null && r3 != null) ? r3 - r2 : null
  const thin  = (v3?.started ?? 0) < 100   // v3 sample still firming up

  const col = (tag: string, tagColor: string, cap: VersionCapture | undefined) => {
    const rate = rateOf(cap)
    return (
      <div style={{ flex: 1, minWidth: 150 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: tagColor, marginBottom: '0.4rem' }}>{tag}</div>
        <div style={{ fontFamily: 'monospace', fontSize: 30, color: rate != null ? STAR : MUTED, fontWeight: 700, lineHeight: 1 }}>
          {rate != null ? `${rate.toFixed(1)}%` : '—'}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, marginTop: '0.4rem' }}>
          {(cap?.email ?? 0).toLocaleString()} 留邮箱 / {(cap?.started ?? 0).toLocaleString()} 进入
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: CARD_BG, border: `1px solid ${ACCENT}`, padding: '1.25rem 1.5rem', borderRadius: 2, marginBottom: '2rem' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: ACCENT, marginBottom: '0.35rem' }}>
        ONBOARDING 改版前后 · 邮箱留资率 (v2 → v3)
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, marginBottom: '1.1rem', lineHeight: 1.7 }}>
        进入流程 → 留邮箱 = waitlist_submitted / onboarding_started，按 onboarding_version 拆分。切换点 {V3_CUTOVER_LABEL}。
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
        {col('BEFORE · v2', DIM, v2)}
        <div style={{ fontFamily: 'monospace', fontSize: 20, color: MUTED, alignSelf: 'center' }}>→</div>
        {col('AFTER · v3', ACCENT, v3)}
        <div style={{ borderLeft: `1px solid ${BORDER}`, paddingLeft: '1.5rem', alignSelf: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, marginBottom: '0.4rem' }}>变化 (pp)</div>
          <div style={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 700, lineHeight: 1, color: delta == null ? MUTED : delta >= 0 ? OK_COLOR : '#D8203A' }}>
            {delta == null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, marginTop: '0.4rem' }}>
            {delta == null ? '待 v3 数据' : delta >= 0 ? '↑ 提升' : '↓ 下降'}
          </div>
        </div>
      </div>

      {thin && (
        <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#E8A020', marginTop: '0.9rem', lineHeight: 1.7 }}>
          {`* v3 样本仍小（${(v3?.started ?? 0).toLocaleString()} 进入），比例尚未稳定——切换点 06-26 当天后满一整天（06-27 起）再看更可靠。`}
        </div>
      )}
    </div>
  )
}

const HISTORY_KEYS   = ['onboarding_started', 'onboarding_q1_completed', 'onboarding_q2_completed', 'onboarding_slider_touched', 'onboarding_q3_completed', 'onboarding_email_submitted', 'invite_link_clicked', 'registered']
const HISTORY_LABELS = ['Started', 'Q1', 'Q2', 'Slider', 'Q3', 'Email', 'Clicked', 'Reg.']

function HistoryTable({ runs }: { runs: Run[] }) {
  if (runs.length < 2) return null

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.3em', color: MUTED, marginBottom: '0.75rem' }}>
        {'// HISTORY — overall CVR (Onboarding Started → Email)'}
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
                <tr key={run.run_id} style={{ background: ri === 0 ? 'rgba(232,93,4,0.03)' : 'transparent' }}>
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

/* ── Recovery cohort: invites that failed to send and are being re-dripped ──── */

type RecoveryRow = {
  submit_date: string
  total: number
  resent: number
  clicked: number
  registered: number
  failed: number
}

async function getRecoveryCohort(): Promise<RecoveryRow[]> {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).rpc('recovery_cohort_stats')
  return (data ?? []) as RecoveryRow[]
}

function RecoveryCohortPanel({ rows }: { rows: RecoveryRow[] }) {
  if (!rows.length) return null

  const sum = (k: keyof RecoveryRow) => rows.reduce((acc, r) => acc + (r[k] as number), 0)
  const total = sum('total')
  const resent = sum('resent')
  const clicked = sum('clicked')
  const registered = sum('registered')
  const failed = sum('failed')
  const pendingLeft = total - resent - failed

  const cols: { key: keyof RecoveryRow; label: string; color: string }[] = [
    { key: 'total',      label: '总数',   color: DIM },
    { key: 'resent',     label: '已补发', color: ACCENT },
    { key: 'clicked',    label: '已点击', color: '#E8A020' },
    { key: 'registered', label: '已注册', color: OK_COLOR },
    { key: 'failed',     label: '失败',   color: '#D8203A' },
  ]

  return (
    <div style={{ marginTop: '2rem', background: CARD_BG, border: `1px solid ${ACCENT}`, padding: '1.25rem 1.5rem', borderRadius: 2 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: ACCENT, marginBottom: '0.4rem' }}>
        INVITE RECOVERY · 失败补发追溯
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: MUTED, marginBottom: '1rem' }}>
        因发送上限失败的邀请，按用户<strong style={{ color: DIM }}>原始提交日期</strong>归集。后续注册仍计回提交日 cohort。
      </div>

      {/* Top-line summary */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {[
          { label: '队列总数', val: total, color: STAR },
          { label: '已补发',   val: resent, color: ACCENT },
          { label: '待发送',   val: pendingLeft, color: DIM },
          { label: '已点击',   val: clicked, color: '#E8A020' },
          { label: '已注册',   val: registered, color: OK_COLOR },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, marginBottom: '0.25rem' }}>{s.label}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 22, color: s.color, fontWeight: 700, lineHeight: 1 }}>
              {s.val.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Per-date breakdown */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 10 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 12px', color: MUTED, letterSpacing: '0.15em', borderBottom: `1px solid ${BORDER}` }}>提交日期</th>
              {cols.map(c => (
                <th key={c.key} style={{ textAlign: 'right', padding: '6px 12px', color: MUTED, letterSpacing: '0.15em', borderBottom: `1px solid ${BORDER}` }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.submit_date}>
                <td style={{ padding: '6px 12px', color: STAR, borderBottom: `1px solid ${BORDER}` }}>
                  {new Date(r.submit_date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                </td>
                {cols.map(c => (
                  <td key={c.key} style={{ textAlign: 'right', padding: '6px 12px', color: (r[c.key] as number) > 0 ? c.color : '#2A3A5A', borderBottom: `1px solid ${BORDER}` }}>
                    {(r[c.key] as number).toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ padding: '6px 12px', color: DIM, fontWeight: 700 }}>合计</td>
              {cols.map(c => (
                <td key={c.key} style={{ textAlign: 'right', padding: '6px 12px', color: c.color, fontWeight: 700 }}>
                  {(sum(c.key) as number).toLocaleString()}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

/* ── Daily logins: new (first-seen) vs returning ───────────────────────────── */

const NEW_COLOR = ACCENT       // 新增登录
const RET_COLOR = '#E8A020'    // 回流登录

type DailyRow = {
  day: string
  newUsers: number
  returningUsers: number
  activeUsers: number
}

// Per-day breakdown of *known users* (anyone who has ever registered or logged in)
// into "new" vs "returning":
//   first_day = the day the user first registered / logged in (their join day).
//   active    = any activity that day (incl. $pageview via a persisted session),
//               restricted to known users — so session revisits without a fresh
//               re-login still count as "returning".
//   new       = active on their join day · returning = active on a later day.
// active = new + returning (pre-join anonymous activity excluded via a.day >= first_day).
async function getDailyActivity(days = 30): Promise<DailyRow[]> {
  const sql = `
    SELECT
      a.day AS day,
      countIf(a.day = f.first_day) AS new_users,
      countIf(a.day > f.first_day) AS returning_users,
      count() AS active_users
    FROM (
      SELECT DISTINCT person_id, toDate(timestamp) AS day
      FROM events
      WHERE toDate(timestamp) >= today() - ${days - 1}
    ) AS a
    INNER JOIN (
      SELECT person_id, min(toDate(timestamp)) AS first_day
      FROM events
      WHERE event IN ('user_logged_in', 'account_registered')
      GROUP BY person_id
    ) AS f ON a.person_id = f.person_id
    WHERE a.day >= f.first_day
    GROUP BY a.day
    ORDER BY a.day ASC
  `
  const rows = await queryPostHog(sql)
  return (rows as [string, number, number, number][]).map(r => ({
    day:            String(r[0]),
    newUsers:       Number(r[1]) || 0,
    returningUsers: Number(r[2]) || 0,
    activeUsers:    Number(r[3]) || 0,
  }))
}

function fmtDay(day: string) {
  // day comes back as 'YYYY-MM-DD'
  const [, m, d] = day.split('-')
  return m && d ? `${m}/${d}` : day
}

function DailyLoginsPanel({ rows }: { rows: DailyRow[] }) {
  const hasData = rows.some(r => r.activeUsers > 0)

  const sum = (arr: DailyRow[], k: 'newUsers' | 'returningUsers' | 'activeUsers') =>
    arr.reduce((acc, r) => acc + r[k], 0)
  const last7  = rows.slice(-7)
  const today  = rows[rows.length - 1]
  const maxActive = Math.max(...rows.map(r => r.activeUsers), 1)

  const kpis = today ? [
    { label: '今日新增',      val: today.newUsers,               color: NEW_COLOR },
    { label: '今日回流',      val: today.returningUsers,         color: RET_COLOR },
    { label: '近7日新增',     val: sum(last7, 'newUsers'),       color: NEW_COLOR },
    { label: '近7日回流',     val: sum(last7, 'returningUsers'), color: RET_COLOR },
  ] : []

  // Most recent day on top
  const chartRows = [...rows].reverse()

  return (
    <div style={{ marginTop: '2rem', background: CARD_BG, border: `1px solid ${ACCENT}`, padding: '1.25rem 1.5rem', borderRadius: 2 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: ACCENT, marginBottom: '0.4rem' }}>
        DAILY LOGINS · 新增 vs 回流
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: MUTED, marginBottom: '1rem' }}>
        每天<strong style={{ color: DIM }}>新增</strong>(当天首次注册/登录) vs <strong style={{ color: DIM }}>回流</strong>(老用户当天有活动，含免登录 session 访问)。
        仅统计注册/登录过的用户，活动含 <code style={{ color: DIM }}>$pageview</code>。来源 PostHog，按埋点上线起累积。
      </div>

      {!hasData ? (
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: MUTED, padding: '0.5rem 0' }}>
          暂无登录数据。确认 PostHog 已配置且站点有登录/注册事件。
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {kpis.map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: MUTED, marginBottom: '0.25rem' }}>{s.label}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 22, color: s.color, fontWeight: 700, lineHeight: 1 }}>
                  {s.val.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 10, height: 10, background: NEW_COLOR, display: 'inline-block', borderRadius: 1 }} />
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: DIM }}>新增</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 10, height: 10, background: RET_COLOR, display: 'inline-block', borderRadius: 1 }} />
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: DIM }}>回流</span>
            </div>
            <div style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 9, color: MUTED }}>
              共 {chartRows.length} 天 · 当日活跃 = 新增 + 回流
            </div>
          </div>

          {/* Per-day stacked bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {chartRows.map((r, i) => (
              <div key={r.day} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: i === 0 ? STAR : DIM, width: 44, flexShrink: 0 }}>
                  {fmtDay(r.day)}
                </div>
                <div style={{ flex: 1, display: 'flex', height: 9, background: '#151B3A', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{ width: `${(r.newUsers / maxActive) * 100}%`, background: NEW_COLOR, transition: 'width 0.4s ease' }} />
                  <div style={{ width: `${(r.returningUsers / maxActive) * 100}%`, background: RET_COLOR, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: NEW_COLOR, width: 32, textAlign: 'right', flexShrink: 0 }}>
                  {r.newUsers}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: RET_COLOR, width: 32, textAlign: 'right', flexShrink: 0 }}>
                  {r.returningUsers}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: STAR, width: 36, textAlign: 'right', flexShrink: 0 }}>
                  {r.activeUsers}
                </div>
              </div>
            ))}
          </div>

          {/* Column key */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.6rem', justifyContent: 'flex-end' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 8, color: NEW_COLOR, width: 32, textAlign: 'right' }}>新</div>
            <div style={{ fontFamily: 'monospace', fontSize: 8, color: RET_COLOR, width: 32, textAlign: 'right' }}>回流</div>
            <div style={{ fontFamily: 'monospace', fontSize: 8, color: STAR, width: 36, textAlign: 'right' }}>活跃</div>
          </div>
        </>
      )}
    </div>
  )
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const [{ day: selectedDay }, [runs, recovery, daily, membership, newsletter, dailyFunnel, versionCapture]] = await Promise.all([
    searchParams,
    Promise.all([
      getLatestRuns(10), getRecoveryCohort(), getDailyActivity(30), getMembershipFunnel(), getNewsletterFunnel(), getDailyFunnel(30), getEmailCaptureByVersion(),
    ]),
  ])
  const selected = dailyFunnel.some(r => r.day === selectedDay) ? selectedDay! : (dailyFunnel[0]?.day ?? '')

  const conversion = (
    <>
      <EmailCaptureComparison rows={versionCapture} />
      {dailyFunnel.length > 0 && <DailyFunnelCard rows={dailyFunnel} selected={selected} />}
      {runs.length === 0 ? (
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: DIM, lineHeight: 2 }}>
            No snapshots yet. Click <span style={{ color: ACCENT }}>CAPTURE NOW</span> to generate the first one.
          </div>
        </div>
      ) : (
        <>
          <RunFunnel run={runs[0]} isLatest={true} />
          <RecoveryCohortPanel rows={recovery} />
          <HistoryTable runs={runs} />
          {runs.length > 1 && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.3em', color: MUTED, marginBottom: '0.75rem' }}>
                {'// PREVIOUS RUNS'}
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
        {'// Tag a version: '}<code style={{ color: ACCENT }}>GET /api/analytics/snapshot?version_tag=v1.2</code><br />
        {'// Cron: daily 09:00 UTC · PostHog (steps 1–4, cookie去重) + Supabase (step 5)'}
      </div>
    </>
  )

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.3em', color: MUTED, marginBottom: '0.5rem' }}>
            {'// FUNNEL & RETENTION'}
          </div>
          <h1 style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: '0.15em', color: STAR, margin: 0 }}>
            ANALYTICS
          </h1>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: MUTED, marginTop: '0.4rem' }}>
            CONVERSION = 转化漏斗 · RETENTION = 每日新增 / 回流
          </div>
        </div>
        <RefreshButton />
      </div>

      <FunnelTabs
        conversion={conversion}
        retention={<DailyLoginsPanel rows={daily} />}
        membership={<><MembershipPanel data={membership} /><NewsletterPanel data={newsletter} /></>}
      />
    </div>
  )
}
