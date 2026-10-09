import { describe, expect, it } from 'vitest'
import { isRetiredChatSubject } from './retired-chat'

describe('retired chat boundaries', () => {
  it('closes legacy device and array chat subjects', () => {
    for (const subject of ['device', 'device_batch', 'dreamcatcher']) expect(isRetiredChatSubject(subject)).toBe(true)
  })
  it('keeps Intel and world observation comments available', () => {
    for (const subject of ['intel', 'world']) expect(isRetiredChatSubject(subject)).toBe(false)
  })
})
