# Device camera Embed integration

## Scope

Device pages can show an existing Cosmo Band as a scheduled camera through an
isolated iframe. Cosmo owns all scheduling, clip selection, preloading and playback.
Putopia stores only a binding and displays health from validated status messages.
Existing Info media remains historical material; Batch business status is separate
from camera playback status. No Worlds code, production record or schema changed.

## Local demo

Start the separate host from the matching Cosmo branch:

```sh
npm ci
npm run build:web:prod
COSMO_EMBED_CONFIG=embed/demo.config.json node scripts/embed-server.mjs
```

Start this Putopia branch with its usual environment:

```sh
COSMO_EMBED_ORIGIN=http://localhost:8082 DEVICE_CAMERA_DEMO=1 npm run dev -- --webpack --port 3000
```

Open `http://localhost:3000/devices`. The non-persistent demo fallback uses the
existing 宇宙飞船舱 Band (23 clips) and clearly labels it as test footage unrelated
to the selected Batch's physical location. It only applies to unbound Batches,
and `NODE_ENV=production` disables this flag even if someone sets it accidentally.

## Bind a real Batch

1. Deploy the additive Cosmo Embed host behind HTTPS. Its existing static-only
   deployment is insufficient: `/embed-api/*` needs the separate Node service.
2. Explicitly approve the relevant Channel/Band pair and its scheduling timezone
   in Cosmo's config. Allow the exact Putopia parent origin in `allowedParents`.
   Preview origins need their own explicit approval; do not use a wildcard.
3. Set server-side `COSMO_EMBED_ORIGIN` to the exact HTTPS Embed origin. It is
   operator-controlled, not an arbitrary URL supplied in a Batch record.
4. In `/admin/device-batches`, select the Batch → Overview → Scheduled camera.
   Select Cosmo Embed and enter title, Channel ID, Band ID and frame fit.
5. Save a draft, preview the overall Batch, then use the existing explicit publish
   workflow when approved. Saving/publishing writes real shared data even from a
   preview environment; no such action was taken for this integration test.
6. Verify the public Device page on a real portrait phone, including play fallback,
   sound toggle, background/resume, reconnect and the intended schedule timezone.

The optional `liveCamera` field lives in the existing JSON Batch content and
published snapshot; no database migration is required or was applied. Old Batches
without a binding keep their existing placeholder. Removing the binding through
normal draft/publish disables that Batch's camera; clearing the environment setting
disables all camera embeds without changing records.

Example value:

```json
{
  "provider": "cosmo",
  "channelId": "6a0419e515e35a5f46396a85",
  "bandId": "6a0419f615e35a5f46396a8f",
  "title": "Device location camera",
  "fit": "contain"
}
```

Use `contain` to keep the full shot; `cover` crops to fill the frame. Do not reuse
the example as a real location binding without editorial approval.

## Health and safety

- Embed query defaults to silent autoplay, no clock, no controls except sound and
  fallback/retry. The iframe is sandboxed with scripts/same-origin and grants only
  autoplay/fullscreen permissions; no top navigation, forms, camera or microphone.
- Parent validates `event.origin`, `event.source`, protocol version and camera IDs.
- Iframe load does not mean PLAYING: only Cosmo's actual-progress report does.
  A missing heartbeat becomes CONNECTION LOST after 20 seconds.
- The Cosmo snapshot service has a separate 90-second stale-data cutoff. It can
  briefly continue a cached valid schedule during an upstream interruption.
- Cosmo's feed allowlist publishes public playback data. Parent-origin restrictions
  are not a substitute for authentication for private footage.
- Business labels such as UNDER SURVEY stay independent of the scheduled camera.
- No HLS pipeline, OBS capture, new scheduling engine or repeated video ingestion
  is needed in Putopia.

## Verification

`npm run design:check`, `npx tsc --noEmit`, `npm run lint`, `npm test` and
`npm run build` are the required gates. Added pure tests cover binding validation,
safe URL construction, message identity and draft/published snapshot separation.
Browser checks cover actual video progress, clip transitions, silent autoplay,
sound toggles, reconnect, read-only admin field display and 390×844 layout.
No live draft/publish test, physical iOS test or production deployment was performed.
