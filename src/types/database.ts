// Auto-generated types matching the Supabase schema.
// Keep in sync with supabase/schema.sql and supabase/schema_v2.sql

export type UserRole = 'guest' | 'applicant' | 'voyager' | 'architect'
export type VoteType = 'single' | 'multi'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'
export type DeviceStatus = 'available' | 'in_use' | 'needs_repair' | 'unknown'
export type DeviceKnowledge = 'known' | 'unknown'
export type IntelTag = 'NOTICE' | 'DEVICE' | 'ORG'

// ---------- voyager_profiles ----------
// Must be `type` (not `interface`) so it satisfies Record<string, unknown> in conditional checks
export type VoyagerProfile = {
  id: string                  // references auth.users
  display_name: string
  bio: string | null
  avatar_url: string | null
  social_x: string | null
  social_instagram: string | null
  social_linkedin: string | null
  location: string | null
  role: UserRole
  observation_days: number
  worlds_discovered: number
  joined_at: string           // ISO timestamp — set on invite (trigger), NOT on registration
  registered_at: string | null // set when user completes /register (password + display name)
  updated_at: string
}

export type VoyagerProfileUpdate = Partial<Pick<
  VoyagerProfile,
  | 'display_name' | 'bio' | 'avatar_url' | 'social_x' | 'social_instagram' | 'social_linkedin'
  | 'location' | 'observation_days' | 'worlds_discovered'
>>

// ---------- votes ----------
export type VoteOption = {
  id: string
  label: string
}

export type Vote = {
  id: string
  title: string
  description: string | null
  type: VoteType
  scope: UserRole[]           // array of roles allowed to participate
  options: VoteOption[]
  is_active: boolean
  created_by: string | null   // voyager_profile id
  created_at: string
  ends_at: string | null
}

export type VoteInsert = Omit<Vote, 'id' | 'created_at'>

// ---------- vote_responses ----------
export type VoteResponse = {
  id: string
  vote_id: string
  user_id: string | null      // null for anonymous public votes
  anon_token: string | null   // browser fingerprint for public votes
  selected_options: string[]  // array of VoteOption ids
  voter_name: string | null   // denormalized display_name from voyager_profiles
  created_at: string
}

export type VoteResponseInsert = Omit<VoteResponse, 'id' | 'created_at'>

// ---------- applications ----------
export type Application = {
  id: string
  name: string
  email: string
  location: string | null
  reason: string
  status: ApplicationStatus
  created_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  fbclid: string | null
  landing_page_variant: string | null
}

export type ApplicationInsert = Pick<Application, 'email' | 'reason'> & {
  name?: string
  location?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  fbclid?: string | null
  landing_page_variant?: string | null
}

// ---------- devices ----------
export type Device = {
  id: string
  name: string
  batch_id: string | null
  knowledge: DeviceKnowledge
  location: string
  description: string
  image_path: string | null
  status: DeviceStatus | null
  current_user_id: string | null
  current_user_name: string | null
  exploration_progress: number
  created_at: string
  updated_at: string
}

export type DeviceInsert = Omit<Device, 'created_at' | 'updated_at'>
export type DeviceUpdate = Partial<Pick<
  Device,
  'name' | 'batch_id' | 'knowledge' | 'location' | 'description' | 'image_path' |
  'status' | 'current_user_id' | 'current_user_name' | 'exploration_progress'
>>

// ---------- worlds ----------
export type World = {
  id: string
  name: string
  name_en: string
  discoverer_id: string | null
  discoverer_name: string
  discovery_date: string      // ISO date (YYYY-MM-DD)
  gradient_from: string
  gradient_to: string
  image_path: string | null   // uploaded world image (optional)
  description: string
  is_verified: boolean
  created_at: string
}

export type WorldInsert = Omit<World, 'created_at'>
export type WorldUpdate = Partial<Pick<
  World,
  'name' | 'name_en' | 'discoverer_id' | 'discoverer_name' | 'discovery_date' |
  'gradient_from' | 'gradient_to' | 'image_path' | 'description' | 'is_verified'
>>

// ---------- intel ----------
export type Intel = {
  id: string
  title: string
  content: string
  timestamp: string           // ISO timestamp
  tag: IntelTag
  classified: boolean
  images: string[]            // array of public storage URLs
  publisher_name: string | null
  publisher_id: string | null // references voyager_profiles.id
  created_by: string | null
  created_at: string
}

export type IntelInsert = Omit<Intel, 'created_at'>
export type IntelUpdate = Partial<Pick<Intel,
  'title' | 'content' | 'timestamp' | 'tag' | 'classified' |
  'images' | 'publisher_name' | 'publisher_id'
>>

// ---------- mc_functions ----------
export type McFunctionStatus = 'active' | 'in_development' | 'unknown'

export type McFunction = {
  id: string
  name: string
  status: McFunctionStatus
  sort_order: number
  created_at: string
}

export type McFunctionInsert = Omit<McFunction, 'id' | 'created_at'>
export type McFunctionUpdate = Partial<Pick<McFunction, 'name' | 'status' | 'sort_order'>>

// ---------- stories ----------
export type Story = {
  id: string                  // URL-safe slug
  title: string
  author_id: string | null
  author_name: string
  date: string                // ISO date (YYYY-MM-DD)
  tags: string[]
  excerpt: string
  content: string
  youtube_id: string | null   // YouTube video ID (e.g. "dQw4w9WgXcQ")
  is_published: boolean
  created_at: string
  updated_at: string
}

export type StoryWithAvatar = Story & { author_avatar_url: string | null }
export type IntelWithAvatar = Intel & { publisher_avatar_url: string | null }

export type StoryInsert = Omit<Story, 'created_at' | 'updated_at'>
export type StoryUpdate = Partial<Pick<
  Story,
  'title' | 'author_id' | 'author_name' | 'date' | 'tags' | 'excerpt' | 'content' | 'youtube_id' | 'is_published'
>>

// ---------- Supabase Database shape (for createClient generic) ----------
export type Database = {
  public: {
    Tables: {
      voyager_profiles: {
        Row: VoyagerProfile
        Insert: Omit<VoyagerProfile, 'joined_at' | 'registered_at' | 'updated_at'>
        Update: VoyagerProfileUpdate
        Relationships: []
      }
      votes: {
        Row: Vote
        Insert: VoteInsert
        Update: Partial<VoteInsert>
        Relationships: []
      }
      vote_responses: {
        Row: VoteResponse
        Insert: VoteResponseInsert
        Update: Record<string, never>
        Relationships: []
      }
      applications: {
        Row: Application
        Insert: ApplicationInsert
        Update: Partial<Pick<Application, 'status' | 'reviewed_by' | 'reviewed_at'>>
        Relationships: []
      }
      devices: {
        Row: Device
        Insert: DeviceInsert
        Update: DeviceUpdate
        Relationships: []
      }
      worlds: {
        Row: World
        Insert: WorldInsert
        Update: WorldUpdate
        Relationships: []
      }
      intel: {
        Row: Intel
        Insert: IntelInsert
        Update: IntelUpdate
        Relationships: []
      }
      stories: {
        Row: Story
        Insert: StoryInsert
        Update: StoryUpdate
        Relationships: []
      }
      funnel_snapshots: {
        Row: {
          id: string
          run_id: string
          captured_at: string
          version_tag: string | null
          step_key: string
          step_label: string
          step_order: number
          count_all_time: number
          count_30d: number
        }
        Insert: {
          run_id: string
          captured_at?: string
          version_tag?: string | null
          step_key: string
          step_label: string
          step_order: number
          count_all_time: number
          count_30d: number
        }
        Update: Partial<{
          version_tag: string | null
          count_all_time: number
          count_30d: number
        }>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      vote_type: VoteType
      application_status: ApplicationStatus
      device_status: DeviceStatus
      device_knowledge: DeviceKnowledge
      intel_tag: IntelTag
    }
    CompositeTypes: Record<string, never>
  }
}
