// Create all 9 Putopia members (6 Voyagers + 3 Architects)
// Generates avatars via Pollinations.ai, uploads to Supabase Storage,
// creates auth users, and inserts voyager_profiles.
//
// Run: node scripts/setup-members.mjs

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const SUPABASE_URL = 'https://oxwfnmcwovxnrvagxzdz.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94d2ZubWN3b3Z4bnJ2YWd4emR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc4MDczMCwiZXhwIjoyMDk0MzU2NzMwfQ.Wj1bcpkKSQBcKO0coY6OCu84Z2_JNIAFdIagy38KLB0'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ── Member definitions ─────────────────────────────────────────────────────
const members = [
  // ── VOYAGERS ──────────────────────────────────────────────────────────
  {
    email: 'luke.brandner@putopia.internal',
    display_name: 'Luke Brandner',
    role: 'voyager',
    location: 'Berlin, Germany',
    observation_days: 847,
    worlds_discovered: 0,
    joined_at: '2023-09-12T00:00:00Z',
    bio: 'Former archivist, now the Collective\'s longest-serving device holder. Has maintained Unit 001 — The Originator — for over two decades. Keeps meticulous physical logs alongside digital ones. Reserved, methodical, and deeply skeptical of anything that cannot be filed.',
    social_x: null,
    social_instagram: null,
    social_linkedin: 'https://linkedin.com',
    // Realistic portrait: middle-aged German man, thoughtful
    avatarPrompt: 'portrait photograph of a thoughtful middle-aged European man in his 40s, short salt-and-pepper hair, intelligent calm eyes, natural light, realistic photo, dark neutral background, subtle, documentary style',
    avatarSeed: 101,
  },
  {
    email: 'page.chen@putopia.internal',
    display_name: 'Page Chen',
    role: 'voyager',
    location: 'Shanghai, China',
    observation_days: 412,
    worlds_discovered: 1,
    joined_at: '2024-05-20T00:00:00Z',
    bio: 'Software engineer who established the first confirmed cross-temporal quantum link on record. Technically gifted but equally drawn to the human implications of parallel-world contact. Unit 012 — The Observer. Asks the right questions at the right time.',
    social_x: 'https://x.com',
    social_instagram: 'https://instagram.com',
    social_linkedin: null,
    // Anime / digital art style: young Chinese woman
    avatarPrompt: 'digital illustration portrait of a young East Asian woman in her late 20s, short dark hair, curious warm expression, clean anime-inspired art style, soft cyberpunk color palette, dark background, high detail',
    avatarSeed: 202,
  },
  {
    email: 'amara.okafor@putopia.internal',
    display_name: 'Amara Okafor',
    role: 'voyager',
    location: 'Lagos, Nigeria',
    observation_days: 147,
    worlds_discovered: 0,
    joined_at: '2025-08-03T00:00:00Z',
    bio: 'Environmental data scientist introduced to the Collective by Tariq Osei. Approaches parallel-world observation through an ecological lens — mapping how natural systems diverge across realities. Evidence-first, slow to speculate, meticulous in documentation.',
    social_x: null,
    social_instagram: 'https://instagram.com',
    social_linkedin: 'https://linkedin.com',
    // Realistic photo: Nigerian woman, professional
    avatarPrompt: 'portrait photograph of a confident West African woman in her early 30s, natural hair, warm brown skin, direct gaze, soft studio lighting, professional, realistic photo, clean dark background',
    avatarSeed: 303,
  },
  {
    email: 'ines.cavalcanti@putopia.internal',
    display_name: 'Ines Cavalcanti',
    role: 'voyager',
    location: 'São Paulo, Brazil',
    observation_days: 203,
    worlds_discovered: 1,
    joined_at: '2025-04-11T00:00:00Z',
    bio: 'Graphic designer who discovered anomalous frequency patterns in her photography equipment. Observation logs are half diagram, half prose — maps of signal shapes drawn by hand. Intuitive, associative, and unusually good at finding structure in apparent noise.',
    social_x: null,
    social_instagram: 'https://instagram.com',
    social_linkedin: null,
    // Colorful illustrated: Brazilian woman, artistic
    avatarPrompt: 'colorful illustrated portrait of a Latina woman in her late 20s, dark wavy hair, warm expressive face, graphic novel art style, bold warm colors, illustrated editorial style, dark background',
    avatarSeed: 404,
  },
  {
    email: 'dhruv.mehta@putopia.internal',
    display_name: 'Dhruv Mehta',
    role: 'voyager',
    location: 'Mumbai, India',
    observation_days: 318,
    worlds_discovered: 2,
    joined_at: '2024-09-07T00:00:00Z',
    bio: 'Aerospace engineer who approached the Collective with his own signal detection rig before being formally invited. Pragmatic and efficient — has significantly improved his device\'s calibration mechanism. Rarely speculates; prefers to let data speak.',
    social_x: 'https://x.com',
    social_instagram: null,
    social_linkedin: 'https://linkedin.com',
    // Realistic: Indian man, professional
    avatarPrompt: 'portrait photograph of a South Asian man in his early 30s, short dark hair, clean shaven, focused professional expression, realistic photo, soft directional lighting, dark background, engineering type',
    avatarSeed: 505,
  },
  {
    email: 'saoirse.flanagan@putopia.internal',
    display_name: 'Saoirse Flanagan',
    role: 'voyager',
    location: 'Dublin, Ireland',
    observation_days: 89,
    worlds_discovered: 0,
    joined_at: '2025-11-14T00:00:00Z',
    bio: 'Folklorist and linguist who believes parallel-world signals encode meaning, not just data. Collaborates with Shen Zhimeng on interpretive frameworks for signal language. Observation logs read like field notes crossed with short fiction. The Collective\'s youngest active member.',
    social_x: 'https://x.com',
    social_instagram: 'https://instagram.com',
    social_linkedin: null,
    // Watercolor / painterly: Irish woman, red hair
    avatarPrompt: 'watercolor painting portrait of a young Irish woman in her early 30s, auburn red hair, freckles, thoughtful gentle expression, soft painterly style, warm earthy tones, artistic illustration',
    avatarSeed: 606,
  },

  // ── ARCHITECTS ────────────────────────────────────────────────────────
  {
    email: 'maren.solberg@putopia.internal',
    display_name: 'Maren Solberg',
    role: 'architect',
    location: 'Oslo, Norway',
    observation_days: 1024,
    worlds_discovered: 5,
    joined_at: '2023-07-01T00:00:00Z',
    bio: 'Theoretical physicist and architect of the Collective\'s signal-classification protocol. Rarely appears in public communications — her influence is felt in the structure of everything. Every sentence she writes does work. Every silence is intentional.',
    social_x: null,
    social_instagram: null,
    social_linkedin: 'https://linkedin.com',
    // Minimalist geometric illustration: Nordic woman
    avatarPrompt: 'minimalist geometric illustration portrait of a Scandinavian woman in her 40s, blonde hair pulled back, cool blue tones, clean vector art style, precise lines, professional, dark background, modern',
    avatarSeed: 707,
  },
  {
    email: 'ryo.tanaka@putopia.internal',
    display_name: 'Ryo Tanaka',
    role: 'architect',
    location: 'Kyoto, Japan',
    observation_days: 1156,
    worlds_discovered: 8,
    joined_at: '2023-06-15T00:00:00Z',
    bio: 'Philosopher-engineer who was present before the Collective had a name. Proposed the four-role structure still in use today. Thinks in decades. Patient to the point of stillness. Opens meetings with a question, closes them with a single sentence.',
    social_x: null,
    social_instagram: null,
    social_linkedin: null,
    // Ink brush / woodblock: Japanese man, older
    avatarPrompt: 'ink brush painting portrait of a distinguished Japanese man in his 50s, calm composed expression, traditional brushwork style with modern touch, monochrome with subtle amber tones, zen aesthetic, dark background',
    avatarSeed: 808,
  },
  {
    email: 'valentina.cruz@putopia.internal',
    display_name: 'Valentina Cruz',
    role: 'architect',
    location: 'Mexico City, Mexico',
    observation_days: 623,
    worlds_discovered: 3,
    joined_at: '2024-01-08T00:00:00Z',
    bio: 'Communications strategist responsible for the Collective\'s growth, the intake of new Voyagers, and the organization\'s public-facing narrative. The most outward-facing of the Architects. Decisive, high-energy, and unusually comfortable with uncertainty.',
    social_x: 'https://x.com',
    social_instagram: 'https://instagram.com',
    social_linkedin: 'https://linkedin.com',
    // Vibrant illustrated: Mexican woman, bold
    avatarPrompt: 'vibrant illustrated portrait of a Latina woman in her late 30s, dark hair, confident warm smile, bold saturated colors, editorial illustration style, dynamic composition, dark background',
    avatarSeed: 909,
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────

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
    .upload(path, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  return publicUrl
}

async function createMember(member) {
  console.log(`\n▸ ${member.display_name} (${member.role}) — ${member.location}`)

  // 1. Create auth user (or fetch existing if already created)
  let userId
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: member.email,
    password: randomUUID(),
    email_confirm: true,
  })
  if (authError) {
    if (authError.message.toLowerCase().includes('already')) {
      // Fetch existing user ID
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

  // 2. Generate & upload avatar
  let avatarUrl = null
  try {
    const imgUrl = pollinationsAvatarUrl(member.avatarPrompt, member.avatarSeed)
    const buffer = await downloadImage(imgUrl)
    avatarUrl = await uploadAvatar(userId, buffer)
    console.log(`  ✓ Avatar uploaded: ${avatarUrl.slice(0, 60)}...`)
  } catch (err) {
    console.log(`  ⚠ Avatar failed (${err.message}), continuing without avatar`)
  }

  // 3. Upsert voyager_profile (auth trigger may have pre-created an empty row)
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
    social_x: member.social_x ?? null,
    social_instagram: member.social_instagram ?? null,
    social_linkedin: member.social_linkedin ?? null,
  })
  if (profileError) {
    await supabase.auth.admin.deleteUser(userId)
    throw new Error(`Profile error: ${profileError.message}`)
  }
  console.log(`  ✓ Profile created`)

  // 4. Link devices for Luke and Page
  if (member.display_name === 'Luke Brandner') {
    await supabase.from('devices')
      .update({ current_user_id: userId, current_user_name: 'Voyager Luke' })
      .eq('id', 'kn-1')
    console.log(`  ✓ Linked to Unit 001 (kn-1)`)
  }
  if (member.display_name === 'Page Chen') {
    await supabase.from('devices')
      .update({ current_user_id: userId, current_user_name: 'Voyager Page' })
      .eq('id', 'kn-2')
    console.log(`  ✓ Linked to Unit 012 (kn-2)`)
  }

  return userId
}

// ── Main ───────────────────────────────────────────────────────────────────
console.log('Putopia Member Setup Script')
console.log('============================')
console.log(`Creating ${members.length} members (avatars via Pollinations.ai)...\n`)

let success = 0
for (const member of members) {
  try {
    await createMember(member)
    success++
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`)
  }
}

console.log(`\n============================`)
console.log(`✓ Done: ${success}/${members.length} members created`)
console.log(`\nYou can view and edit profiles in Supabase Dashboard → Table Editor → voyager_profiles`)
