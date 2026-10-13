# Voyagers interaction audit — 2026-10-13

Conclusion: primary visual and permission flows match the approved Feed design. This is a scoped pass, not complete interaction-contract acceptance or production activation.

| Area | Assessment / evidence |
| --- | --- |
| Brand, density, typography | Courier Prime, canonical orange/navy/off-white, flat surfaces, 15/20 text, 12px floor, 40px avatars, 44px actions. Design checker includes untracked UI. |
| Navigation | FEED / MEMBERS / LOGS, dedicated post detail without brand header, Back to feed; prior read-only Members/Logs checks retained. Previously loaded feed range is now reloaded before restoring position. |
| Dialogs | Shared centered ArchiveSheet; single paragraph permission dialog and Voyager Initiation CTA; dirty-close protection; menu→edit chain restores original trigger focus. |
| Author profiles | Fixed missing avatar interaction using shared MemberProfileSheet. Existing profile visibility rules still apply; unavailable identities show the shared unavailable state. |
| Mobile layout | 390×844 and 320×540 NPC composer checked; no horizontal overflow; footer remains reachable by dialog-body scrolling. POST follows global keyboard-open signal and fixed-control z-index20. Physical phone keyboard still unverified. |
| Roles | Architect NPC publish/edit, Applicant reply/like and publishing denial, Voyager no NPC selector, guest direct-detail gate verified using local services. Server and database enforce eligibility independently. |
| Ownership | Display author and actual creator separated; only the creator edits/deletes. Alternate humans, forged creators, NPC replies and cross-Architect edits are denied. |
| Loading / errors | Shared ArchiveRouteLoading replaces text-only loading. Retry/error and safe request IDs remain. NPC list failure permits self posting and offers identity reload. |

## Outstanding contract gaps / release gates

- **Production activation:** v97 then v98 have not been applied remotely. Auth → API → database → Storage integration must be checked in isolated staging. No live feed writes were performed.
- **Physical device acceptance:** keyboard, safe area, and native back behavior still need a real-phone pass. CSS uses the shared keyboard signal; desktop viewport emulation does not prove this behavior.
- **Draft lifecycle:** private Feed text is intentionally memory-only today, so the general contract's refresh recovery / 24-hour session draft recovery is not implemented. In-app reply navigation retains a memory draft; this is not equivalent to universal navigation interception. Treat the privacy exception as an implementation limitation, not an approved global contract change.
- **Network recovery:** request IDs prevent duplicate posts/replies, but explicit result lookup, distinguishing every confirmed rejection from an unknown outcome, and a bounded long-running request exit remain follow-up work.
- **Browsing continuity:** loaded-range recovery is implemented, but stable-anchor offset under concurrent insert/delete, all-tab session persistence and offline resume still need dedicated acceptance coverage.

Validation: TypeScript and production build passed; ESLint has no errors (25 existing warnings); 82 Vitest files / 625 tests; 41 isolated PostgreSQL assertions. Browser evidence is local service integration plus prior real read-only Members/Logs, not live Feed mutation validation.

final result: scoped UI/permission pass; full contract acceptance and live integration pending the items above.

## User correction: POST and permission icon

The earlier visual pass missed the custom POST button's forced 700 weight. Replaced it with shared ArchiveButton in both integrated Feed and original prototype; scoped CSS now controls positioning only. Removed the redundant pen icon from both the POST control and permission explanation. Browser computed-style check at 390×844: 16px, weight400, height48px, no SVG in POST. Verified click opens the centered one-paragraph permission dialog, Close returns to Feed. TypeScript, scoped ESLint and design check passed. Evidence: `post-button-standard-mobile.jpg`, `permission-no-icon-mobile.jpg`.

## Approved invitation-style sharing entry

Replaced the plain POST entry with Plus + Share an update in the production component and original prototype. Shared ArchiveButton with scoped 52px surface, 10px top-right notch, 16px/400 type; clipping applies only to a background pseudo-element so focus remains visible. Composer placeholder: “What’s happening in your world?”; final submit remains POST. Verified 390px rendered button 213.9×52px, 320px no horizontal overflow, click opens composer with the updated prompt. TypeScript, scoped lint and design check pass. Evidence: `share-update-mobile.jpg`, `share-update-composer.jpg`.


## Recovery / guest revision — 2026-10-14

Implemented account/task-scoped session text drafts for compose/reply/edit with explicit restore/discard, ordinary 24-hour expiry, pending-operation retention, and attachment re-selection (SHA-256 match for retry). AuthProvider clears feed drafts on observed account change/logout, including when Feed is unmounted. Storage exceptions retain memory input and show an error; Save draft & close requires a successful write. Empty/malformed/expired records are rejected. Submission IDs are stored before sending.

Network calls have a 15-second UI deadline (1.5 seconds in the development fixture). Unknown create/reply outcomes keep the same request ID; confirmed rejection unlocks editing. Owner-only GET result lookup bypasses the client Server Action queue and uses private/no-store. Missing results are explicitly not proof that an in-flight request stopped. Edit/delete offer result checking. No writes auto-replay on reconnect. Late timed-out responses do not continue their awaiting UI work. Result-unknown close preserves recovery data.

Guest content now contains a compact shared brand header and a small joining explanation/actions; oversized brand artwork and slogan removed from integrated Feed and original prototype.

Automated validation: 83 Vitest files / 637 tests, including 12 recovery/deadline tests; 41 isolated database assertions; TypeScript; lint 0 errors / 25 existing warnings; design check including all 14 untracked UI files; build passed.

**Current browser pass BLOCKED:** the browser tool rejected access to `http://localhost:3012/dev/voyager-feed-integrated` with a URL-protocol policy error. No alternative browser surface or automation workaround was used. Earlier screenshots and UI checks do not validate this revision. Real-phone keyboard/safe area remains unverified.

### Required mobile acceptance (390×844, then 320px, then physical phone)

1. Guest and unregistered roles: compact gate, no post bodies/images/counters; Request/Log In destinations; no posting entry.
2. Voyager: open Share an update; type a draft, Save draft & close, reload, Restore; Discard ordinary draft; text/actor retained, successful POST removes draft.
3. Attach a local JPG/PNG/WebP: save/reload, reselect prompt; remove an unsubmitted missing attachment; submitted retry requires matching image bytes. Test invalid type/5MB limit.
4. Architect: select NPC, save/restore; actual creator retains edit/delete. Applicant can reply/like, cannot select NPC or publish; permission CTA remains Voyager Initiation.
5. Detail: reply draft survives back/re-entry and refresh; restore/discard; submit, like/unlike, edit own reply; other's content has no menu. Check profile and returning list position.
6. Preview network `reject`: input becomes editable, retained. `timeout-before`: submit exits busy after 1.5s, CHECK RESULT reports no visible result without claiming cancellation; reset network to none and retry once. `timeout-after`: CHECK RESULT confirms the existing post; refresh then restore also confirms without duplication.
7. `read-error`: load retry with no false empty feed; restore none and Retry. Actual offline mode: no write sent, input retained, reconnect does not auto-submit. Editing/deleting uncertain results must be checked before deciding to retry.
8. Real sign-out/account switch clears old-account draft keys; storage-disabled/full browser reports unavailable persistence. Esc/backdrop dirty protection, focus restoration, text enlargement, keyboard visibility, dialog footer and fixed Share control remain usable.

Release recommendation: preparation/review may proceed; production release requires the browser acceptance above, isolated Supabase/Auth/Storage integration, and v97→v98 migration verification. No remote migrations, production QA writes, push, or deployment performed in this revision.


### 2026-10-14 browser recovery follow-up

The historical URL-policy blocker below is resolved after the user manually refreshed the HTTP tab. Latest mobile fixture scenarios and screenshots are recorded in [preflight follow-up](preflight-20261014.md#browser-recovery-and-mobile-verification--follow-up). Simulated mobile interaction passed; physical phone keyboard/safe-area and real isolated Supabase integration remain unverified.
