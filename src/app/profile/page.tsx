'use client'

import { useMemo } from 'react'
import { getMyProfile, getMyProfileStages, updateProfile, uploadAvatar } from '@/lib/actions/profile'
import { useAuth } from '@/lib/auth-context'
import { BlockedMembersCard, DeleteAccountCard } from './account-safety'
import { ProfileView, type ProfileServices } from './profile-view'

export default function ProfilePage() {
  const { logout } = useAuth()
  const services = useMemo<ProfileServices>(() => ({
    load: getMyProfile,
    stages: getMyProfileStages,
    save: updateProfile,
    upload: uploadAvatar,
    logout,
  }), [logout])
  return <ProfileView services={services} accountSafety={<><BlockedMembersCard /><DeleteAccountCard /></>} />
}
