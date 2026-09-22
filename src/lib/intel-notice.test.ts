import { describe, expect, it } from 'vitest'
import { noticeStatus, validateNoticeTiming, toLocalDateTime } from './intel-notice'

const task = { tag: 'NOTICE' as const, timestamp: '2026-09-23T10:00:00Z', expires_at: '2026-09-24T10:00:00Z' }

describe('NOTICE task lifetime', () => {
  it('is active from publication until, but not including, its deadline', () => {
    expect(noticeStatus(task, Date.parse(task.timestamp) - 1)).toBe('scheduled')
    expect(noticeStatus(task, Date.parse(task.timestamp))).toBe('active')
    expect(noticeStatus(task, Date.parse(task.expires_at) - 1)).toBe('active')
    expect(noticeStatus(task, Date.parse(task.expires_at))).toBe('expired')
  })
  it('never treats historical notices or malformed dates as active', () => {
    for (const expires_at of [null, undefined, '', 'invalid', task.timestamp]) {
      expect(noticeStatus({ ...task, expires_at }, Date.parse(task.timestamp))).toBe('legacy')
    }
    expect(noticeStatus({ ...task, tag: 'DEVICE' }, Date.parse(task.timestamp))).toBeNull()
  })
  it('requires a valid deadline strictly after publication for NOTICE only', () => {
    expect(validateNoticeTiming(task)).toBeNull()
    expect(validateNoticeTiming({ ...task, expires_at: null })).toBeTruthy()
    expect(validateNoticeTiming({ ...task, expires_at: task.timestamp })).toBeTruthy()
    expect(validateNoticeTiming({ ...task, expires_at: 'invalid' })).toBeTruthy()
    expect(validateNoticeTiming({ ...task, timestamp: 'invalid' })).toBeTruthy()
    expect(validateNoticeTiming({ ...task, tag: 'ORG', expires_at: null })).toBeNull()
  })
  it('preserves the actual instant when editing a local datetime input', () => {
    expect(new Date(toLocalDateTime(task.timestamp)).toISOString()).toBe(new Date(task.timestamp).toISOString())
  })
})
