import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { PACK_HTML } from './packHtml'

// Internal review page for the Initial Voyager Pack showcase.
// Access is restricted to Architect and Voyager roles. The page body is only
// rendered (injected into an isolated iframe) after the server-side role check
// passes — non-members are redirected before any content is sent.
export const dynamic = 'force-dynamic'

export default async function VoyagerPackPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/voyager-pack')

  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'architect' && profile.role !== 'voyager')) {
    redirect('/console')
  }

  return (
    <iframe
      title="Initial Voyager Pack"
      srcDoc={PACK_HTML}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 0,
        zIndex: 9999,
        background: '#0A0E27',
      }}
    />
  )
}
