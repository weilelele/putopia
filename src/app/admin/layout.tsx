import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import WikiSyncButton from './WikiSyncButton'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveCard } from '@/components/archive-card'
import { AdminNav } from '@/components/admin-nav'

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
    .select('role, display_name, can_edit_onboarding')
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

    profile = { role: 'architect', display_name: displayName, can_edit_onboarding: true }
  }

  const isArchitect       = profile.role === 'architect'
  // Non-architects granted can_edit_onboarding get a restricted admin: only the
  // onboarding editor (proxy.ts enforces they can't reach other /admin routes).
  const onboardingOnly    = !isArchitect && profile.can_edit_onboarding === true

  // No architect role and no page grant → denied
  if (!isArchitect && !onboardingOnly) {
    return (
      <div className="admin-access-page">
        <ArchiveCard className="admin-access-card">
          <div style={{ color: '#E83030', fontSize: '12px', letterSpacing: '0.2em', marginBottom: '12px' }}>⊘ ACCESS DENIED</div>
          <div style={{ color: 'rgba(245,245,245,0.55)', fontSize: '13px', marginBottom: '8px' }}>
            账号 <span style={{ color: '#F5F5F5' }}>{user.email}</span> 当前角色：<span style={{ color: '#F5F5F5' }}>{profile.role}</span>
          </div>
          <div style={{ color: 'rgba(245,245,245,0.35)', fontSize: '12px', lineHeight: 1.8 }}>
            在 Supabase SQL Editor 执行：<br />
            <code style={{ color: '#C84406', fontSize: 'var(--fs-caption)' }}>
              UPDATE voyager_profiles SET role = &apos;architect&apos; WHERE id = &apos;{user.id}&apos;;
            </code>
          </div>
        </ArchiveCard>
      </div>
    )
  }

  const navItems = onboardingOnly
    ? [{ href: '/admin/onboarding-preview', label: 'ONBOARDING' }]
    : [
        { href: '/admin/stories',     label: 'STORIES'  },
        { href: '/admin/devices',     label: 'DEVICES'  },
        { href: '/admin/device-batches', label: 'BATCHES' },
        { href: '/admin/device-batches/blueprints', label: 'STORY LAB' },
        { href: '/admin/intel',       label: 'INTEL'    },
        { href: '/admin/worlds',      label: 'WORLDS'   },
        { href: '/admin/voyagers',    label: 'VOYAGERS' },
        { href: '/admin/orders',      label: 'ORDERS'   },
        { href: '/admin/mc-config',   label: 'MC CONFIG' },
        { href: '/admin/create-news', label: 'AI NEWS'  },
        { href: '/admin/votes',       label: 'VOTES'    },
        { href: '/admin/quiz',        label: 'QUIZ'     },
        { href: '/admin/signal-tasks', label: 'DISPATCH' },
        { href: '/admin/analytics',   label: 'FUNNEL'   },
        { href: '/admin/activity',    label: 'ACTIVITY' },
        { href: '/admin/onboarding-preview', label: 'ONBOARDING' },
      ]

  return (
    <div className="admin-archive">
      <header className="admin-archive-header">
        <ArchiveBrandHeader className="admin-archive-brand" />
        <div className="admin-archive-meta">
          <span className="admin-archive-badge">ADMIN</span>
          <span className="admin-archive-user">{profile.display_name}</span>
          <WikiSyncButton />
        </div>
      </header>

      <AdminNav items={navItems} />

      <main className="admin-archive-main">
        {children}
      </main>
    </div>
  )
}
