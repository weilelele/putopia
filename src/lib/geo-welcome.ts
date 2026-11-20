import { SITE_NAME, SITE_SHARE_DESCRIPTION } from './site-seo'

/**
 * The visible fact line on /welcome, which is where `/` lands. It reuses the
 * approved second sentence of SITE_SHARE_DESCRIPTION so the two never drift.
 */
export function welcomeFactLine(share: string = SITE_SHARE_DESCRIPTION): string {
  const start = share.indexOf(`${SITE_NAME} is`)
  return start >= 0 ? share.slice(start) : share
}
