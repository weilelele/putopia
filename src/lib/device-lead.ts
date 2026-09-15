import type { VoyagerProfile } from '@/types/database'
import type { DeviceBatchLead } from './device-batches'

export type DeviceLeadOption = Pick<VoyagerProfile, 'id' | 'display_name' | 'role' | 'avatar_url' | 'location' | 'bio'>

export function leadFromProfile(profile: DeviceLeadOption): DeviceBatchLead {
  return {
    profileId: profile.id, avatarUrl: profile.avatar_url, name: profile.display_name,
    role: profile.role, location: profile.location ?? '', bio: profile.bio ?? '', latestNote: '',
    initials: profile.display_name.slice(0, 2).toUpperCase(),
  }
}
