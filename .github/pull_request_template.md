## What changed

<!-- Describe the user-visible and technical changes. -->

## Scope audit

- [ ] This branch was created from the latest `origin/main` in an isolated worktree.
- [ ] `npm run verify:branch` passes and its complete file list is expected.
- [ ] This PR contains no changes inherited from another feature branch.
- [ ] Any Device, checkout, webhook, role, profile, or onboarding write was tested without mutating shared production data.
- [ ] Any new schema change is an additive `supabase/schema_vN.sql` file, and its production application status is documented below.

## Verification

- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Portrait mobile checked at approximately 390×844 when UI changed.
- [ ] Vercel Preview reviewed; no Preview deployment was promoted to Production.

## Database and release notes

<!-- State whether a migration exists, whether it has been applied, and any release-specific risk. -->

Production is released only by merging an approved PR into `main`. Direct CLI production deploys and preview promotions are prohibited outside an explicitly requested, verified incident rollback.
