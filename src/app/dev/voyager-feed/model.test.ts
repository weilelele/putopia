import { describe, expect, it } from 'vitest'
import { actors, canReadFeed, visibleFeed, canInteract, canManage, canPost, samplePosts, type Role } from './model'

describe('Voyager feed prototype permissions', () => {
  it.each<[Role, boolean, boolean]>([
    ['guest', false, false], ['unregistered', false, false], ['applicant', false, true], ['voyager', true, true], ['architect', true, true],
  ])('%s has the agreed publish and interaction permissions', (role, publish, interact) => {
    expect(canPost(role)).toBe(publish)
    expect(canInteract(role)).toBe(interact)
  })
  it.each<Role>(['guest', 'unregistered'])('never exposes feed entries to %s', role => {
    expect(canReadFeed(role)).toBe(false)
    expect(visibleFeed(role, samplePosts())).toEqual([])
  })
  it('allows an Applicant to manage their own reply but not its parent post', () => {
    const post = samplePosts()[0]
    expect(canManage(actors.applicant, post.replies[1])).toBe(true)
    expect(canManage(actors.applicant, post)).toBe(false)
  })
  it('does not grant Architects ownership of someone else’s content', () => {
    for (const post of samplePosts()) {
      expect(canManage(actors.architect, post)).toBe(false)
      for (const reply of post.replies) expect(canManage(actors.architect, reply)).toBe(false)
    }
  })
  it('keeps authorship bound to an account when switching the preview role', () => {
    const ownPost = samplePosts()[2]
    expect(canManage(actors.voyager, ownPost)).toBe(true)
    expect(canManage(actors.applicant, ownPost)).toBe(false)
    expect(canManage(actors.guest, ownPost)).toBe(false)
  })
})
