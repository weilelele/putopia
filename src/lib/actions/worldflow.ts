'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { asWorldflowAdmin } from '@/lib/worldflow-database'

export type WorldflowStepStatus = 'draft' | 'review' | 'changes' | 'approved' | 'optional' | 'skipped'

export type WorldflowEvent = {
  id: string
  name: string
  description: string
}

export type WorldflowTimeSlot = {
  id: string
  name: string
  events: WorldflowEvent[]
}

export type WorldflowShot = {
  id: string
  name: string
  description: string
}

export type WorldflowState = {
  worldBible: string
  worldRules: string
  coreConflict: string
  visualDirection: string
  characters: Array<{ id: string; name: string; environment: string; motivation: string }>
  shots: WorldflowShot[]
  eventSystems: Record<string, { version: number; timeSlots: WorldflowTimeSlot[] }>
  stepStatuses: Record<string, WorldflowStepStatus>
}

export type WorldflowWorld = {
  id: string
  name: string
  description: string
  owner_id: string
  owner_name: string
  current_step: number
  current_status: WorldflowStepStatus
  workflow_state: WorldflowState
  created_at: string
  updated_at: string
}

export type WorldflowAsset = {
  id: string
  world_id: string
  uploaded_by: string
  step: number
  shot_id: string | null
  event_id: string | null
  media_type: 'image' | 'video'
  file_name: string
  public_url: string
  file_size: number
  mime_type: string
  version: number
  created_at: string
}

function initialState(): WorldflowState {
  const shotId = randomUUID()
  return {
    worldBible: '',
    worldRules: '',
    coreConflict: '',
    visualDirection: '',
    characters: [],
    shots: [{ id: shotId, name: '镜头 A', description: '' }],
    eventSystems: {
      [shotId]: {
        version: 1,
        timeSlots: [
          { id: randomUUID(), name: '清晨', events: [] },
          { id: randomUUID(), name: '夜晚', events: [] },
        ],
      },
    },
    stepStatuses: {
      '1': 'draft', '2': 'draft', '3': 'draft', '4': 'optional',
      '5': 'draft', '6': 'draft', '7': 'draft',
    },
  }
}

async function caller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = asWorldflowAdmin(createAdminClient())
  const { data: profile } = await admin
    .from('voyager_profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .maybeSingle()
  return {
    id: user.id,
    role: profile?.role ?? 'applicant',
    name: profile?.display_name || user.email?.split('@')[0] || 'Creator',
  }
}

async function worldAccess(worldId: string) {
  const me = await caller()
  if (!me) return { error: '请先登录。' } as const
  const admin = asWorldflowAdmin(createAdminClient())
  const { data: world } = await admin.from('worldflow_worlds')
    .select('*')
    .eq('id', worldId)
    .maybeSingle()
  if (!world) return { error: '找不到这个世界。' } as const
  return { me, world, admin } as const
}

export async function createWorldflowWorld(input: { name: string; description: string }) {
  const me = await caller()
  if (!me) return { error: '请先登录后创建世界。' }
  const name = input.name.trim().slice(0, 120)
  if (!name) return { error: '请填写世界名称。' }

  const admin = asWorldflowAdmin(createAdminClient())
  const { data, error } = await admin.from('worldflow_worlds')
    .insert({
      name,
      description: input.description.trim().slice(0, 2000),
      owner_id: me.id,
      owner_name: me.name,
      current_step: 1,
      current_status: 'draft',
      workflow_state: initialState(),
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/worldflow')
  return { id: data.id as string }
}

export async function saveWorldflowState(input: {
  worldId: string
  state: WorldflowState
  currentStep: number
}) {
  const access = await worldAccess(input.worldId)
  if ('error' in access) return { error: access.error }
  if (access.world.owner_id !== access.me.id) return { error: '只有创建者可以修改这个世界。' }
  if (!Number.isInteger(input.currentStep) || input.currentStep < 1 || input.currentStep > 7) {
    return { error: '步骤无效。' }
  }
  if (input.currentStep > access.world.current_step) return { error: '请先完成当前步骤的审核。' }
  const serialized = JSON.stringify(input.state)
  if (serialized.length > 1_000_000) return { error: '工作流内容过大，请精简后再保存。' }
  const status = input.state.stepStatuses[String(input.currentStep)] ?? 'draft'
  const { error } = await access.admin.from('worldflow_worlds')
    .update({
      workflow_state: input.state,
      current_step: input.currentStep,
      current_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.worldId)
  if (error) return { error: error.message }
  revalidatePath('/worldflow')
  return { ok: true }
}

export async function submitWorldflowStep(input: { worldId: string; state: WorldflowState; step: number }) {
  const access = await worldAccess(input.worldId)
  if ('error' in access) return { error: access.error }
  if (access.world.owner_id !== access.me.id) return { error: '只有创建者可以提交这个世界。' }
  if (!Number.isInteger(input.step) || input.step < 1 || input.step > 7) return { error: '步骤无效。' }
  if (input.step > access.world.current_step) return { error: '请先完成当前步骤的审核。' }
  const state = { ...input.state, stepStatuses: { ...input.state.stepStatuses, [String(input.step)]: 'review' as const } }
  const { error } = await access.admin.from('worldflow_worlds')
    .update({ workflow_state: state, current_step: input.step, current_status: 'review', updated_at: new Date().toISOString() })
    .eq('id', input.worldId)
  if (error) return { error: error.message }
  revalidatePath('/worldflow')
  return { ok: true, state }
}

export async function reviewWorldflowStep(input: {
  worldId: string
  state: WorldflowState
  step: number
  decision: 'approve' | 'changes'
}) {
  const access = await worldAccess(input.worldId)
  if ('error' in access) return { error: access.error }
  if (access.me.role !== 'architect') return { error: '只有 architect 可以审核。' }
  if (!Number.isInteger(input.step) || input.step < 1 || input.step > 7) return { error: '步骤无效。' }
  const persistedState = access.world.workflow_state as WorldflowState
  if (persistedState.stepStatuses[String(input.step)] !== 'review') return { error: '这个步骤当前不在待审核状态。' }
  const nextStatus: WorldflowStepStatus = input.decision === 'approve' ? 'approved' : 'changes'
  const nextStep = input.decision === 'approve' ? Math.min(7, input.step + 1) : input.step
  const state = {
    ...persistedState,
    stepStatuses: {
      ...persistedState.stepStatuses,
      [String(input.step)]: nextStatus,
      ...(input.decision === 'approve' && input.step < 7 ? { [String(nextStep)]: 'draft' as const } : {}),
    },
  }
  const { error } = await access.admin.from('worldflow_worlds')
    .update({
      workflow_state: state,
      current_step: nextStep,
      current_status: input.decision === 'approve' && input.step < 7 ? 'draft' : nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.worldId)
  if (error) return { error: error.message }
  revalidatePath('/worldflow')
  return { ok: true, state, nextStep }
}
