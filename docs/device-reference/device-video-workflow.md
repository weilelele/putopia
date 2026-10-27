# Reusable device demonstration video workflow

Updated: 2026-10-22. Start here whenever making another Multiverse Console operation video.

This is a documented production recipe with assets saved in LibTV, not a single executable automation. Model availability and prices must be checked on every run.

## Authoritative records

- [Detailed operation sequence, cost controls and delivery requirements](device-video-design.zh.md). Its wasteland scenery is one variant; the operation sequence is reusable.
- [Confirmed product operations](console-operations.zh.md).
- [General production principles](production-workflow.zh.md).
- [LibTV source canvas](https://www.liblib.tv/canvas?projectId=b6779f6cf5d64739ace7935be1ad9c78&spaceId=12421218). Project ID: `b6779f6cf5d64739ace7935be1ad9c78`, space ID: `12421218`. Design text node: `t-AhzvSwdq08`.
- Clean fairy operation source: `output/console-imagery/2026-10-21-libtv-wasteland/source-fairy-complete20s-720p.mp4`; LibTV node `v-MLc8EIKKwC`, Resource `res_1f8366a172f448939438c91536c11973`.

## Inputs for each run

### Physical camera placement — required before image generation

**Core world rule, confirmed by the user on 2026-10-22:** every parallel world shown inside the round screen is the feed of a fixed camera located in that world. Its position, orientation and focal length stay constant throughout observation, charging and response. No pan, tilt, orbit, dolly, zoom, handheld shake, stabilization drift or cut to another viewpoint. Weather, water, vegetation, people and other world subjects may move independently around that fixed observer. Strong world feedback must not shake or displace the internal camera. An external product-shot camera moving around the physical device is a separate camera; evaluate the world view relative to the round display, not to the output video's frame.

Every parallel world is observed by a camera physically located inside that world. Define its exact location, support or mount, lens height above that support, viewing direction, and surrounding medium (air, underwater, or across a water surface). Examples: resting on soil, secured to a windowsill/table, or attached to a wall inside a building. These are alternatives, not required props in every world.

The resulting perspective must follow that placement. Include a restrained foreground cue where helpful: near-ground texture, a sill edge, wall occlusion or appropriate underwater optics. These cues are optional evidence, not mandatory scenery or a decorative border. A missing visible sill alone does not prove camera motion or violate the fixed-camera principle. Define the physical support in the brief even when it is outside the crop. Avoid unsupported road-height viewpoints, an implied handheld operator, floating cinematic viewpoints, camera drift and unexplained viewpoint changes. The camera itself need not appear in its own image.

Approve camera plausibility alongside the reference image before any paid video test. During review, compare stable world landmarks relative to the circular display after accounting for the external device shot's perspective; movement of the whole device in the output frame is not evidence that the internal camera moved. A world reaction must leave this observation position and direction fixed.

Record a world name/version, setting and period, independent world image, two visible layers of natural movement, one stronger response after transmission, source video/time range, and an approved credit budget. Device color is a separate input: changing it requires an approved device plate and a hardware-preservation test; it is not guaranteed by a world-only edit.

## Repeatable steps

1. Read the operation specification and previous review notes. Verify LibTV connection, exact project, source node and live model schema.
2. Generate one independent world reference first. Keep its important content inside the central 65% for circular cropping. No device, hands, frame, ring, UI or text in the image. Save the prompt and version.
3. Reuse the clean operation source rather than a repeatedly edited derivative. Prepare only the source interval needed for a short test; keep original-time coordinates and source identity.
4. Quote one 6–10 second test before paid generation. Default to Seedance 2.0 for world-motion exploration where supported. For preserving existing hands/device/ring, use a model that actually supports video editing, such as the previously tested Kling O3, and compare its live quote. Do not silently upgrade to 2.5. Without an agreed budget, obtain confirmation of the actual quote first.
5. Review baseline movement, continuous hold, response timing, camera stability, circular masking, device geometry, hands, side UI and ring. AI editing aims to preserve these; it does not guarantee pixel identity.
6. After approval, produce the full sequence: static 0–2s → gradual left-knob tuning 2–7s → autonomous world motion 7–12s → approach button 12–13s → continuous hold 13–16s → stronger world response 16–20s. Align to actual source gestures. Validate tuning separately if the short test omits it. Respect live model duration limits.
7. Download the platform-authorized watermark-free original (`watermark=remove` in LibTV delivery). Check corners, decode the complete video, record resolution/duration/hash and review findings. Never present a marked preview as the final asset.
8. Save the original result, prompt, node/task IDs, quote/actual cost and review in a dated directory under `output/console-imagery/`. Only approved assets enter website delivery and random playback lists. Website replacement is a separate requested step.

## Known limitations

The fairy source has an expanding charging ring; the intended product ring contracts inward over at least three seconds. A world-only preservation test retains this known source flaw and must record it. Some generated side-screen lettering may drift. Full 20-second continuity and changed device colors need their own review.

## World runs

- [Wasteland operation design](device-video-design.zh.md), 2026-10-21.
- [1980s rural supernatural world brief](../../output/console-imagery/2026-10-22-libtv-rural80s/brief.md), 2026-10-22.

Future request template: “Use the device video workflow. World: __. Camera location/support/height/direction/medium: __. Baseline motion: __. Response: __. Device plate/color: existing / __. First test: __ seconds. Credit budget: __.”
