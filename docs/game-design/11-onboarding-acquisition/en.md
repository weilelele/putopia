# 11 · Onboarding & Acquisition

## 1. Positioning

This layer converts "ad clicks / cold visitors" into "applicant → voyager." It is the product's
**entry funnel**, tightly coupled with marketing (UTM, A/B, email lists), and it uses a set of
"psychological immersion" copy to pull cold traffic into the fiction.

## 2. Entry funnel `/new` (landing onboarding)

The root route `/` redirects: with query params (UTM/preview) → `/new?<params>`; otherwise → `/console`.
`/new` is the **core marketing landing funnel** (`OnboardingClient`), with a typical beat:

1. **Q1 psychological hook**: "How strongly do you feel that another version of your life exists right now?" (intensity slider/choice)
2. **Q2 wish**: "Which parallel world are you most hoping to find?"
3. **Affirmation / call**: "Yes, it's you. You are the Voyager we've been looking for." (identity confirmed)
4. **Lead-capture CTA**: leave your email to "apply for your seat and secure your Multiverse Console" → into the application.

> Paired with a device reel video (`device-reel.mp4`). The whole thing frames "applying" as the ritual of "being selected by the org."

## 3. UTM variants (per ad group)

Landing copy and video can switch by `utm_content` (ad-group id), driven by the `onboarding_variants`
table (Architect-editable):

- The **default row** (match_key='') holds baseline copy; variant rows override only the fields they set (null=inherit).
- `resolveVariant()` matches a visitor's `utm_content` (or a `?variant=` preview override) to a variant,
  layering it over the default and a fallback so the flow is never blank. Matches exactly ("a3") or as a
  token inside a longer string ("metaeyes_a3_v2").
- Admin preview: `/admin/onboarding-preview` (can be granted via the page-level `can_edit_onboarding` permission without being architect).
- Known ad-group variants: A3 / S1 / A2 etc. (see the onboarding-variants memory).

## 4. Apply `/apply`

A classic application form: name/alias, email, location, **reason for applying** (1 of 5: ANOMALY /
REFERRAL / VERIFICATION / DIRECT CONTACT / OTHER free-text). On submit:

1. Write/increment `applications` (dedup by email, records `submission_count`, UTM, `landing_page_variant`).
2. **Supabase `inviteUserByEmail`** sends the invite (→ `/auth/callback?next=/register`); if already registered, falls back to resending an access link.
3. Sync to **Loops** (newsletter) and **Beehiiv** (subscription).
4. Analytics `application_submitted`.

## 5. Register `/register`

Receive the invite → callback → `/register` set display_name + password → complete registration
(stamps `registered_at`). The profile is already created by the trigger (role=applicant).

> **Metric**: only a non-null `registered_at` counts as "truly registered"; `joined_at` only means the invite was sent.

## 6. Email & lists

- **Resend** (transactional): comment-reply notifications, access-link resends (`src/lib/email.ts` / `auth-resend.ts`).
- **Loops** (newsletter): auto-upsert a contact on apply (with userGroup/UTM); bulk send via admin Campaign
  or Transactional API; an emergency path sends raw HTML via Resend (`scripts/send-campaign.mjs`).
- **Beehiiv**: subscribe on apply (best-effort, non-blocking on failure).
- **Invite recovery**: ~140 invites once failed due to send limits; a recovery queue + drip + audit panel exists.

## 7. A/B experiment (upgrade path)

See [01 §6]: `experiment_group ∈ {direct, task_gated}` decides whether the home ad slot points to
`/voyager-pack` (buy now) or `/voyager-path` (task-gated). PostHog instruments the whole way
(landing view, CTA clicks, pack view/state).

## 8. Data & permissions

| Item | Notes |
|---|---|
| `applications` | email/reason/status/utm_*/landing_page_variant/submission_count |
| `onboarding_variants` | match_key/label/copy fields/video_url/enabled |
| `voyager_profiles.registered_at` | true-registration mark |
| `experiment_group` | A/B group |
| Third-party | Supabase Auth (invite), Loops, Beehiiv, Resend, PostHog |

## 9. Current status & gaps

- ✅ `/new` funnel, UTM variants, apply, invite, register, Loops/Beehiiv sync, A/B, PostHog are live.
- 🟡 Application review can upgrade to voyager via status=approved, while paid/task upgrades run in parallel — the two paths need reconciling.
- ⬜ Fine-grained per-step conversion dashboards/attribution are still maturing (there is `/admin/analytics` + PostHog).

## 10. Future hooks

- Carry `/new`'s Q1/Q2 answers into later personalization (e.g. recommend the tuning world matching "the parallel world you most want to find").
- Referral mechanic (the REFERRAL reason is already instrumented) → refer-a-friend rewards.
