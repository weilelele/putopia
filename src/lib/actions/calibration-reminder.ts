'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { parseCalibrationReminder, type CalibrationReminderResult } from '@/lib/post-payment-calibration'

async function reminder(snooze: boolean): Promise<CalibrationReminderResult> {
  try {
    const client = await createClient({ allowAnonymous: true })
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) return { status: 'ineligible' }
    // Private records: ownership always comes from the verified session.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (createAdminClient() as any).rpc('claim_voyager_calibration_reminder', { p_user: user.id, p_snooze: snooze })
    if (error) return { status: 'unavailable' }
    return parseCalibrationReminder(data)
  } catch {
    return { status: 'unavailable' }
  }
}

export async function loadCalibrationReminder(): Promise<CalibrationReminderResult> {
  return reminder(false)
}

export async function snoozeCalibrationReminder(): Promise<void> {
  await reminder(true)
}
