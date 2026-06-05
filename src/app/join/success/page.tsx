import Link from 'next/link'
import { getMyProfile } from '@/lib/actions/profile'
import { getMyLatestOrder } from '@/lib/actions/orders'

export const dynamic = 'force-dynamic'

const wrap: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg-base, #0A0E27)',
  color: 'var(--tx-primary, #F5F5F5)',
  fontFamily: 'var(--font-mono, monospace)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 20px',
  textAlign: 'center',
}
const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 440,
  border: '1px solid rgba(255,107,53,0.3)',
  borderRadius: 4,
  background: '#111634',
  padding: '28px 24px',
}
const row: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 13,
  padding: '9px 0',
  borderTop: '1px solid rgba(245,245,245,0.08)',
}
const cta: React.CSSProperties = {
  display: 'inline-block',
  marginTop: 22,
  background: '#FF6B35',
  color: '#0A0E27',
  fontWeight: 700,
  letterSpacing: '0.06em',
  padding: '13px 24px',
  borderRadius: 3,
  textDecoration: 'none',
}

export default async function JoinSuccessPage() {
  const [profile, order] = await Promise.all([getMyProfile(), getMyLatestOrder()])

  // Anonymous Stripe purchaser (no session on this domain yet): the invite email
  // is their way in.
  if (!profile) {
    return (
      <main style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: '0.28em', color: '#FF6B35' }}>
            SIGNAL RECEIVED
          </div>
          <h1 style={{ fontSize: 22, margin: '14px 0 10px' }}>Welcome, Voyager.</h1>
          <p style={{ fontSize: 13, color: 'rgba(245,245,245,0.6)', lineHeight: 1.7 }}>
            Your payment is confirmed and your Initial Voyager Pack is being prepared.
            Check your email to set your password and enter the Collective.
          </p>
        </div>
      </main>
    )
  }

  // member_no / batch_label are newer than the generated Database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = profile as any

  return (
    <main style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 11, letterSpacing: '0.28em', color: '#FF6B35' }}>
          STATUS · ACTIVE
        </div>
        <h1 style={{ fontSize: 22, margin: '14px 0 6px' }}>
          Welcome, {p.display_name}.
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(245,245,245,0.6)', lineHeight: 1.7, margin: 0 }}>
          You are now a Voyager. Your Initial Voyager Pack is being prepared and
          will be mailed to you.
        </p>

        <div style={{ marginTop: 22, textAlign: 'left' }}>
          {p.member_no != null && (
            <div style={row}>
              <span style={{ color: 'rgba(245,245,245,0.5)' }}>Voyager No.</span>
              <span>
                #{String(p.member_no).padStart(3, '0')}
              </span>
            </div>
          )}
          <div style={row}>
            <span style={{ color: 'rgba(245,245,245,0.5)' }}>Batch</span>
            <span>{p.batch_label}</span>
          </div>
          {order && (
            <div style={row}>
              <span style={{ color: 'rgba(245,245,245,0.5)' }}>Pack</span>
              <span style={{ textTransform: 'uppercase', color: '#FF6B35' }}>
                {order.status}
              </span>
            </div>
          )}
        </div>

        <Link href="/voyagers" style={cta}>
          Update your Voyager profile →
        </Link>
      </div>
    </main>
  )
}
