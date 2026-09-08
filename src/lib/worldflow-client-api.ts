import type {
  WorldflowState,
} from '@/lib/actions/worldflow'

type MutationResult = {
  error?: string
  id?: string
  nextStep?: number
  ok?: boolean
  state?: WorldflowState
}

type WorldflowMutation =
  | {
      action: 'create'
      description: string
      name: string
      version: 1
    }
  | {
      action: 'save'
      currentStep: number
      state: WorldflowState
      version: 1
      worldId: string
    }
  | {
      action: 'submit'
      state: WorldflowState
      step: number
      version: 1
      worldId: string
    }
  | {
      action: 'review'
      decision: 'approve' | 'changes'
      state: WorldflowState
      step: number
      version: 1
      worldId: string
    }

async function mutateWorldflow(body: WorldflowMutation): Promise<MutationResult> {
  try {
    const response = await fetch('/api/worldflow/mutations', {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const result = (await response.json()) as MutationResult
    if (!response.ok && !result.error) {
      return { error: `操作失败（${response.status}），请重试。` }
    }
    return result
  } catch {
    return { error: '网络连接中断，请检查网络后重试。当前草稿仍保存在本机。' }
  }
}

export function createWorldflowWorld(input: {
  description: string
  name: string
}) {
  return mutateWorldflow({ action: 'create', version: 1, ...input })
}

export function saveWorldflowState(input: {
  currentStep: number
  state: WorldflowState
  worldId: string
}) {
  return mutateWorldflow({ action: 'save', version: 1, ...input })
}

export function submitWorldflowStep(input: {
  state: WorldflowState
  step: number
  worldId: string
}) {
  return mutateWorldflow({ action: 'submit', version: 1, ...input })
}

export function reviewWorldflowStep(input: {
  decision: 'approve' | 'changes'
  state: WorldflowState
  step: number
  worldId: string
}) {
  return mutateWorldflow({ action: 'review', version: 1, ...input })
}
