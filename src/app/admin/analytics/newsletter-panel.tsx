import type { NewsletterFunnel, NewsletterGroup } from '@/lib/analytics/newsletter-funnel'

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

function FunnelColumn({ title, accent, base, stages }: {
  title: string; accent: string; base: number; stages: Stage[]
}) {
  return (
    <div style={{ flex: 1, minWidth: 280, background: CARD_BG, border: `1px solid ${BORDER}`, borderTop: `2px solid ${accent}`, padding: '1.1rem 1.25rem', borderRadius: 2 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: accent, fontWeight: 700 }}>{title}</div>
        <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED }}>clicked {base.toLocaleString()}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {stages.map((s, i) => {
          const prev = i > 0 ? stages[i - 1].value : 0
          const barW = base > 0 ? Math.min(Math.round((s.value / base) * 100), 100) : 0
          const stepRate = i > 0 ? pct(s.value, prev) : null
          return (
            <div key={s.label}>
              {i > 0 && (
                <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED, paddingLeft: '0.25rem', marginBottom: '0.2rem' }}>↓ {stepRate}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', letterSpacing: '0.08em', color: DIM, width: 96, flexShrink: 0 }}>{s.label}</div>
                <div style={{ flex: 1, background: '#151B3A', height: 6, borderRadius: 1 }}>
                  <div style={{ width: `${barW}%`, height: '100%', background: s.color, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: STAR, width: 40, textAlign: 'right', flexShrink: 0 }}>{s.value.toLocaleString()}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED, width: 32, textAlign: 'right', flexShrink: 0 }}>{base > 0 ? pct(s.value, base) : '—'}</div>
              </div>
              {s.note && (
                <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED, paddingLeft: '102px', marginTop: '0.15rem' }}>{s.note}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function stages(g: NewsletterGroup): Stage[] {
  return [
    { label: 'CLICKED',   value: g.clicked,           color: '#378ADD', note: '点开邮件链接进站' },
    { label: 'PACK VIEW', value: g.packViews,         color: ACCENT,    note: '浏览 Voyager Pack' },
    { label: 'CHECKOUT',  value: g.checkoutInitiated, color: ACCENT,    note: '进入付费' },
    { label: 'PAID',      value: g.ordersPaid,        color: OK },
  ]
}

export function NewsletterPanel({ data }: { data: NewsletterFunnel }) {
  const taskGated = data.groups.find(g => g.group === 'task_gated')
  const direct    = data.groups.find(g => g.group === 'direct')
  const t = data.totals
  const convRate = t.clicked > 0 ? pct(t.ordersPaid, t.clicked) : '—'

  const kpis = [
    { label: '邮件点击', val: t.clicked.toLocaleString(),            sub: 'utm_source=newsletter', color: '#378ADD' },
    { label: 'PACK 浏览', val: t.packViews.toLocaleString(),          sub: '点击者中',              color: ACCENT },
    { label: '付费触发',  val: t.checkoutInitiated.toLocaleString(),  sub: 'checkout 进入',         color: AMBER },
    { label: '付费完成',  val: t.ordersPaid.toLocaleString(),         sub: `转化率 ${convRate}`,    color: OK },
    { label: '营收',      val: `$${(t.revenueCents / 100).toLocaleString()}`, sub: '邮件归因',       color: OK },
  ]

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', letterSpacing: '0.3em', color: MUTED, marginBottom: '0.75rem' }}>
        {'// NEWSLETTER 归因 — 邮件带来的点击 → 转化（与自然访问分开）'}
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', background: CARD_BG, border: `1px solid ${BORDER}`, padding: '1.1rem 1.25rem', borderRadius: 2, marginBottom: '1rem' }}>
        {kpis.map(k => (
          <div key={k.label} style={{ minWidth: 96 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED, marginBottom: '0.3rem' }}>{k.label}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 22, color: k.color, fontWeight: 700, lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED, marginTop: '0.3rem' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {!data.tracked && (
        <div style={{ fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: AMBER, background: 'rgba(232,160,32,0.06)', border: '1px solid rgba(232,160,32,0.2)', padding: '0.6rem 0.9rem', borderRadius: 2, marginBottom: '1rem' }}>
          ⚠ 暂无邮件点击数据 — 收件人点开链接后(带 <code style={{ color: DIM }}>utm_source=newsletter</code>)开始积累；PostHog 有延迟。
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {taskGated && <FunnelColumn title="B · TASK-GATED · 任务解锁" accent={AMBER} base={taskGated.clicked} stages={stages(taskGated)} />}
        {direct    && <FunnelColumn title="A · DIRECT · 直接购买"     accent={ACCENT} base={direct.clicked}    stages={stages(direct)} />}
      </div>

      <div style={{ marginTop: '1.25rem', fontFamily: 'monospace', fontSize: 'var(--fs-caption)', color: MUTED, lineHeight: 1.9 }}>
        {'// CLICKED = 有 utm_source=newsletter 的 $pageview 的去重用户（PostHog，按 utm_content 分 A/B）'}<br />
        {'// PACK VIEW / CHECKOUT = 点击者中触发对应事件的去重用户 · PAID = 点击者中的 voyager_orders.status=paid'}<br />
        {'// 与「付费转化」主漏斗的区别：这里只统计从邮件点进来的人，自然访问不计入。打开率请看 Resend 后台 broadcast 页。'}
      </div>
    </div>
  )
}
