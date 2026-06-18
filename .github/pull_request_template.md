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
