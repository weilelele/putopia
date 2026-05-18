'use server'

import Groq from 'groq-sdk'
import { createAdminClient } from '@/lib/supabase/server'
import type { VoyagerProfile } from '@/types/database'

export type GeneratedNews = {
  title: string
  content: string
  imagePrompt: string
}

// 生成新闻草稿（Groq — Llama 3.3 70B）
export async function generateNews(
  idea: string,
  persona: Pick<VoyagerProfile, 'display_name' | 'bio' | 'location'>
): Promise<{ data: GeneratedNews | null; error: string | null }> {
  if (!process.env.GROQ_API_KEY) {
    return { data: null, error: '请在 .env.local 中配置 GROQ_API_KEY' }
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const personaLines = [
    `姓名：${persona.display_name}`,
    persona.bio ? `个人简介：${persona.bio}` : null,
    persona.location ? `所在地：${persona.location}` : null,
  ].filter(Boolean).join('\n')

  const prompt = `你是 Putopia Collective 的组织通讯编辑。Putopia 是一个太空探索主题的私人社区，成员称为 Voyager，管理层称为 Architect，核心活动包括平行世界观测、设备追踪、情报共享等。

请基于以下发布者信息和核心 Idea，生成一条组织情报（Intel）。

━━ 发布者 ━━
${personaLines}

━━ 核心 Idea ━━
${idea}

━━ 生成要求 ━━
1. 标题：简洁有力，不超过 25 字，符合 Putopia 科幻社区风格
2. 正文：150-250 字，第一人称或组织视角，结合发布者的性格特点，带有 Putopia 宇宙观测主题的氛围感
3. 配图提示词：英文，20-35 词，描述一个与内容主题相关的太空/量子/组织场景，适合 AI 图片生成（Flux 模型），风格：cinematic, dark, atmospheric

请严格以如下 JSON 格式返回，不要包含任何额外文字或 markdown 代码块：
{"title":"...","content":"...","imagePrompt":"..."}`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.8,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ''

    // 提取 JSON（防止模型输出多余内容或代码块包裹）
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { data: null, error: '模型返回格式异常，请重试' }

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedNews
    if (!parsed.title || !parsed.content || !parsed.imagePrompt) {
      return { data: null, error: '生成内容不完整，请重试' }
    }

    return { data: parsed, error: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误'
    return { data: null, error: `生成失败：${msg}` }
  }
}

// 获取所有 Architect 成员（用于发布者选择）
export async function getArchitects(): Promise<VoyagerProfile[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('voyager_profiles')
    .select('*')
    .eq('role', 'architect')
    .order('joined_at', { ascending: true })

  return data ?? []
}

