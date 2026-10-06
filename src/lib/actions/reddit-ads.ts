'use server'

import { createClient } from '@/lib/supabase/server'
import {
  createRedditConversionId,
  sendRedditConversion,
} from '@/lib/reddit-capi'
import { isIOSNativeRequest } from '@/lib/app-platform-server'

export async function trackRedditSignUp(clickId?: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || await isIOSNativeRequest()) return { conversionId: null, sent: false }

  const conversionId = createRedditConversionId()
  const result = await sendRedditConversion({
    trackingType: 'SIGN_UP',
    conversionId,
    clickId,
    email: user.email,
    externalId: user.id,
  })

  return { conversionId, sent: result.sent }
}
