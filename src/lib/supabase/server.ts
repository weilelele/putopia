import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { hideAnonymousUser } from './anonymous'

/**
 * Anonymous checkout sessions read as logged out (`getUser()` returns no user)
 * unless `allowAnonymous` is set. Only the Initiation purchase path opts in.
 */
export async function createClient({ allowAnonymous = false }: { allowAnonymous?: boolean } = {}) {
  const cookieStore = await cookies()

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — cookie writes are no-ops (middleware handles refresh)
          }
        },
      },
    }
  )
  return allowAnonymous ? client : hideAnonymousUser(client)
}

// Singleton — the service-role client holds no per-user state (no token refresh,
// no session persistence), so it's safe to reuse across requests within a warm
// process. Avoids building a fresh client (and HTTP agent) on every one of the
// 100+ admin-client call sites, which churned connections under ad-traffic spikes.
let adminClient: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createAdminClient() {
  if (!adminClient) {
    adminClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return adminClient
}
