import { describe, expect, it } from 'vitest'
import { aiReferralProperties, classifyAiReferral } from './ai-referrer'

describe('classifyAiReferral — referrer hosts', () => {
  it.each([
    ['https://chatgpt.com/', 'chatgpt', 'chatgpt.com'],
    ['https://chat.openai.com/c/abc', 'chatgpt', 'chat.openai.com'],
    ['https://www.perplexity.ai/', 'perplexity', 'www.perplexity.ai'],
    ['https://perplexity.ai/search?q=x', 'perplexity', 'perplexity.ai'],
    ['https://gemini.google.com/', 'gemini', 'gemini.google.com'],
    ['https://bard.google.com/', 'gemini', 'bard.google.com'],
    ['https://copilot.microsoft.com/', 'copilot', 'copilot.microsoft.com'],
    ['https://m365.copilot.cloud.microsoft/', 'copilot', 'm365.copilot.cloud.microsoft'],
    ['https://claude.ai/', 'claude', 'claude.ai'],
    ['https://grok.com/', 'grok', 'grok.com'],
    ['https://chat.deepseek.com/', 'deepseek', 'chat.deepseek.com'],
    ['https://www.meta.ai/', 'meta_ai', 'www.meta.ai'],
    ['https://chat.mistral.ai/chat', 'mistral', 'chat.mistral.ai'],
    ['https://you.com/', 'you', 'you.com'],
    ['https://www.phind.com/', 'phind', 'www.phind.com'],
    ['https://poe.com/', 'poe', 'poe.com'],
    ['https://CHATGPT.COM/', 'chatgpt', 'chatgpt.com'],
  ])('%s → %s', (referrer, engine, matched) => {
    expect(classifyAiReferral(referrer, '')).toEqual({
      engine,
      matched,
      signal: 'referrer',
    })
  })

  it('recognises Android app referrers', () => {
    expect(classifyAiReferral('android-app://com.openai.chatgpt/', '')).toEqual({
      engine: 'chatgpt',
      matched: 'com.openai.chatgpt',
      signal: 'referrer',
    })
    expect(classifyAiReferral('android-app://com.google.android.apps.bard/', '')?.engine)
      .toBe('gemini')
  })

  it.each([
    'https://www.google.com/',
    'https://www.bing.com/',
    'https://duckduckgo.com/',
    'https://www.reddit.com/r/scifi',
    'https://www.multiverseco.org/devices',
    'https://notchatgpt.com/',
    'https://chatgpt.com.evil.example/',
    'https://openai.com/',
    'android-app://com.google.android.gm/',
    'not a url',
    '',
  ])('ignores non-AI referrer %j', (referrer) => {
    expect(classifyAiReferral(referrer, '')).toBeNull()
  })

  it('tolerates missing inputs', () => {
    expect(classifyAiReferral(undefined, undefined)).toBeNull()
    expect(classifyAiReferral(null, null)).toBeNull()
  })
})

describe('classifyAiReferral — utm_source', () => {
  it('detects ChatGPT citation links without a referrer', () => {
    expect(classifyAiReferral('', '?utm_source=chatgpt.com')).toEqual({
      engine: 'chatgpt',
      matched: 'chatgpt.com',
      signal: 'utm_source',
    })
  })

  it('accepts a query string without the leading ?', () => {
    expect(classifyAiReferral('', 'utm_source=perplexity&utm_medium=referral')?.engine)
      .toBe('perplexity')
  })

  it.each([
    ['ChatGPT', 'chatgpt'],
    ['openai', 'chatgpt'],
    ['www.perplexity.ai', 'perplexity'],
    ['https://copilot.microsoft.com', 'copilot'],
    ['claude.ai', 'claude'],
    ['gemini', 'gemini'],
  ])('utm_source=%s → %s', (source, engine) => {
    expect(classifyAiReferral('', `?utm_source=${encodeURIComponent(source)}`)?.engine)
      .toBe(engine)
  })

  it('prefers utm_source over the referrer', () => {
    expect(
      classifyAiReferral('https://www.perplexity.ai/', '?utm_source=chatgpt.com'),
    ).toMatchObject({ engine: 'chatgpt', signal: 'utm_source' })
  })

  it('falls back to the referrer when utm_source is not an AI engine', () => {
    expect(
      classifyAiReferral('https://claude.ai/', '?utm_source=reddit&utm_medium=social'),
    ).toMatchObject({ engine: 'claude', signal: 'referrer' })
  })

  it('ignores non-AI utm_source with no referrer', () => {
    expect(classifyAiReferral('', '?utm_source=reddit')).toBeNull()
    expect(classifyAiReferral('', '?utm_source=')).toBeNull()
  })
})

describe('aiReferralProperties', () => {
  it('builds session and first-touch super properties', () => {
    expect(
      aiReferralProperties({ engine: 'perplexity', matched: 'www.perplexity.ai', signal: 'referrer' }),
    ).toEqual({
      session: {
        ai_referrer: 'perplexity',
        ai_referrer_match: 'www.perplexity.ai',
        ai_referrer_signal: 'referrer',
      },
      firstTouch: { first_touch_ai_referrer: 'perplexity' },
    })
  })
})
