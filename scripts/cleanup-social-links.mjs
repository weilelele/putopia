// Nullifies placeholder social links (bare domain URLs with no username).
// These were inserted as stand-ins during member creation.
// Run: node scripts/cleanup-social-links.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://oxwfnmcwovxnrvagxzdz.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94d2ZubWN3b3Z4bnJ2YWd4emR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc4MDczMCwiZXhwIjoyMDk0MzU2NzMwfQ.Wj1bcpkKSQBcKO0coY6OCu84Z2_JNIAFdIagy38KLB0'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const PLACEHOLDERS = {
  social_x:         'https://x.com',
  social_instagram: 'https://instagram.com',
  social_linkedin:  'https://linkedin.com',
}

async function run() {
  console.log('Cleaning up placeholder social links...\n')

  for (const [field, placeholder] of Object.entries(PLACEHOLDERS)) {
    const { data, error } = await supabase
      .from('voyager_profiles')
      .update({ [field]: null })
      .eq(field, placeholder)
      .select('display_name')

    if (error) {
      console.error(`  ✗ ${field}: ${error.message}`)
    } else {
      const names = (data ?? []).map(r => r.display_name).join(', ')
      console.log(`  ✓ ${field} → NULL for: ${names || '(none)'}`)
    }
  }

  console.log('\nDone.')
}

run()
