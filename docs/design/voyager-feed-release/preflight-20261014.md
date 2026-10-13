# Voyager Feed release preflight — 2026-10-14

Status: **HOLD for isolated Supabase integration and physical-phone acceptance**. Simulated mobile recovery QA now passed (follow-up below). No production migration or production release has been performed.

## Changes and integration

- Current accepted Share an update control retained; compact guest gate retained.
- Image preparation now blocks publication and draft-close until hashing completes; errors preserve text and explain reselection.
- Latest production trunk `75199e5` merged into the feature branch without conflicts.
- Production already uses schema v97 for the unrelated Initiation Meta Purchase outbox. Unpublished Feed migration files were renamed, without changing SQL statements, to **schema_v99.sql → schema_v100.sql** before committing. Internal historical comments mentioning v97/v98 refer to the original draft names, not the production v97 migration. Run only the two explicit Feed files for this release; do not run every numbered schema file.

## Preview diagnosis

- Port 3012 had no listening process. Started `npm run dev -- --port 3012`.
- HTTP HEAD `/dev/voyager-feed-integrated` returns **200 OK**.
- Existing in-app tab 6 remains on a `data:text/html` connection-refused error document. Browser URL policy blocks binding/navigating that document. User has been asked to reload the intended HTTP URL manually. No browser-policy bypass attempted.
- This proves server availability, not that the browser or a physical phone has rendered the latest revision. Current mobile recovery scenarios remain unverified; older screenshots are not evidence for this revision.

## Database evidence (read-only remote checks)

Target: MC Home, `oxwfnmcwovxnrvagxzdz`, matching local public Supabase URL.

- Feed entries, likes and bucket absent; Feed migration not listed in remote migration history.
- Required voyager_profiles columns exist: id, display_name, avatar_url, role, registered_at, account_kind.
- Profiles SELECT policy permits profile joins used by the invoker Feed view.
- Existing Storage policies are bucket-scoped; none grants general access to the new Feed bucket.
- Only non-default remote branch is an unrelated Meta Payment sandbox with **MIGRATIONS_FAILED**. It is not a verified staging environment for this module and was not altered.
- 41 isolated PGlite assertions pass against schema_v99 → schema_v100: permissions, creator ownership, NPC posting, migration backfill, storage and cascades. These do not verify Supabase Auth/PostgREST/Storage transport.

## Required release sequence

1. Restore browser HTTP page and complete latest mobile matrix from design-qa.md at 390×844 and 320×540, including drafts, timeout-before/after, replies, NPC and denied roles. Verify physical phone keyboard/safe areas separately.
2. Provision or identify an isolated Supabase staging environment and scope preview credentials to it. Do not seed or test-write against shared production.
3. Apply schema_v99.sql then schema_v100.sql in staging. Verify real authenticated post/image/reply/like/edit/delete, NPC author vs human creator, forbidden direct requests and private media. Record evidence.
4. After those gates pass, apply the two additive migrations to production with the migration tool, verify tables/view/RLS/bucket and migration history, then squash-merge the PR and promote the passing deployment.
5. Production smoke checks are read-only. If app rollout fails, revert/promote previous application deployment; retain additive tables and any member content. Do not drop Feed tables/bucket as an automatic rollback.

No production data was modified during this preflight.

## Final automated checks on integrated branch

- Next production build: passed.
- `npx tsc --noEmit`: passed after build completed (an initial concurrent run raced Next's generated types and was rerun sequentially).
- ESLint: zero errors, 25 existing warnings.
- Vitest: 84 files, 662 tests passed.
- `npm run design:check -- --base origin/main`: passed across committed new and changed UI.
- `git diff --check`: passed.

## Browser recovery and mobile verification — follow-up

User manually refreshed the existing tab; browser control now reads the intended HTTP document. The preview-access blocker is resolved. Verified production Feed component through the local service adapter at 390×844 and 320×540:

- Save draft and close → reload → restore → publish preserved the original text.
- Feed → detail → reply → success count updated; return to feed worked.
- Applicant liked/replied, edited/deleted its own reply; other users' content had no ownership menu.
- Applicant publish dialog has one paragraph, no decorative icon, and Voyager Initiation link.
- Guest and unregistered detail state contained zero Feed articles and showed the compact request/login gate.
- Architect selected NPC, attached a local PNG, saved/reopened the draft, saw missing-file guidance and disabled POST, reselected the image and published with NPC attribution.
- Timeout before write: result lookup retained the uncertain state, draft survived reload with locked text/identity, retry produced exactly one matching post.
- Timeout after write: result confirmation produced exactly one matching post. Reply timeout-after-write also confirmed successfully and cleared its input.
- Explicit rejection retained editable text; closing opened Discard your changes confirmation.
- Read failure displayed Retry; retry after restoring normal mode returned all five fixture posts.
- 320px document width equalled viewport width (no horizontal overflow). Browser error log was empty at completion. Viewport override reset afterward.

Evidence: `qa-permission-20261014.png`, `qa-guest-320-20261014.png`, `qa-image-draft-320-20261014.png`, `qa-timeout-recovery-20261014.png`, `qa-feed-mobile-20261014.png`.

Scope: simulated mobile viewport and fixture service faults, not a physical phone, OS-level airplane mode, or real Supabase network transport. Production Auth logout/account-switch draft erasure has pure-test coverage but was not exercised by signing the user's real account out. The fixture role selector does not prove that boundary. Physical keyboard/safe-area and isolated Supabase integration remain release gates.

PR #225 CI (typecheck/lint/build) and Vercel preview passed at commit 1dc55f8. This follow-up changes only QA documentation and screenshots.
