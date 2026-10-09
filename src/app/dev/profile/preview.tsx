'use client'

import { useMemo } from 'react'
import { ProfileView, type ProfileServices } from '@/app/profile/profile-view'
import type { VoyagerProfile } from '@/types/database'

/** Local, in-memory fixture: edits never call an account or storage service. */
export function ProfilePreview({ mode }: { mode: 'applicant' | 'voyager' | 'holder' | 'architect' }) {
  const services = useMemo<ProfileServices>(() => {
    const profile: VoyagerProfile = {
      id: 'profile-preview', display_name: 'Nova', role: mode === 'holder' ? 'voyager' : mode,
      avatar_url: null, bio: null, location: null, social_x: null, social_instagram: null, social_linkedin: null,
      account_kind: 'human', can_edit_onboarding: false, observation_days: 0, worlds_discovered: 0,
      batch_label: mode === 'applicant' ? '' : 'S26', joined_at: '2026-10-06', registered_at: '2026-10-06', updated_at: '2026-10-06',
      task_quiz_at: null, task_intel_at: null, experiment_group: null,
    }
    return {
      load: async () => profile,
      stages: async () => ({ consoleBound: mode === 'holder', accessRole: profile.role }),
      save: async () => ({ error: null }),
      upload: async data => {
        const file = data.get('avatar')
        if (!(file instanceof File)) return { error: 'Choose an image.', url: null }
        const url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        return { error: null, url }
      },
      logout: async () => {},
    }
  }, [mode])
  return <><p style={{ padding: '12px 16px', color: 'var(--color-star-dim)', fontSize: 'var(--fs-caption)' }}>LOCAL PREVIEW · {mode.toUpperCase()} · Changes stay in this page.</p><ProfileView services={services} /></>
}
