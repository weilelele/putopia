/* ─────────────────────────────────────────────────────
   ONBOARDING VARIANTS — resolver

   Onboarding copy + video now live in the `onboarding_variants`
   table (admin-editable). This module is the pure resolution
   logic shared by the public flow and the admin editor.

   - The default row (match_key === '') holds the baseline copy.
   - Variant rows override only the fields they set; null = inherit
     from the default row.
   - resolveVariant() picks the row whose match_key matches the
     visitor's utm_content (or a ?variant= override), then layers
     it over the default, then over FALLBACK_COPY (so the flow is
     never blank even if the table is empty / a field is null).
───────────────────────────────────────────────────── */

import type { OnboardingVariantRow } from '@/types/database'

export interface OnboardingCopy {
  /* Headlines, by question position in the live flow:
       consoleHeadline → Q1 (Multiverse Console curiosity)
       q2Headline      → Q2 (world choice)
       q1Headline      → Q3 (join-urgency slider)  ← legacy field name */
  consoleHeadline: string
  q1Headline:    string
  q2Headline:    string
  affirmLine1:   string
  affirmLine2:   string
  ctaInvitation: string
  ctaLabel:      string
  /* Per-step videos. Each step can carry its own clip; a blank step "continues"
     the previous one (videoCta ← videoQ2 ← videoQ1 ← fallback reel). The DB
     column `video_url` is the Q1/base video; `video_url_q2`/`video_url_cta`
     override only where the admin wants the clip to change mid-flow. */
  videoQ1:       string
  videoQ2:       string
  videoCta:      string
}

export interface ResolvedVariant extends OnboardingCopy {
  /** Canonical key — recorded in PostHog + applications.landing_page_variant */
  key: string
}

/* Last-resort copy — mirrors the original hardcoded flow. Used only if the
   table has no default row or leaves a field null. */
export const FALLBACK_COPY: OnboardingCopy = {
  consoleHeadline: 'What do you most want to know about the Multiverse Console?',
  q1Headline:    'How urgently do you want to join the Collective and explore parallel worlds yourself?',
  q2Headline:    'Which world should the Console show you first?',
  affirmLine1:   "Yes, it's you.",
  affirmLine2:   "You are the Voyager we've been looking for.",
  ctaInvitation: 'Leave your email below to apply for your seat in our collective and secure your Multiverse Console.',
  ctaLabel:      'CONFIRM MY VOYAGER IDENTITY',
  videoQ1:       '/assets/device-reel.mp4',
  videoQ2:       '',   // blank = continue the previous step's video
  videoCta:      '',
}

/* Overlay a row's non-null fields onto a base copy object. */
function applyRow(base: OnboardingCopy, row: OnboardingVariantRow | undefined): OnboardingCopy {
  if (!row) return base
  return {
    consoleHeadline: row.console_headline ?? base.consoleHeadline,
    q1Headline:    row.q1_headline    ?? base.q1Headline,
    q2Headline:    row.q2_headline    ?? base.q2Headline,
    affirmLine1:   row.affirm_line1   ?? base.affirmLine1,
    affirmLine2:   row.affirm_line2   ?? base.affirmLine2,
    ctaInvitation: row.cta_invitation ?? base.ctaInvitation,
    ctaLabel:      row.cta_label      ?? base.ctaLabel,
    videoQ1:       row.video_url      ?? base.videoQ1,
    videoQ2:       row.video_url_q2   ?? base.videoQ2,
    videoCta:      row.video_url_cta  ?? base.videoCta,
  }
}

/* Second inheritance axis: after the variant→default→fallback layering, any step
   the admin left blank "continues" the previous step's clip. Q1 always resolves
   to a real video (the fallback reel at worst). */
function chainVideos(c: OnboardingCopy): OnboardingCopy {
  const videoQ1  = c.videoQ1  || FALLBACK_COPY.videoQ1
  const videoQ2  = c.videoQ2  || videoQ1
  const videoCta = c.videoCta || videoQ2
  return { ...c, videoQ1, videoQ2, videoCta }
}

/**
 * Resolve the onboarding variant for the current visitor.
 * @param variants  all rows from `onboarding_variants`
 * @param utmContent first-touch utm_content (the ad-group id)
 * @param override   optional `?variant=` query param for QA preview
 */
export function resolveVariant(
  variants: OnboardingVariantRow[],
  opts: { utmContent?: string | null; override?: string | null },
): ResolvedVariant {
  const defaultRow = variants.find(v => v.match_key === '')
  const base = applyRow(FALLBACK_COPY, defaultRow)
  const defaultKey = defaultRow?.label ?? 'default'

  const raw = (opts.override ?? opts.utmContent ?? '').trim().toLowerCase()
  if (!raw) return { key: defaultKey, ...chainVideos(base) }

  // Match exact ("a3") or as a token inside a longer string ("metaeyes_a3_v2")
  const tokens = raw.split(/[^a-z0-9]+/).filter(Boolean)
  const match = variants.find(v =>
    v.match_key !== '' && v.enabled && (raw === v.match_key || tokens.includes(v.match_key)),
  )
  if (!match) return { key: defaultKey, ...chainVideos(base) }

  return { key: match.label, ...chainVideos(applyRow(base, match)) }
}
