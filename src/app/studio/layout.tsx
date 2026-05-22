import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import type { Database } from '@/types/database'

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/studio')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'var(--color-deep-2)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-mono)',
    }}>
      {/* Header bar */}
      <div style={{
        borderBottom: '1px solid var(--bd-faint)',
        background: 'var(--color-deep)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: 20,
        flexShrink: 0,
      }}>
        <div style={{
          padding: '13px 0',
          fontFamily: 'var(--font-display)',
          fontSize: 11, letterSpacing: '0.35em',
          color: 'var(--color-nucleus)',
        }}>
          MC // STUDIO
        </div>

        <div style={{ width: 1, height: 18, background: 'var(--bd-faint)' }} />

        <div style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--color-star-deep)' }}>
          SOCIAL CONTENT GENERATOR
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--color-star-deep)', opacity: 0.6 }}>
            KNOWLEDGE BASE: SUPABASE
          </div>
          <Link
            href="/console"
            style={{
              fontSize: 9, letterSpacing: '0.18em',
              color: 'var(--color-star-deep)',
              textDecoration: 'none', padding: '4px 10px',
              border: '1px solid var(--bd-faint)',
            }}
          >
            ← CONSOLE
          </Link>
        </div>
      </div>

      {children}
    </div>
  )
}
