import { describe, expect, it } from 'vitest'
import { stillImage, chooseTuningCover, type CoverAsset } from './dashboard-media'
const asset = (id: string, patch: Partial<CoverAsset> = {}): CoverAsset => ({id,media:'image',processed_url:`/${id}.png`,display_url:null,display_order:0,...patch})
describe('Dashboard real media', () => {
  it('uses a video poster but never sends a video or audio URL to an image', () => {
    expect(stillImage('video','/clip.mp4','/poster.webp')).toBe('/poster.webp')
    expect(stillImage('video','/clip.mp4')).toBeUndefined()
    expect(stillImage('video','/clip.mp4','/clip.mp4?token=1')).toBeUndefined()
    expect(stillImage('audio','/sound.mp3')).toBeUndefined()
  })
  it('uses the previous voted day when the newest has no votes, preserving the existing cover rule', () => {
    expect(chooseTuningCover([{assets:[asset('new')],responses:[]},{assets:[asset('old'),asset('winner')],responses:[{selected_asset_id:'winner'}]}])).toBe('/winner.png')
  })
  it('falls back to the newest usable visual in display order, skipping videos without posters', () => {
    expect(chooseTuningCover([{assets:[asset('video',{media:'video',processed_url:'/video.mp4'}),asset('second',{display_order:2}),asset('first',{display_order:1})],responses:[]}])).toBe('/first.png')
    expect(chooseTuningCover([])).toBeUndefined()
  })
})
