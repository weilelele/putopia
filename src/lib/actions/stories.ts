'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { StoryInsert, StoryUpdate } from '@/types/database'
import { getPostHogClient } from '@/lib/posthog-server'

// Voyager+: list all published stories
export async function getPublishedStories() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('is_published', true)
    .order('date', { ascending: false })

  return data ?? []
}

// Voyager+: get one story by slug
export async function getStoryById(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('id', id)
    .single()

  return data
}

// Voyager: get their own stories (published + drafts)
export async function getMyStories() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  return data ?? []
}

// Architect: list all stories (published + drafts)
export async function getAllStories() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('stories')
    .select('*')
    .order('date', { ascending: false })

  return data ?? []
}

// Voyager+: submit a new story (saved as draft, pending architect review)
export async function submitStory(story: Omit<StoryInsert, 'author_id' | 'is_published'>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: null }

  const { data: profile } = await supabase
    .from('voyager_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const insert: StoryInsert = {
    ...story,
    author_id: user.id,
    author_name: profile?.display_name ?? story.author_name,
    is_published: false,
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('stories')
    .insert(insert)
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  revalidatePath('/logs')
  const posthog = getPostHogClient()
  posthog.capture({ distinctId: user.id, event: 'story_submitted', properties: { story_id: data.id, title: data.title } })
  await posthog.shutdown()
  return { error: null, data }
}

// Author: update their own draft
export async function updateMyStory(id: string, updates: Omit<StoryUpdate, 'is_published' | 'author_id'>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('stories')
    .update(updates)
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('is_published', false)

  if (error) return { error: error.message }
  revalidatePath('/logs')
  return { error: null }
}

// Architect: publish a story
export async function publishStory(id: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('stories')
    .update({ is_published: true })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/logs')
  revalidatePath(`/logs/${id}`)
  return { error: null }
}

// Architect: unpublish a story
export async function unpublishStory(id: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('stories')
    .update({ is_published: false })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/logs')
  revalidatePath(`/logs/${id}`)
  return { error: null }
}

// Architect: update any story (content + metadata)
export async function updateStory(id: string, updates: StoryUpdate) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('stories')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/logs')
  revalidatePath(`/logs/${id}`)
  return { error: null }
}

// Architect: delete a story
export async function deleteStory(id: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('stories')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/logs')
  return { error: null }
}
