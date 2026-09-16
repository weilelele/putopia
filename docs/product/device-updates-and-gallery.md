# Device Updates, gallery and Field Lead

## Content contract

- `updates` is the ordered list of field reports, newest first. Each report has a stable ID, descriptive date, title, text and optional image/video attachments. Editors can reorder reports explicitly; dates do not schedule publication.
- `latestUpdate` remains a snapshot of the first report for existing summaries and follower notifications. Saving/publishing does not send email.
- Only the explicit `updates` list is read. Legacy latest reports, archive history and hero media are not imported. An empty list is valid, including when deleting the final report.
- The admin shows the complete published snapshot separately from the working list. Published reports can be opened, edited or marked for removal; states distinguish Published, Unpublished Changes, Draft and Removal Pending. Saving a draft does not alter the published list. Publishing applies the entire working list.
- The gallery deduplicates attachments by media kind and URL. Live camera (when configured) or primary image is first, then report attachments. Material Records opens the selected attachment in that gallery.
- `lead.profileId` references an Architect or Voyager. New batches require this selection; legacy name-only records remain readable until an editor assigns a real member. Saving validates the role and copies the profile's public name, avatar and bio. The frontend opens the existing profile quick view.
- `status` is the only batch phase: searching → claiming → pack_one → pack_two → console. Searching blocks claim navigation, checkout and new inventory reservations. Claiming and later phases accept paid claims with valid price and remaining inventory. The editor exposes one dropdown; Pack detail statuses are derived. The progress rail uses SEARCH → CLAIM → PACK 1 → PACK 2 → CONSOLE and a single orange highlight.

## Deployment

Apply `supabase/schema_v70.sql` before using file uploads. It creates the private `device-update-media` bucket with a 50 MB limit and JPEG/PNG/WebP/MP4/WebM MIME allowlist. Architect-authorized server actions issue unique signed upload paths; browsers upload directly to Storage. No public write policy is added. The application media route allows anonymous reads only for files referenced in published Updates or the published cover; draft reads require an Architect session. Short-lived signed redirects are never cached.

**Production migration applied on 2026-09-16; bucket verified private.** Existing HTTPS/local asset URLs work without the new bucket. This change does not assign existing Field Leads automatically. On user request, Kyoto One’s draft and published `updates` lists were explicitly emptied (revision 6). Older archive/media fields remain stored, but are not imported into Updates.

## Verification

Pure tests cover no legacy imports, empty-list deletion, published/draft separation, attachment deduplication/removal, persistence round trips, unsafe URLs, duplicate report IDs and early-stage progression. Browser checks at 390×844 cover fixed device tabs, gallery switching, video selection, adding/editing reports and adding an image URL. Test content was local only; no database writes, uploads or follower notifications were sent.

## Unified status rollout

Apply `supabase/schema_v74.sql` before deploying the unified editor. It extends the database status constraint and reservation gate without changing existing batches, prices, inventory, orders or publication snapshots. Legacy stored values remain readable during deployment; Survey maps to Searching, Claim Open to Claiming, Distribution to its current Pack, Active to Console. Every new save uses the canonical five-state model. Migration applied to production on 2026-09-16.

The package entry contains only the EXPLORE THE PACKAGES button. Its detail sheet keeps the package descriptions.
