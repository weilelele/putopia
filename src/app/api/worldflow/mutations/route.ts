import { NextResponse } from 'next/server'
import {
  createWorldflowWorld,
  reviewWorldflowStep,
  saveWorldflowState,
  submitWorldflowStep,
  type WorldflowState,
} from '@/lib/actions/worldflow'

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 1_100_000

type MutationBody = {
  action?: string
  currentStep?: number
  decision?: 'approve' | 'changes'
  description?: string
  name?: string
  state?: WorldflowState
  step?: number
  version?: number
  worldId?: string
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: '工作流内容过大，请精简后再保存。' }, { status: 413 })
  }

  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: '工作流内容过大，请精简后再保存。' }, { status: 413 })
  }

  let body: MutationBody
  try {
    body = JSON.parse(rawBody) as MutationBody
  } catch {
    return NextResponse.json({ error: '请求内容无效。' }, { status: 400 })
  }
  if (body.version !== 1) {
    return NextResponse.json({ error: '工作流请求版本无效，请刷新页面后重试。' }, { status: 400 })
  }

  try {
    if (body.action === 'create') {
      if (typeof body.name !== 'string' || typeof body.description !== 'string') {
        return NextResponse.json({ error: '创建信息不完整。' }, { status: 400 })
      }
      const result = await createWorldflowWorld({ name: body.name, description: body.description })
      return NextResponse.json(result, { status: result.error ? 400 : 200 })
    }

    if (!body.worldId || !body.state) {
      return NextResponse.json({ error: '工作流信息不完整。' }, { status: 400 })
    }
    if (body.action === 'save' && typeof body.currentStep === 'number') {
      const result = await saveWorldflowState({
        currentStep: body.currentStep,
        state: body.state,
        worldId: body.worldId,
      })
      return NextResponse.json(result, { status: result.error ? 400 : 200 })
    }
    if (body.action === 'submit' && typeof body.step === 'number') {
      const result = await submitWorldflowStep({
        state: body.state,
        step: body.step,
        worldId: body.worldId,
      })
      return NextResponse.json(result, { status: result.error ? 400 : 200 })
    }
    if (
      body.action === 'review' &&
      typeof body.step === 'number' &&
      (body.decision === 'approve' || body.decision === 'changes')
    ) {
      const result = await reviewWorldflowStep({
        decision: body.decision,
        state: body.state,
        step: body.step,
        worldId: body.worldId,
      })
      return NextResponse.json(result, { status: result.error ? 400 : 200 })
    }
    return NextResponse.json({ error: '不支持的工作流操作。' }, { status: 400 })
  } catch (error) {
    console.error('[worldflow] mutation failed', error)
    return NextResponse.json({ error: '服务暂时不可用，当前草稿仍保存在本机，请稍后重试。' }, { status: 500 })
  }
}
