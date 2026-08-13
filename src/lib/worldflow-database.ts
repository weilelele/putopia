import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorldflowAsset, WorldflowWorld } from '@/lib/actions/worldflow'
import type { Database } from '@/types/database'

type WorldflowTables = {
  worldflow_worlds: {
    Row: WorldflowWorld
    Insert: Omit<WorldflowWorld, 'created_at' | 'id' | 'updated_at'> & {
      created_at?: string
      id?: string
      updated_at?: string
    }
    Update: Partial<Omit<WorldflowWorld, 'created_at' | 'id' | 'owner_id'>>
    Relationships: []
  }
  worldflow_assets: {
    Row: WorldflowAsset & { storage_path: string }
    Insert: Omit<WorldflowAsset, 'created_at'> & {
      created_at?: string
      storage_path: string
    }
    Update: Partial<Omit<WorldflowAsset, 'created_at' | 'id' | 'uploaded_by' | 'world_id'>>
    Relationships: []
  }
}

type WorldflowDatabase = {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: Database['public']['Tables'] & WorldflowTables
  }
}

export function asWorldflowAdmin(client: SupabaseClient<Database>) {
  return client as unknown as SupabaseClient<WorldflowDatabase>
}
