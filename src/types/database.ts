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
  can_edit_onboarding: boolean  // page-level grant: access to /admin/onboarding-preview without architect
  observation_days: number
  worlds_discovered: number
  batch_label: string         // cohort grouping, e.g. 'Original Batch'
  joined_at: string           // ISO timestamp — set on invite (trigger), NOT on registration
  registered_at: string | null // set when user completes /register (password + display name)
  updated_at: string
  // Applicant task completion timestamps (null = not yet done)
  task_quiz_at:  string | null
  task_intel_at: string | null
  // A/B experiment group (null = not yet assigned)
  experiment_group: 'direct' | 'task_gated' | null
}

export type VoyagerProfileUpdate = Partial<Pick<
  VoyagerProfile,
  | 'display_name' | 'bio' | 'avatar_url' | 'social_x' | 'social_instagram' | 'social_linkedin'
  | 'location' | 'observation_days' | 'worlds_discovered'
  | 'task_quiz_at' | 'task_intel_at' | 'experiment_group'
>>

// ---------- comments ----------
// Persistent comment threads. Generic: one table backs device / intel / world threads.
export type CommentSubjectType = 'device' | 'intel' | 'world'

export type Comment = {
  id: string
  created_at: string
  subject_type: CommentSubjectType
  subject_id: string
  author_id: string | null
  author_name: string
  author_avatar_url: string | null
  body: string
  is_visible: boolean
  parent_id: string | null    // the comment this one replies to; null = top-level
  image_paths: string[]       // up to 3 image URLs attached to this transmission
}

// A profile an architect may impersonate when posting (voyager / architect only).
export type ImpersonatableProfile = {
  id: string
  display_name: string
  avatar_url: string | null
  role: UserRole
}

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
  submission_count: number
  console_interest: string | null   // Q1 — Multiverse Console curiosity (option id)
  join_urgency: number | null       // Q3 — join-urgency slider value (0–5)
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
  console_interest?: string | null
  join_urgency?: number | null
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
export type WorldLifecycle = 'proposed' | 'picked' | 'syncing' | 'stable'

// Who may respond to a world's Signal Dispatch (owner-configurable).
export type WorldVoteScope = 'self' | 'voters' | 'all'

// Public-facing 3-stage lifecycle. The 4 internal enum values above collapse
// into these three stages for display (see worldStage / WORLD_STAGE_META).
export type WorldStage = 'raw' | 'tuning' | 'established'

export function worldStage(state: WorldLifecycle): WorldStage {
  if (state === 'proposed') return 'raw'
  if (state === 'stable') return 'established'
  return 'tuning' // picked | syncing
}

export const WORLD_STAGE_META: Record<WorldStage, { label: string; key: string }> = {
  raw:         { label: 'Initial Vision',    key: 'initial-vision' },
  tuning:      { label: 'Signal Tuning',     key: 'signal-tuning' },
  established: { label: 'Established World',  key: 'established' },
}

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
  lifecycle_state: WorldLifecycle
  vote_scope: WorldVoteScope
  submitted_by: string | null
  submitted_at: string | null
  created_at: string
}

// lifecycle_state / vote_scope / submitted_by / submitted_at have DB defaults — optional on insert
export type WorldInsert = Omit<World, 'created_at' | 'lifecycle_state' | 'vote_scope' | 'submitted_by' | 'submitted_at'> & {
  lifecycle_state?: WorldLifecycle
  vote_scope?: WorldVoteScope
  submitted_by?: string | null
  submitted_at?: string | null
}
export type WorldUpdate = Partial<Pick<
  World,
  'name' | 'name_en' | 'discoverer_id' | 'discoverer_name' | 'discovery_date' |
  'gradient_from' | 'gradient_to' | 'image_path' | 'description' | 'is_verified' |
  'lifecycle_state' | 'vote_scope'
>>

export type WorldImage = {
  id: string
  world_id: string
  url: string
  storage_path: string | null
  caption: string | null
  source: string | null        // 'upload' | 'repost'
  uploaded_by: string | null
  created_at: string
}

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

// ---------- onboarding_variants ----------
// UTM-driven, admin-editable onboarding copy + video.
// match_key '' = default row; variant rows leave inherited fields null.
export type OnboardingVariantRow = {
  id: string
  match_key: string
  label: string
  console_headline: string | null  // Q1 — Multiverse Console curiosity headline
  q1_headline: string | null       // Q3 — join-urgency slider headline (legacy column name)
  q2_headline: string | null       // Q2 — world-choice headline
  affirm_line1: string | null
  affirm_line2: string | null
  cta_invitation: string | null
  cta_label: string | null
  video_url: string | null      // Q1 / base video (also the flow-wide default)
  video_url_q2: string | null   // null = continue Q1's video
  video_url_cta: string | null  // null = continue Q2's video
  sort_order: number
  enabled: boolean
  updated_at: string
}

export type OnboardingVariantInsert = Partial<Omit<OnboardingVariantRow, 'id' | 'updated_at'>>
  & Pick<OnboardingVariantRow, 'match_key' | 'label'>
export type OnboardingVariantUpdate = Partial<Omit<OnboardingVariantRow, 'id' | 'updated_at'>>

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
      activity_events: {
        Row: {
          id: string
          created_at: string
          actor_id: string | null
          actor_name: string
          actor_role: string
          actor_socials: { platform: string; url: string }[]
          event_type: string
          target_id: string | null
          target_title: string | null
          target_image: string | null
          target_href: string | null
          vote_option: string | null
          group_key: string | null
          is_visible: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          actor_id?: string | null
          actor_name: string
          actor_role: string
          actor_socials?: { platform: string; url: string }[]
          event_type: string
          target_id?: string | null
          target_title?: string | null
          target_image?: string | null
          target_href?: string | null
          vote_option?: string | null
          group_key?: string | null
          is_visible?: boolean
        }
        Update: Partial<{
          actor_id: string | null
          actor_name: string
          actor_role: string
          actor_socials: { platform: string; url: string }[]
          event_type: string
          target_id: string | null
          target_title: string | null
          target_image: string | null
          target_href: string | null
          vote_option: string | null
          group_key: string | null
          is_visible: boolean
        }>
        Relationships: []
      }
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
      world_images: {
        Row: WorldImage
        Insert: Omit<WorldImage, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<WorldImage, 'id' | 'created_at'>>
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
      quiz_questions: {
        Row: {
          id: string
          quiz_id: string
          sort_order: number
          prompt: string
          options: { key: string; label: string }[]
          answer_key: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quiz_id?: string
          sort_order: number
          prompt: string
          options: { key: string; label: string }[]
          answer_key: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          quiz_id: string
          sort_order: number
          prompt: string
          options: { key: string; label: string }[]
          answer_key: string
          updated_at: string
        }>
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
