<!--
Squash-merge this PR into main, then delete the branch (squash-merged branches
still report as "ahead" and look unmerged). See AGENTS.md.
-->

## What & why

<!-- One or two sentences. Link the issue if there is one. -->

## Verification

Run locally before requesting review (CI gates on these too):

- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`

## Design review

Complete this section when the PR adds or materially changes UI:

- [ ] Started from the 390×844 portrait layout and attached a screenshot
- [ ] Uses only canonical orange / deep-space-blue / off-white tokens and Courier Prime
- [ ] Uses flat surfaces with no gradient, glow/shadow, blur/glass, CRT, cyan, grey brand color, or decorative HUD
- [ ] Uses at most one clipped top-right corner on a prominent control or container
- [ ] Default, loading, empty, error, disabled, focus, and completed states were considered
- [ ] Touch targets are at least 44×44px and the page has one primary action
- [ ] `npm run design:check`

## Preview / data safety

> ⚠️ Preview deployments share **production** Supabase, MongoDB, and Stripe
> unless a preview-scoped env is configured. Any write from the preview hits
> production data.

- [ ] No destructive or bulk operations were run against the shared env
- [ ] Any data writes I tested are safe to have happened against production

## Schema migration

- [ ] No schema change in this PR — **or**:
- [ ] Added a **new** `supabase/schema_vN.sql` (did not edit an existing
      versioned file)
- [ ] Applied to the production database: **yes / no** (state which)
