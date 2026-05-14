import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import type { Database } from '@/types/database'

async function getArchitectCheck() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  return profile
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getArchitectCheck()

  if (!profile) redirect('/login?redirect=/admin/stories')
  if (profile.role !== 'architect') redirect('/')

  const navItems = [
    { href: '/admin/stories', label: 'STORIES' },
    { href: '/admin/devices', label: 'DEVICES' },
    { href: '/admin/intel',   label: 'INTEL'   },
    { href: '/admin/worlds',  label: 'WORLDS'  },
  ]

  return (
    <div style={{ background: '#070912', minHeight: '100vh', fontFamily: 'monospace' }}>
      {/* Admin header */}
      <div style={{
        borderBottom: '1px solid #1E2840',
        background: '#0D1020',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
      }}>
        <div style={{ padding: '14px 0', color: '#E85A00', fontSize: '12px', letterSpacing: '0.3em', whiteSpace: 'nowrap' }}>
          PUTOPIA ◆ ADMIN
        </div>

        {/* Tabs */}
        <nav style={{ display: 'flex', gap: '0' }}>
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '14px 20px',
                fontSize: '11px',
                letterSpacing: '0.2em',
                color: '#8A9AB5',
                textDecoration: 'none',
                borderBottom: '2px solid transparent',
                transition: 'color 0.15s',
              }}
              className="admin-tab"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#4A5570' }}>
          {profile.display_name}
        </div>
      </div>

      <main style={{ padding: '28px 24px' }}>
        {children}
      </main>

      <style>{`
        .admin-tab:hover { color: #EDE8DE !important; }
      `}</style>
    </div>
  )
}
