import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture } from '@/app/dev/voyager-initiation/fixtures'

const { getUser, rpc, admin } = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), admin: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }), createAdminClient: admin }))
import { loadCalibrationReminder, snoozeCalibrationReminder } from './calibration-reminder'

describe('calibration reminder server ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUser.mockResolvedValue({ data: { user: { id: 'verified-buyer' } }, error: null })
    admin.mockReturnValue({ rpc })
    rpc.mockResolvedValue({ data: { status: 'cooldown' }, error: null })
  })
  it('uses only the verified session', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'verified-buyer' } }, error: null })
    expect(await loadCalibrationReminder()).toEqual({ status: 'cooldown' })
    expect(rpc).toHaveBeenCalledWith('claim_voyager_calibration_reminder', { p_user: 'verified-buyer', p_snooze: false })
  })
  it('resets the server cooldown when deferring', async () => {
    await snoozeCalibrationReminder()
    expect(rpc).toHaveBeenCalledWith('claim_voyager_calibration_reminder', { p_user: 'verified-buyer', p_snooze: true })
  })
  it('never reads reminder records for a visitor without a verified session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect(await loadCalibrationReminder()).toEqual({ status: 'ineligible' })
    expect(admin).not.toHaveBeenCalled()
  })
  it('does not invite on a missing migration or unavailable database', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42883' } })
    expect(await loadCalibrationReminder()).toEqual({ status: 'unavailable' })
  })
  it('accepts a paid server result and suppresses a completed user', async () => {
    rpc.mockResolvedValueOnce({ data: { status: 'due', promptedAt: '2026-10-23T04:00:00Z', snapshot: { ...fixture('initial_pack'), calibrated: false } }, error: null })
    expect((await loadCalibrationReminder()).status).toBe('due')
    rpc.mockResolvedValueOnce({ data: { status: 'completed' }, error: null })
    expect(await loadCalibrationReminder()).toEqual({ status: 'completed' })
  })
})
