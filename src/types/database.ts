// Auto-generated types matching the Supabase schema.
// Keep in sync with supabase/schema.sql

export type UserRole = 'guest' | 'applicant' | 'voyager' | 'architect'
export type VoteScope = 'public' | 'applicant' | 'voyager' | 'architect'
export type VoteType = 'single' | 'multi'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'
export type DeviceStatus = 'available' | 'in_use' | 'needs_repair' | 'unknown'
export type DeviceKnowledge = 'known' | 'unknown'

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
  joined_at: string           // ISO timestamp
  updated_at: string
}

export type VoyagerProfileUpdate = Partial<Pick<
  VoyagerProfile,
  'display_name' | 'bio' | 'avatar_url' | 'social_x' | 'social_instagram' | 'social_linkedin' | 'location'
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
  scope: VoteScope
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
}

export type ApplicationInsert = Pick<Application, 'name' | 'email' | 'location' | 'reason'>

// ---------- Supabase Database shape (for createClient generic) ----------
export type Database = {
  public: {
    Tables: {
      voyager_profiles: {
        Row: VoyagerProfile
        Insert: Omit<VoyagerProfile, 'joined_at' | 'updated_at'>
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      vote_scope: VoteScope
      vote_type: VoteType
      application_status: ApplicationStatus
      device_status: DeviceStatus
      device_knowledge: DeviceKnowledge
    }
    CompositeTypes: Record<string, never>
  }
}
