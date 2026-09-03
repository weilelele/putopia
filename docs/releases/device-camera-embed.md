# Device camera Embed integration

## Scope

Device pages can show an existing Cosmo Band as a scheduled camera through an
isolated iframe. Cosmo owns all scheduling, clip selection, preloading and playback.
Putopia stores only a binding and uses validated health messages to light LIVE.
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
existing 宇宙飞船舱 Band (23 clips). This is test footage unrelated to the selected
Batch's physical location; the minimal public view has no extra demo banner.
It only applies to unbound Batches,
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
6. Verify the public Device page on a real portrait phone, including muted autoplay,
   background/resume, automatic reconnect and the intended schedule timezone.

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

- Device requests silent autoplay, `controls=0`, and the Cosmo schedule clock.
  Only video, blinking LIVE, time and Batch location are visible. No sound, retry,
  playback-status or extra metadata rows are shown. The iframe is sandboxed with
  scripts/same-origin and grants only autoplay; no top navigation or forms.
- Parent validates `event.origin`, `event.source`, protocol version and camera IDs.
- Iframe load does not mean playing: only Cosmo's actual-progress report does.
  LIVE is hidden when not playing or after 20 seconds without a heartbeat. A dead
  iframe is quietly reloaded after 60 seconds without messages.
- The Cosmo snapshot service has a separate 90-second stale-data cutoff. It can
  briefly continue a cached valid schedule during an upstream interruption.
- Cosmo's feed allowlist publishes public playback data. Parent-origin restrictions
  are not a substitute for authentication for private footage.
- Business labels such as UNDER SURVEY stay in the existing Batch content, not
  additional rows around the camera.
- No HLS pipeline, OBS capture, new scheduling engine or repeated video ingestion
  is needed in Putopia.

For synchronized OBS output, use the same `/embed/:channelId/:bandId` URL as an
OBS Browser Source with `autoplay=1&muted=1&controls=0&clock=0&fit=contain`.
The untouched legacy `/obs` route uses that machine's local time, so it is not an
unconditional cross-timezone synchronization reference. The new output and Device
share server time, configured feed timezone, clip order and position calculation.
The visible clock comes from that timeline, never an independent Putopia clock.
This is approximate realtime schedule alignment (0.5-second correction threshold),
not frame-accurate synchronization or a captured OBS video stream.

The camera also reuses the existing observation-room `signalFeed` presentation:
continuous low-level analog jitter/flutter plus a 920ms reacquisition burst at a
random 45–90 second interval. This is a CSS-only layer over the iframe. Unlike the
old Dreamcatcher implementation, it never changes the active asset; all clip changes
remain controlled by Cosmo's synchronized schedule. A short `buffering` state during
an A/B clip handoff keeps LIVE visible after playback has started. Error, paused,
unavailable and autoplay-blocked states still remove LIVE. Reduced-motion preference
disables the glitch animations.

## Verification

`npm run design:check`, `npx tsc --noEmit`, `npm run lint`, `npm test` and
`npm run build` are the required gates. Added pure tests cover binding validation,
safe URL construction, message identity and draft/published snapshot separation.
Browser checks cover actual video progress, clip transitions, silent autoplay,
automatic recovery, read-only admin field display and 390×844 layout. The minimal
view removes the initially tested sound/reconnect controls.
No live draft/publish test, physical iOS test or production deployment was performed.
