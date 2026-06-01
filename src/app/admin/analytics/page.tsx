import { createAdminClient } from '@/lib/supabase/server'
import { RefreshButton } from './refresh-button'

// ── Style tokens ──────────────────────────────────────────────────────────────
const ACCENT  = '#E85A00'
const MUTED   = '#4A5570'
const DIM     = '#8A9AB5'
const STAR    = '#EDE8DE'
const CARD_BG = '#0D1020'
const BORDER  = '#1E2840'
const OK      = '#20D890'
const CYAN    = '#22D4E0'

// ── Types ─────────────────────────────────────────────────────────────────────
type DayStats = {
  date: string
  started: number
  q1: number
  q2: number
  email: number
  invite_sent: number
  invite_clicked: number
  registered: number
}

type SbTotals = {
  email: number
  invite_sent: number
  invite_clicked: number
  registered: number
}

// ── PostHog helper ────────────────────────────────────────────────────────────
async function queryPostHog(sql: string): Promise<unknown[][]> {
  const apiKey   = process.env.POSTHOG_PERSONAL_API_KEY
  const project  = process.env.POSTHOG_PROJECT_ID
  const apiHost  = process.env.POSTHOG_API_HOST ?? 'https://us.posthog.com'
  if (!apiKey || !project) return []
  try {
    const res = await fetch(`${apiHost}/api/projects/${project}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.results ?? []
  } catch {
    return []
  }
}

const PH_EVENTS = `'onboarding_started','onboarding_q1_completed','onboarding_q2_completed','onboarding_email_submitted','console_login_clicked'`

function utmClause(utm: string) {
  const safe = utm.replace(/'/g, "''")
  return `AND person_id IN (
    SELECT DISTINCT person_id FROM events
    WHERE event = 'onboarding_started' AND properties.utm_source = '${safe}'
  )`
}

async function getUTMSources(): Promise<string[]> {
  const rows = await queryPostHog(`
    SELECT DISTINCT properties.utm_source
    FROM events
    WHERE event = 'onboarding_started'
      AND properties.utm_source IS NOT NULL
      AND properties.utm_source != ''
    LIMIT 20
  `)
  return (rows as [string][]).map(r => r[0]).filter(Boolean).sort()
}

// Returns Map<date 'YYYY-MM-DD', Map<eventName, count>>
async function getPostHogDailyData(days: number, utm: string | null) {
  const filter = utm ? utmClause(utm) : ''
  const rows = await queryPostHog(`
    SELECT toDate(timestamp) AS day, event, count(DISTINCT person_id) AS cnt
    FROM events
    WHERE event IN (${PH_EVENTS})
      AND toDate(timestamp) >= today() - ${days}
      ${filter}
    GROUP BY day, event
    ORDER BY day DESC, event
  `)
  const map = new Map<string, Map<string, number>>()
  for (const r of rows as [string, string, number][]) {
    if (!map.has(r[0])) map.set(r[0], new Map())
    map.get(r[0])!.set(r[1], Number(r[2]))
  }
  return map
}

// Returns Map<eventName, all-time count>
async function getPostHogAllTime(utm: string | null) {
  const filter = utm ? utmClause(utm) : ''
  const rows = await queryPostHog(`
    SELECT event, count(DISTINCT person_id) AS cnt
    FROM events
    WHERE event IN (${PH_EVENTS})
      ${filter}
    GROUP BY event
  `)
  const map = new Map<string, number>()
  for (const [ev, cnt] of rows as [string, number][]) map.set(ev, Number(cnt))
  return map
}

// Returns Map<date, per-day Supabase counts>
async function getSupabaseDailyData(days: number): Promise<Map<string, SbTotals>> {
  const supabase = createAdminClient()
  const cutoff   = new Date(Date.now() - days * 86_400_000).toISOString()

  const [{ data: apps }, { data: profiles }, clickedRes] = await Promise.all([
    supabase.from('applications').select('created_at').gte('created_at', cutoff),
    supabase.from('voyager_profiles').select('joined_at, registered_at').neq('role', 'architect').gte('joined_at', cutoff),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('count_confirmed_auth_users_by_day', { days_back: days }),
  ])

  const byDate = new Map<string, SbTotals>()
  const ensure = (d: string) => {
    if (!byDate.has(d)) byDate.set(d, { email: 0, invite_sent: 0, invite_clicked: 0, registered: 0 })
    return byDate.get(d)!
  }

  for (const a of (apps ?? [])) ensure(a.created_at.slice(0, 10)).email++
  for (const p of (profiles ?? [])) {
    ensure(p.joined_at.slice(0, 10)).invite_sent++
    if (p.registered_at) ensure(p.registered_at.slice(0, 10)).registered++
  }
  if (Array.isArray(clickedRes?.data)) {
    for (const { day, cnt } of clickedRes.data as { day: string; cnt: number }[]) {
      ensure(day).invite_clicked = Number(cnt)
    }
  }
  return byDate
}

async function getSupabaseAllTime(): Promise<SbTotals> {
  const supabase = createAdminClient()
  const [
    { count: email },
    { count: invite_sent },
    { count: registered },
    { data: invite_clicked },
  ] = await Promise.all([
    supabase.from('applications').select('*', { count: 'exact', head: true }),
    supabase.from('voyager_profiles').select('*', { count: 'exact', head: true }).neq('role', 'architect'),
    supabase.from('voyager_profiles').select('*', { count: 'exact', head: true }).not('registered_at', 'is', null),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('count_confirmed_auth_users'),
  ])
  return {
    email:          email ?? 0,
    invite_sent:    invite_sent ?? 0,
    registered:     registered ?? 0,
    invite_clicked: (invite_clicked as number | null) ?? 0,
  }
}

function buildDayStats(
  phData: Map<string, Map<string, number>>,
  sbData: Map<string, SbTotals>,
  days: number,
): DayStats[] {
  const result: DayStats[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
    const ph   = phData.get(date)
    const sb   = sbData.get(date) ?? { email: 0, invite_sent: 0, invite_clicked: 0, registered: 0 }
    result.push({
      date,
      started:        ph?.get('onboarding_started') ?? 0,
      q1:             ph?.get('onboarding_q1_completed') ?? 0,
      q2:             ph?.get('onboarding_q2_completed') ?? 0,
      email:          Math.max(ph?.get('onboarding_email_submitted') ?? 0, sb.email),
      invite_sent:    sb.invite_sent,
      invite_clicked: sb.invite_clicked,
      registered:     sb.registered,
    })
  }
  return result
}

function pct(a: number, b: number) {
  if (!b) return '—'
  return `${Math.round((a / b) * 100)}%`
}

// ── UTM filter pills ──────────────────────────────────────────────────────────
function UTMFilter({ sources, current }: { sources: string[]; current: string | null }) {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 8, color: MUTED, letterSpacing: '0.2em' }}>SOURCE</span>
      {[null, ...sources].map(s => {
        const active = s === current
        return (
          <a
            key={s ?? '_all_'}
            href={s ? `?utm=${encodeURIComponent(s)}` : '?'}
            style={{
              fontFamily: 'monospace',
              fontSize: 8,
              letterSpacing: '0.15em',
              padding: '2px 8px',
              border: `1px solid ${active ? ACCENT : BORDER}`,
              color: active ? ACCENT : DIM,
              background: active ? 'rgba(232,90,0,0.08)' : 'transparent',
              textDecoration: 'none',
            }}
          >
            {s?.toUpperCase() ?? 'ALL'}
          </a>
        )
      })}
    </div>
  )
}

// ── Today card ────────────────────────────────────────────────────────────────
function TodayCard({ row }: { row: DayStats }) {
  const cells: { label: string; val: number; color: string }[] = [
    { label: 'STARTED',  val: row.started,        color: ACCENT },
    { label: 'Q1',       val: row.q1,             color: ACCENT },
    { label: 'Q2',       val: row.q2,             color: ACCENT },
    { label: 'EMAIL',    val: row.email,           color: STAR   },
    { label: 'SENT',     val: row.invite_sent,     color: CYAN   },
    { label: 'CLICKED',  val: row.invite_clicked,  color: CYAN   },
    { label: 'REG',      val: row.registered,      color: OK     },
  ]
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${ACCENT}`, padding: '1rem 1.25rem', borderRadius: 2 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: ACCENT, marginBottom: '0.75rem' }}>
        TODAY · {row.date} (UTC)
      </div>
      <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap' }}>
        {cells.map(({ label, val, color }) => (
          <div key={label}>
            <div style={{ fontFamily: 'monospace', fontSize: 8, color: MUTED, letterSpacing: '0.2em', marginBottom: '0.2rem' }}>
              {label}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 24, color: val ? color : MUTED, fontWeight: 700, lineHeight: 1 }}>
              {val || '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Daily table ───────────────────────────────────────────────────────────────
type ColDef = { label: string; key: keyof Omit<DayStats, 'date'>; sb: boolean }
const COLS: ColDef[] = [
  { label: 'STARTED',  key: 'started',        sb: false },
  { label: 'Q1',       key: 'q1',             sb: false },
  { label: 'Q2',       key: 'q2',             sb: false },
  { label: 'EMAIL',    key: 'email',           sb: false },
  { label: 'SENT',     key: 'invite_sent',     sb: true  },
  { label: 'CLICKED',  key: 'invite_clicked',  sb: true  },
  { label: 'REG',      key: 'registered',      sb: true  },
]

function DailyTable({ rows, utmActive }: { rows: DayStats[]; utmActive: boolean }) {
  const th = (label: string, right = false, color = MUTED) => ({
    textAlign: right ? 'right' as const : 'left' as const,
    padding: '5px 10px',
    color,
    letterSpacing: '0.12em',
    borderBottom: `1px solid ${BORDER}`,
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 400,
  })

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th('DATE')}>DATE</th>
            {COLS.map(c => (
              <th key={c.key} style={th(c.label, true, utmActive && c.sb ? '#2A3A5A' : MUTED)}>
                {c.label}
              </th>
            ))}
            <th style={th('CVR', true, ACCENT)}>CVR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.date}>
              <td style={{ padding: '5px 10px', color: DIM, borderBottom: `1px solid ${BORDER}`, fontFamily: 'monospace', fontSize: 10 }}>
                {row.date.slice(5)}
              </td>
              {COLS.map(c => {
                const v = row[c.key]
                return (
                  <td key={c.key} style={{ textAlign: 'right', padding: '5px 10px', borderBottom: `1px solid ${BORDER}`, fontFamily: 'monospace', fontSize: 10, color: utmActive && c.sb ? '#2A3A5A' : v ? STAR : MUTED }}>
                    {v || '—'}
                  </td>
                )
              })}
              <td style={{ textAlign: 'right', padding: '5px 10px', borderBottom: `1px solid ${BORDER}`, fontFamily: 'monospace', fontSize: 10, color: ACCENT, fontWeight: 600 }}>
                {pct(row.email, row.started)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {utmActive && (
        <div style={{ fontFamily: 'monospace', fontSize: 8, color: MUTED, marginTop: '0.5rem' }}>
          * SENT / CLICKED / REG 来自 Supabase，不支持 UTM 过滤，显示全量数据
        </div>
      )}
    </div>
  )
}

// ── All-time funnel ───────────────────────────────────────────────────────────
function AllTimeFunnel({
  phAll,
  sbAll,
  utmActive,
}: {
  phAll: Map<string, number>
  sbAll: SbTotals
  utmActive: boolean
}) {
  const started   = phAll.get('onboarding_started') ?? 0
  const q1        = phAll.get('onboarding_q1_completed') ?? 0
  const q2        = phAll.get('onboarding_q2_completed') ?? 0
  const phEmail   = phAll.get('onboarding_email_submitted') ?? 0
  const email     = utmActive ? phEmail : Math.max(phEmail, sbAll.email)
  const consoleLg = phAll.get('console_login_clicked') ?? 0

  type Step = { label: string; val: number; color: string; sb: boolean }
  const steps: Step[] = [
    { label: 'Onboarding Started', val: started,              color: ACCENT, sb: false },
    { label: 'Q1 Completed',       val: q1,                   color: ACCENT, sb: false },
    { label: 'Q2 Completed',       val: q2,                   color: ACCENT, sb: false },
    { label: 'Email Submitted',    val: email,                color: STAR,   sb: false },
    { label: 'Invite Sent',        val: sbAll.invite_sent,    color: CYAN,   sb: true  },
    { label: 'Invite Clicked',     val: sbAll.invite_clicked, color: CYAN,   sb: true  },
    { label: 'Registered',         val: sbAll.registered,     color: OK,     sb: true  },
  ]
  const maxVal = steps[0]?.val || 1

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {steps.map((step, i) => {
          const prev = steps[i - 1]
          const crossSource = prev && step.sb !== prev.sb
          const rate = !crossSource && prev ? pct(step.val, prev.val) : null
          const barW = Math.min(Math.round((step.val / maxVal) * 100), 100)
          const dim  = utmActive && step.sb

          return (
            <div key={step.label} style={{ opacity: dim ? 0.4 : 1 }}>
              {prev && (
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: rate ? MUTED : BORDER, paddingLeft: '0.5rem', marginBottom: '0.2rem' }}>
                  {rate ? `↓ ${rate}` : '↓'}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: DIM, width: 170, flexShrink: 0, letterSpacing: '0.1em' }}>
                  {step.label.toUpperCase()}
                </div>
                <div style={{ flex: 1, background: '#111525', height: 5, borderRadius: 1 }}>
                  <div style={{ width: `${barW}%`, height: '100%', background: step.color }} />
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 14, color: STAR, width: 64, textAlign: 'right', flexShrink: 0, fontWeight: 700 }}>
                  {step.val.toLocaleString()}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary metrics */}
      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 8, color: MUTED, letterSpacing: '0.15em' }}>OVERALL CVR</div>
          <div style={{ fontFamily: 'monospace', fontSize: 20, color: ACCENT, fontWeight: 700, lineHeight: 1.2 }}>
            {pct(email, started)}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 8, color: MUTED }}>Started → Email</div>
        </div>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 8, color: MUTED, letterSpacing: '0.15em' }}>EMAIL DELIVERY</div>
          <div style={{ fontFamily: 'monospace', fontSize: 20, color: CYAN, fontWeight: 700, lineHeight: 1.2 }}>
            {pct(sbAll.invite_sent, sbAll.email)}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 8, color: MUTED }}>Submitted → Sent</div>
        </div>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 8, color: MUTED, letterSpacing: '0.15em' }}>SENT → REG</div>
          <div style={{ fontFamily: 'monospace', fontSize: 20, color: OK, fontWeight: 700, lineHeight: 1.2 }}>
            {pct(sbAll.registered, sbAll.invite_sent)}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 8, color: MUTED }}>Invite Sent → Registered</div>
        </div>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 8, color: MUTED, letterSpacing: '0.15em' }}>RETENTION</div>
          <div style={{ fontFamily: 'monospace', fontSize: 20, color: CYAN, fontWeight: 700, lineHeight: 1.2 }}>
            {consoleLg.toLocaleString()}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 8, color: MUTED }}>
            Console logins · 回归率 {pct(consoleLg, sbAll.registered)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ utm?: string }>
}) {
  const { utm: utmRaw } = await searchParams
  const utmSource = utmRaw?.trim() || null
  const DAYS = 15 // today + 14 previous days

  const [phDaily, sbDaily, phAllTime, sbAllTime, utmSources] = await Promise.all([
    getPostHogDailyData(DAYS, utmSource),
    getSupabaseDailyData(DAYS),
    getPostHogAllTime(utmSource),
    getSupabaseAllTime(),
    getUTMSources(),
  ])

  const allDays   = buildDayStats(phDaily, sbDaily, DAYS)
  const todayRow  = allDays[0]
  const pastRows  = allDays.slice(1)

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.3em', color: MUTED, marginBottom: '0.4rem' }}>
            // ONBOARDING FUNNEL
          </div>
          <h1 style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: '0.15em', color: STAR, margin: 0 }}>
            CONVERSION FUNNEL
          </h1>
          <UTMFilter sources={utmSources} current={utmSource} />
        </div>
        <RefreshButton />
      </div>

      {/* Today */}
      {todayRow && (
        <div style={{ marginBottom: '1rem' }}>
          <TodayCard row={todayRow} />
        </div>
      )}

      {/* Daily breakdown */}
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, padding: '1rem 1.25rem', borderRadius: 2, marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: MUTED, marginBottom: '0.75rem' }}>
          // DAILY · PREVIOUS {DAYS - 1} DAYS (UTC)
        </div>
        <DailyTable rows={pastRows} utmActive={!!utmSource} />
      </div>

      {/* All-time */}
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, padding: '1rem 1.25rem', borderRadius: 2 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.25em', color: MUTED, marginBottom: '1rem' }}>
          // ALL-TIME TOTALS{utmSource ? ` · UTM SOURCE: ${utmSource.toUpperCase()}` : ''}
        </div>
        <AllTimeFunnel phAll={phAllTime} sbAll={sbAllTime} utmActive={!!utmSource} />
      </div>

      <div style={{ marginTop: '1.5rem', fontFamily: 'monospace', fontSize: 8, color: MUTED, lineHeight: 2 }}>
        // Snapshot: <code style={{ color: ACCENT }}>GET /api/analytics/snapshot?version_tag=v1.x</code><br />
        // Cron: daily 09:00 UTC · SENT/CLICKED/REG from Supabase (not UTM-filtered) · INVITE SENT = voyager_profiles.joined_at
      </div>
    </div>
  )
}
