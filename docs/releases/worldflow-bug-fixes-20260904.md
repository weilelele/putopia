# Worldflow interaction fixes — 2026-09-04

Source: internal Feishu document “新版平行世界 workflow bug 汇总”.

## Problem mapping

1. Forge/Cosmo channel, band, and asset rows relied on browser-native horizontal
   scrolling. Wide rows could be clipped in Edge without an obvious or usable
   way to reach later bands.
2. Linked material cards used equal-width desktop grid tracks, so a small number
   of assets expanded to fill the workspace.
3. The same cloud asset could be linked repeatedly to the same production
   target. Linked records had no removal action.
4. Event selection and final video sequencing did not keep the complete
   shot/time/parent-event/sub-event path visible, and structural changes had no
   undo action.
5. Step 3 became read-only after approval, even after the ongoing production
   workspace had been unlocked.

## Resolution

- Added visible previous/next controls, touch panning, and persistent thin
  scrollbars to horizontal Forge/Cosmo rows.
- Capped desktop material previews at 320 px while retaining a single,
  responsive column on portrait phones.
- Marked already-linked cloud materials in the picker and added a matching
  server-side duplicate check.
- Added owner-only removal for linked and locally uploaded materials. Removing a
  cloud link deletes only the Worldflow association; the Forge/Cosmo source is
  never copied or deleted.
- Displayed the complete selected production path above its generated-material
  controls and in every final sequence item.
- Added one-step undo for shot, time-slot, parent-event, and sub-event structure
  changes.
- Reopened shot maintenance after Step 5 is unlocked, both in Step 3 and in the
  unified production workspace. A new shot immediately opens its name,
  description, and required starting-image controls.
- Prevented saving an earlier step from regressing the world's currently
  unlocked production step.

## Data and deployment

- No database migration is required.
- Existing duplicate rows are not deleted automatically. Creators can review and
  remove the unwanted association from the Worldflow UI.
- Production currently contains one duplicated cloud-link target identified
  during a read-only verification query.
