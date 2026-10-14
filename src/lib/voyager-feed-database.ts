import type { Database } from '@/types/database'
import type { FeedEntry } from './voyager-feed'
export type FeedDatabase = { public: Omit<Database['public'], 'Tables' | 'Views'> & { Tables: Database['public']['Tables'] & {
      voyager_feed_entries: {
        Row: Pick<FeedEntry, 'id' | 'author_id' | 'parent_id' | 'body' | 'image_path' | 'created_at' | 'updated_at'> & { creator_id: string }
        Insert: { id: string; author_id: string; creator_id?: string; parent_id?: string | null; body: string; image_path?: string | null }
        Update: { body?: string }
        Relationships: []
      }
      voyager_feed_likes: {
        Row: { entry_id: string; user_id: string; direction: number }
        Insert: { entry_id: string; user_id: string; direction?: number }
        Update: { direction?: number }
        Relationships: []
      }

}; Views: { voyager_feed_view: { Row: FeedEntry; Relationships: [] } } } }
