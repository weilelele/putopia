import { describe, expect, it } from 'vitest'
import { initiationConfirmationEmail } from './initiation-email'

const SITE = 'https://multiverseco.org'

describe('initiationConfirmationEmail', () => {
  it('names the $38 Initial Voyager Pack', () => {
    const email = initiationConfirmationEmail(SITE, 'initial')
    expect(email.subject).toBe('Your $38 Initial Voyager Pack is confirmed')
    expect(email.text).toContain('Packs 1–2')
    expect(email.html).toContain('href="https://multiverseco.org/voyager-initiation"')
  })

  it('names the $488 Complete Voyager Pack', () => {
    const email = initiationConfirmationEmail(SITE, 'standard')
    expect(email.subject).toBe('Your $488 Complete Voyager Pack is confirmed')
    expect(email.text).toContain('all four Packs')
  })

  it('carries an activation link for a buyer who has not set a password', () => {
    const email = initiationConfirmationEmail(SITE, 'initial', undefined, 'https://multiverseco.org/register?key=k')
    expect(email.html).toContain('ACTIVATE ACCOUNT')
    expect(email.html).toContain('href="https://multiverseco.org/register?key=k"')
    expect(email.text).toContain('Activate your account: https://multiverseco.org/register?key=k')
  })
})
