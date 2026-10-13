# Voyagers integration — 2026-10-13

## Implemented

- `/voyagers` defaults to Feed; `?tab=members` keeps counts, Architects, batch switching and member profile dialogs; `?tab=logs` reuses published Voyager Logs. `/logs` and existing story URLs remain valid. Profile editing uses the established `/profile` page.
- Feed: text and optional JPG/PNG/WebP (5 MB), 500-character limit, cursor pagination, likes/unlikes, standalone `/voyagers/posts/[id]` detail, replies, own-content edit/delete, pending/error/empty states, draft protection and retry IDs.
- Applicant POST opens one explanation paragraph and a Voyager Initiation CTA. The “As an Applicant” paragraph has been removed from both prototype and production component.
- Guest and unregistered viewers receive no posts, counters or media. The gate matches Dashboard branding. Content access is checked in server actions and database policies, never inferred from user-editable metadata.
- Private images are delivered through `/api/voyager-feed/media/[id]` with membership checks and `private, no-store`; no public or signed attachment URLs. Author-confirmed deletions attempt storage cleanup. A cleanup failure leaves the object inaccessible and records its post ID for operator follow-up.
- Post identity, author, parent, attachment and creation time cannot be modified. Top-level post insertion requires Voyager/Architect; registered Applicant can reply/like. Architect has no ownership override. Parent deletion cascades replies and likes; account deletion is not blocked by feed foreign keys.

- Human Architects can select themselves or an existing NPC in the post dialog. Replies retain the human identity. Server resolution and RLS independently reject other humans, non-Architect publishers, forged creators and NPC replies. Actual creator alone can edit/delete; displayed NPC attribution is immutable.
- Author avatars open the existing member profile dialog; the floating POST respects the shared keyboard visibility signal. List return reloads the previously loaded range; modal chains restore their original trigger focus.

## Migration / activation

`supabase/schema_v99.sql` is additive, transactional and includes tables, indexes, policies, an invoker view, a private Storage bucket and schema-cache notification. `supabase/schema_v100.sql` adds immutable creator attribution and NPC policies; old entries retain authorship and modification timestamps. Requires earlier profile/registration/NPC migrations. **Not applied to production or any remote database.** The release remains blocked pending mobile recovery QA and isolated Supabase integration; see `preflight-20261014.md`.

Apply v99 followed by v100 before shipping these routes to real members. The current shared backend has not received this migration, so the real Feed read displays its retry/error state. Members and Logs were verified against existing read-only data. Do not seed the production feed with QA fixtures.

The implementation is ready for migration review; live Supabase Auth → PostgREST → Storage write/read validation remains pending migration and an isolated staging/test account. In-memory PostgreSQL assertions cover database authorization, but do not replace that network integration check. Confirm 5 MB uploads and owner deletion/cleanup in staging. Failed uploads or interrupted writes can leave inaccessible unreferenced private objects; use a reviewed age-bounded operator cleanup after checking references, never bulk-delete the bucket.

## Validation

- Production build passed.
- TypeScript passed.
- Full ESLint: 0 errors, existing repository warnings remain; new scoped files pass.
- Vitest: 84 files / 662 tests passed.
- Design checker passed, including explicit inspection of untracked new UI files.
- 41 isolated in-memory PostgreSQL assertions passed: reader/publisher/ownership, migration backfill, NPC identity/creator ownership, human impersonation denial, forged author, nested reply denial, likes, private storage, cascade deletion and account deletion.
- Browser 390×844 / 320×540: production component with local service adapter exercised post creation, detail route, reply, edit, Applicant dialog, and unregistered denial. The adapter does not call live mutation services. 320px member layout has no horizontal overflow; desktop Logs checked at 1440×1024.
- Real Members: batch switch and profile dialog verified. Real Logs: list → story → return to `?tab=logs` verified.
- Physical phone virtual keyboard/safe-area testing remains outstanding.

Run SQL assertions without any live database:

```sh
npm install --prefix /private/tmp/voyager-feed-db-test @electric-sql/pglite --no-audit --no-fund
node scripts/test-voyager-feed-sql.mjs /private/tmp/voyager-feed-db-test/node_modules/@electric-sql/pglite/dist/index.js
```

Browser-only integration preview: `/dev/voyager-feed-integrated`. This renders the production Feed component with in-memory services. It and its detail route return 404 outside development. Identity selection is a test control, not production authorization.

## Evidence

`feed-mobile.jpg`, `detail-mobile.jpg`, `permission-mobile.jpg`, `permission-320.jpg`: shared production component using local fixtures. `members-mobile.jpg`, `members-320.jpg`, `logs-mobile.jpg`, `logs-desktop.jpg`: actual read-only product pages. Initial member screenshot precedes the correction that excludes the unlabeled Original Batch fallback from New Batch counts.

References: approved v2 prototype in `../voyager-feed-prototype/`; latest one-paragraph permission copy; canonical `docs/design-system.md`.

## NPC and interaction audit follow-up

`npc-compose-mobile.jpg` and `npc-compose-320.jpg` record the Architect selector using local fixtures. Checked NPC create → edit → detail; Applicant reply/like and denied publishing; Voyager has no NPC selector; guest detail contains no feed. Database tests include another Architect and the NPC itself being unable to edit/delete the human creator's post.

See `design-qa.md` for a scoped compliance assessment and outstanding acceptance gaps. Do not treat the feature as universally compliant or deployed.


## 2026-10-14 recovery completion

Session draft recovery, bounded network waits, owner-only result lookup, and compact guest gate are implemented. See the dated audit section in `design-qa.md` for exact behavior, fixture failure modes, automated results and the manual mobile matrix. Browser verification of this revision was blocked by the browser tool's URL security policy; prior screenshots are historical. Preparation can proceed, but this is not approval to deploy without the remaining mobile and staging checks.
