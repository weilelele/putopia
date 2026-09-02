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
    Row: WorldflowAsset & { storage_path: string | null }
    Insert: Omit<WorldflowAsset, 'created_at'> & {
      created_at?: string
      storage_path: string | null
    }
    Update: Partial<Omit<WorldflowAsset, 'created_at' | 'id' | 'uploaded_by' | 'world_id'>>
    Relationships: []
  }
  signal_task_assets: {
    Row: {
      created_at: string
      display_url: string | null
      id: string
      is_selected: boolean
      media: 'audio' | 'image' | 'video'
      processed_url: string | null
      source_band_name: string | null
      source_channel_name: string | null
    }
    Insert: never
    Update: never
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
