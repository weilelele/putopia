import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Singleton — all components share one instance so onAuthStateChange fires correctly
let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
