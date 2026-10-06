import { describe, expect, it } from 'vitest'
import { swipeDirection } from './swipe'
import { orderFeed } from './world-feed-order'

const move = (startX: number, endX: number, startY = 400, endY = 400) => ({ startX, endX, startY, endY, viewportWidth: 390 })

describe('swipeDirection', () => {
  it('swipe left is next, swipe right is previous', () => {
    expect(swipeDirection(move(300, 150))).toBe('next')
    expect(swipeDirection(move(100, 260))).toBe('prev')
  })
  it('ignores short, mostly vertical and edge-started touches', () => {
    expect(swipeDirection(move(300, 260))).toBeNull()
    expect(swipeDirection(move(300, 200, 400, 520))).toBeNull()
    expect(swipeDirection(move(10, 200))).toBeNull()
    expect(swipeDirection(move(380, 150))).toBeNull()
  })
})

describe('orderFeed', () => {
  const w = (id: string, photo: boolean) => ({ id, photo })
  it('puts the first photo world first, then photo worlds, then fuzzy ones', () => {
    const ordered = orderFeed([w('a', false), w('b', true), w('c', false), w('d', true)], (x) => x.photo).map((x) => x.id)
    expect(ordered).toEqual(['b', 'd', 'a', 'c'])
  })
  it('keeps everything when no world has a photo', () => {
    expect(orderFeed([w('a', false), w('b', false)], (x) => x.photo).map((x) => x.id)).toEqual(['a', 'b'])
  })
})
