import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import type { Database } from '@/types/database'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()

  // Regular client — verifies the user's session via cookies
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/stories')

  // Service role client — bypasses RLS, can read & write any row
  const admin = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // Try to fetch the profile
  let { data: profile } = await admin
    .from('voyager_profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  // Profile missing → auto-create as architect (first-time admin setup)
  if (!profile) {
    const displayName = user.user_metadata?.display_name
      ?? user.email?.split('@')[0]
      ?? 'Admin'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('voyager_profiles') as any).insert({
      id: user.id,
      display_name: displayName,
      role: 'architect',
    })

    profile = { role: 'architect', display_name: displayName }
  }

  // Profile exists but role isn't architect
  if (profile.role !== 'architect') {
    return (
      <div style={{ background: '#070912', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <div style={{ background: '#111525', border: '1px solid #E83030', padding: '32px', maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ color: '#E83030', fontSize: '12px', letterSpacing: '0.2em', marginBottom: '12px' }}>⊘ ACCESS DENIED</div>
          <div style={{ color: '#8A9AB5', fontSize: '13px', marginBottom: '8px' }}>
            账号 <span style={{ color: '#EDE8DE' }}>{user.email}</span> 当前角色：<span style={{ color: '#EDE8DE' }}>{profile.role}</span>
          </div>
          <div style={{ color: '#4A5570', fontSize: '12px', lineHeight: 1.8 }}>
            在 Supabase SQL Editor 执行：<br />
            <code style={{ color: '#E85A00', fontSize: '11px' }}>
              UPDATE voyager_profiles SET role = &apos;architect&apos; WHERE id = &apos;{user.id}&apos;;
            </code>
          </div>
        </div>
      </div>
    )
  }

  const navItems = [
    { href: '/admin/stories', label: 'STORIES' },
    { href: '/admin/devices', label: 'DEVICES' },
    { href: '/admin/intel',   label: 'INTEL'   },
    { href: '/admin/worlds',  label: 'WORLDS'  },
  ]

  return (
    <div style={{ background: '#070912', minHeight: '100vh', fontFamily: 'monospace' }}>
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

        <nav style={{ display: 'flex' }}>
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

      <style>{`.admin-tab:hover { color: #EDE8DE !important; }`}</style>
    </div>
  )
}
