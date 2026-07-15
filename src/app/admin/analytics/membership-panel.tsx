import type { MembershipFunnel, GroupFunnel } from '@/lib/analytics/membership-funnel'

const ACCENT  = '#C84406'
const AMBER   = '#E8A020'
const MUTED   = 'rgba(245,245,245,0.35)'
const DIM     = 'rgba(245,245,245,0.55)'
const STAR    = '#F5F5F5'
const CARD_BG = '#0F1430'
const BORDER  = '#151B3A'
const OK      = '#20D890'

function pct(a: number, b: number) {
  if (!b) return '—'
  return `${Math.round((a / b) * 100)}%`
}

type Stage = { label: string; value: number; color: string; note?: string }

function FunnelColumn({ title, accent, cohort, stages }: {
  title: string; accent: string; cohort: number; stages: Stage[]
}) {
  return (
    <div style={{ flex: 1, minWidth: 280, background: CARD_BG, border: `1px solid ${BORDER}`, borderTop: `2px solid ${accent}`, padding: '1.1rem 1.25rem', borderRadius: 2 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: accent, fontWeight: 700 }}>
          {title}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED }}>
          cohort {cohort.toLocaleString()}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {stages.map((s, i) => {
          const prev = i > 0 ? stages[i - 1].value : 0
          const barW = cohort > 0 ? Math.min(Math.round((s.value / cohort) * 100), 100) : 0
          const stepRate = i > 0 ? pct(s.value, prev) : null
          return (
            <div key={s.label}>
              {i > 0 && (
                <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED, paddingLeft: '0.25rem', marginBottom: '0.2rem' }}>
                  ↓ {stepRate}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', letterSpacing: '0.08em', color: DIM, width: 96, flexShrink: 0 }}>
                  {s.label}
                </div>
                <div style={{ flex: 1, background: '#151B3A', height: 6, borderRadius: 1 }}>
                  <div style={{ width: `${barW}%`, height: '100%', background: s.color, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: STAR, width: 40, textAlign: 'right', flexShrink: 0 }}>
                  {s.value.toLocaleString()}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED, width: 32, textAlign: 'right', flexShrink: 0 }}>
                  {cohort > 0 ? pct(s.value, cohort) : '—'}
                </div>
              </div>
              {s.note && (
                <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED, paddingLeft: '102px', marginTop: '0.15rem' }}>
                  {s.note}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function taskGatedStages(g: GroupFunnel): Stage[] {
  return [
    { label: 'REGISTERED', value: g.cohort,            color: AMBER },
    { label: 'SIGHTING',   value: g.sighting,          color: AMBER, note: '提交世界' },
    { label: 'QUIZ',       value: g.quiz,              color: AMBER, note: '通过测评' },
    { label: 'ELIGIBLE',   value: g.eligible,          color: ACCENT, note: 'sighting + quiz → 可购买' },
    { label: 'PACK VIEW',  value: g.packViews,         color: ACCENT, note: '浏览次数 (事件)' },
    { label: 'CHECKOUT',   value: g.checkoutInitiated, color: ACCENT, note: '点击购买进入付费' },
    { label: 'PAID',       value: g.ordersPaid,        color: OK },
  ]
}

function directStages(g: GroupFunnel): Stage[] {
  return [
    { label: 'REGISTERED', value: g.cohort,            color: ACCENT, note: '无需任务，直接可购买' },
    { label: 'PACK VIEW',  value: g.packViews,         color: ACCENT, note: '浏览次数 (事件)' },
    { label: 'CHECKOUT',   value: g.checkoutInitiated, color: ACCENT, note: '点击购买进入付费' },
    { label: 'PAID',       value: g.ordersPaid,        color: OK },
  ]
}

export function MembershipPanel({ data }: { data: MembershipFunnel }) {
  const taskGated = data.groups.find(g => g.group === 'task_gated')
  const direct    = data.groups.find(g => g.group === 'direct')
  const t = data.totals

  const kpis = [
    { label: 'PACK 浏览 (全部)', val: t.packViews.toLocaleString(),      sub: `30d ${t.packViews30d.toLocaleString()}`, color: ACCENT },
    { label: '付费触发',         val: t.checkoutInitiated.toLocaleString(), sub: 'checkout 进入',                       color: AMBER },
    { label: '订单创建',         val: t.ordersCreated.toLocaleString(),     sub: '达到 Stripe',                         color: AMBER },
    { label: '付费完成',         val: t.ordersPaid.toLocaleString(),        sub: 'status = paid',                      color: OK },
    { label: '营收',             val: `$${(t.revenueCents / 100).toLocaleString()}`, sub: 'paid 累计',                  color: OK },
  ]

  return (
    <div>
      {/* KPI strip */}
      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', background: CARD_BG, border: `1px solid ${BORDER}`, padding: '1.1rem 1.25rem', borderRadius: 2, marginBottom: '1rem' }}>
        {kpis.map(k => (
          <div key={k.label} style={{ minWidth: 96 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED, marginBottom: '0.3rem' }}>{k.label}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 22, color: k.color, fontWeight: 700, lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED, marginTop: '0.3rem' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {!data.packTracked && (
        <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: AMBER, background: 'rgba(232,160,32,0.06)', border: '1px solid rgba(232,160,32,0.2)', padding: '0.6rem 0.9rem', borderRadius: 2, marginBottom: '1rem' }}>
          ⚠ PACK VIEW 暂无数据 — 埋点 <code style={{ color: DIM }}>voyager_pack_viewed</code> 刚上线，外放后开始积累。
        </div>
      )}

      {/* Two-group funnel comparison */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {taskGated && (
          <FunnelColumn title="B · TASK-GATED · 任务解锁" accent={AMBER} cohort={taskGated.cohort} stages={taskGatedStages(taskGated)} />
        )}
        {direct && (
          <FunnelColumn title="A · DIRECT · 直接购买" accent={ACCENT} cohort={direct.cohort} stages={directStages(direct)} />
        )}
      </div>

      <div style={{ marginTop: '1.25rem', fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED, lineHeight: 1.9 }}>
        {'// COHORT = 已注册且已分组的非 Architect 用户（实验内）'}<br />
        {'// SIGHTING/QUIZ/ELIGIBLE = Supabase 实时全量 · PACK VIEW/CHECKOUT = PostHog 事件计数（可能 > 用户数）'}<br />
        {'// PAID = voyager_orders.status = paid · 条形宽度按 cohort 占比，% 为对 cohort 比例，↓ 为上一步转化'}
      </div>
    </div>
  )
}
