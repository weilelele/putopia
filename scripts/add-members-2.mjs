// Add Tariq Osei and Shen Zhimeng — two members referenced in existing bios.
// Run: node scripts/add-members-2.mjs

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const SUPABASE_URL = 'https://oxwfnmcwovxnrvagxzdz.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94d2ZubWN3b3Z4bnJ2YWd4emR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc4MDczMCwiZXhwIjoyMDk0MzU2NzMwfQ.Wj1bcpkKSQBcKO0coY6OCu84Z2_JNIAFdIagy38KLB0'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const members = [
  {
    email: 'tariq.osei@putopia.internal',
    display_name: 'Tariq Osei',
    role: 'voyager',
    location: 'Accra, Ghana',
    observation_days: 534,
    worlds_discovered: 1,
    joined_at: '2024-02-08T00:00:00Z',
    bio: 'Signal intelligence analyst who has guided more Collective recruits than any other active Voyager. Precise in observation, deliberate in communication. Believes patience is the primary instrument in parallel-world research. Introduced Amara Okafor to the network.',
    social_x: null,
    social_instagram: null,
    social_linkedin: null,
    avatarPrompt: 'portrait photograph of a calm confident West African man in his late 30s, short natural hair, warm dark skin, measured thoughtful expression, soft directional studio lighting, realistic photo, dark background, professional analyst type',
    avatarSeed: 1001,
  },
  {
    email: 'shen.zhimeng@putopia.internal',
    display_name: 'Shen Zhimeng',
    role: 'voyager',
    location: 'Hangzhou, China',
    observation_days: 265,
    worlds_discovered: 0,
    joined_at: '2024-12-03T00:00:00Z',
    bio: 'Computational linguist focused on pattern recognition in cross-dimensional signal transmissions. Developing a formal grammar for what he calls boundary language. Works closely with Saoirse Flanagan to map the semantic content of recurring signal structures.',
    social_x: null,
    social_instagram: null,
    social_linkedin: null,
    avatarPrompt: 'digital illustration portrait of a young East Asian man in his early 30s, thin wire-rimmed glasses, contemplative focused expression, technical minimalist art style, cool blue and white tones, dark background, clean lines',
    avatarSeed: 1002,
  },
]

function pollinationsAvatarUrl(prompt, seed) {
  const encoded = encodeURIComponent(prompt)
  return `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&seed=${seed}&nologo=true&model=flux`
}

async function downloadImage(url) {
  console.log(`    Downloading avatar from Pollinations...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function uploadAvatar(userId, imageBuffer) {
  const path = `${userId}/avatar.jpg`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, imageBuffer, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  return publicUrl
}

async function createMember(member) {
  console.log(`\n▸ ${member.display_name} (${member.role}) — ${member.location}`)

  // 1. Auth user
  let userId
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: member.email,
    password: randomUUID(),
    email_confirm: true,
  })
  if (authError) {
    if (authError.message.toLowerCase().includes('already')) {
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existing = listData?.users?.find(u => u.email === member.email)
      if (!existing) { console.error(`  ✗ Could not find existing user for ${member.email}`); return }
      userId = existing.id
      console.log(`  ↩ Already exists, using ID: ${userId}`)
    } else {
      throw new Error(`Auth error: ${authError.message}`)
    }
  } else {
    userId = authData.user.id
    console.log(`  ✓ Auth user created: ${userId}`)
  }

  // 2. Avatar
  let avatarUrl = null
  try {
    const imgUrl = pollinationsAvatarUrl(member.avatarPrompt, member.avatarSeed)
    const buffer = await downloadImage(imgUrl)
    avatarUrl = await uploadAvatar(userId, buffer)
    console.log(`  ✓ Avatar uploaded: ${avatarUrl.slice(0, 60)}...`)
  } catch (err) {
    console.log(`  ⚠ Avatar failed (${err.message}), continuing without avatar`)
  }

  // 3. Profile
  const { error: profileError } = await supabase.from('voyager_profiles').upsert({
    id: userId,
    display_name: member.display_name,
    bio: member.bio,
    avatar_url: avatarUrl,
    location: member.location,
    role: member.role,
    observation_days: member.observation_days,
    worlds_discovered: member.worlds_discovered,
    joined_at: member.joined_at,
    social_x: null,
    social_instagram: null,
    social_linkedin: null,
  })
  if (profileError) {
    await supabase.auth.admin.deleteUser(userId)
    throw new Error(`Profile error: ${profileError.message}`)
  }
  console.log(`  ✓ Profile created`)
}

console.log('Adding 2 referenced members...\n')
let success = 0
for (const member of members) {
  try {
    await createMember(member)
    success++
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`)
  }
}
console.log(`\n✓ Done: ${success}/${members.length} members added`)
