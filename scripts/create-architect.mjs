// 创建虚拟 Architect 用户脚本
// 运行方式：node scripts/create-architect.mjs
//
// 在下方 architects 数组中定义你想创建的角色，然后运行脚本。
// 用户会被直接写入 Supabase，不发送邮件，不需要密码。
// 创建后可在 Supabase Dashboard → Table Editor → voyager_profiles 中编辑头像等信息。

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const SUPABASE_URL = 'https://oxwfnmcwovxnrvagxzdz.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94d2ZubWN3b3Z4bnJ2YWd4emR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc4MDczMCwiZXhwIjoyMDk0MzU2NzMwfQ.Wj1bcpkKSQBcKO0coY6OCu84Z2_JNIAFdIagy38KLB0'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ── 在此定义虚拟 Architect 成员 ────────────────────────────────────────────
// bio 字段会被 AI 用来推断写作风格，请尽量描述清楚性格和关注领域
const architects = [
  {
    email: 'nova@putopia.internal',
    display_name: 'Nova',
    bio: '组织架构师，专注于集体决策机制与成员成长体系设计。思维缜密，文字简洁直接，偏好数据与结构，不喜欢废话。',
    location: 'Shanghai, China',
    avatar_url: null,
  },
  {
    email: 'shen.echo@putopia.internal',
    display_name: 'Shen Echo',
    bio: '平行世界信号分析专家，擅长从量子噪声中提取有效情报。写作风格充满探索感，喜欢用诗意的语言描述科学现象。',
    location: 'Beijing, China',
    avatar_url: null,
  },
  {
    email: 'lingbo.arc@putopia.internal',
    display_name: 'Lingbo',
    bio: '设备维护与成员关系负责人。温和而务实，关注每一位 Voyager 的状态，写作带有人文温度，善于讲故事。',
    location: 'Chengdu, China',
    avatar_url: null,
  },
]
// ──────────────────────────────────────────────────────────────────────────

async function createArchitect(arc) {
  console.log(`\n▸ 创建: ${arc.display_name} <${arc.email}>`)

  // 1. 创建 Auth 用户（跳过邮件验证，随机密码）
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: arc.email,
    password: randomUUID(),   // 随机密码，实际不会用到
    email_confirm: true,      // 跳过邮件验证
  })

  if (authError) {
    // 如果邮箱已存在，给出提示
    if (authError.message.includes('already')) {
      console.log(`  ⚠ 邮箱已存在，跳过: ${arc.email}`)
    } else {
      console.error(`  ✗ Auth 创建失败: ${authError.message}`)
    }
    return
  }

  const userId = authData.user.id

  // 2. 创建 voyager_profiles
  const { error: profileError } = await supabase.from('voyager_profiles').insert({
    id: userId,
    display_name: arc.display_name,
    bio: arc.bio,
    location: arc.location,
    avatar_url: arc.avatar_url,
    role: 'architect',
    observation_days: 0,
    worlds_discovered: 0,
  })

  if (profileError) {
    console.error(`  ✗ Profile 创建失败: ${profileError.message}`)
    // 回滚 Auth 用户
    await supabase.auth.admin.deleteUser(userId)
    console.log(`  ↩ 已回滚 Auth 用户`)
  } else {
    console.log(`  ✓ 成功 — ID: ${userId}`)
  }
}

// 顺序创建（避免并发冲突）
for (const arc of architects) {
  await createArchitect(arc)
}

console.log('\n✓ 全部完成。可在 Supabase Dashboard 查看并编辑用户信息。\n')
