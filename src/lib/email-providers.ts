/**
 * Email-provider lookup — maps a known inbox domain to its display name + a deep
 * link to that provider's webmail. Used by onboarding (after an email is left)
 * and by the console access gate ("Open email") so a returning guest can jump
 * straight to their inbox to confirm. Unknown domains return null (no shortcut).
 */
export const EMAIL_PROVIDERS: Record<string, { name: string; url: string }> = {
  'gmail.com':      { name: 'Gmail',        url: 'https://mail.google.com/mail/' },
  'googlemail.com': { name: 'Gmail',        url: 'https://mail.google.com/mail/' },
  'outlook.com':    { name: 'Outlook',      url: 'https://outlook.live.com/' },
  'hotmail.com':    { name: 'Outlook',      url: 'https://outlook.live.com/' },
  'live.com':       { name: 'Outlook',      url: 'https://outlook.live.com/' },
  'msn.com':        { name: 'Outlook',      url: 'https://outlook.live.com/' },
  'yahoo.com':      { name: 'Yahoo Mail',   url: 'https://mail.yahoo.com/' },
  'ymail.com':      { name: 'Yahoo Mail',   url: 'https://mail.yahoo.com/' },
  'icloud.com':     { name: 'iCloud Mail',  url: 'https://www.icloud.com/mail' },
  'me.com':         { name: 'iCloud Mail',  url: 'https://www.icloud.com/mail' },
  'mac.com':        { name: 'iCloud Mail',  url: 'https://www.icloud.com/mail' },
  'qq.com':         { name: 'QQ 邮箱',      url: 'https://mail.qq.com/' },
  'foxmail.com':    { name: 'Foxmail',      url: 'https://mail.qq.com/' },
  '163.com':        { name: '网易邮箱',     url: 'https://mail.163.com/' },
  '126.com':        { name: '网易邮箱',     url: 'https://mail.126.com/' },
  'yeah.net':       { name: '网易邮箱',     url: 'https://mail.yeah.net/' },
  'proton.me':      { name: 'Proton Mail',  url: 'https://mail.proton.me/' },
  'protonmail.com': { name: 'Proton Mail',  url: 'https://mail.proton.me/' },
}

export function getEmailProvider(email: string) {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? (EMAIL_PROVIDERS[domain] ?? null) : null
}
