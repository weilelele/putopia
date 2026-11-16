# Mission Board Console references · Week of 2026-11-16

The two images illustrate original fictional commissions. No live Intel, comment, or Feed post is their source. The device definition, character rules, and internal reference checks are recorded in [the Mission Board examples](mission-board-examples.zh.md#测试口径). The captions identify these as Console concepts.

Both images were produced with built-in ImageGen, then resized to 1080×810 WebP. The player can see them in the public briefing dialog. The corresponding Feed remains a text draft.

## Hardware references

The Console imagery preflight verified the following source files. The three hardware views and right screen master were also inspected at full size before rendering.

| Source | SHA-256 |
| --- | --- |
| `docs/device-reference/originals/01-latest-front-left.jpg` | `c27c42f381ee84641ca2579feba1f410a1aba47a27c389624ac2349dc0a1bbab` |
| `docs/device-reference/originals/02-front-right-render.jpg` | `20a0fdd91188bd2d72b7c438623bc339b3ebac5c993ea4d619fccfca28e0f33b` |
| `docs/device-reference/originals/03-rear-render.jpg` | `7f164e5154bd2b4182341d1eac796e7d30ccd89ce4127d05918038356093f082` |
| `docs/device-reference/ui-reference/right-screen-optic-master.png` | `b962971a10a96ac4a879497cf21cefef6ac5c4068fa0747ea7cca7185d9f4f65` |

## CNT-076 · Bridge signal

- Source scene and edit target: `public/assets/voyager-briefing/console-workshop.jpg`.
- Left-front, close to screen level, on the Kyoto workshop’s wood bench at dusk. The central screen shows a legible bridge, the lamp and a small figure. The left capsule shows 112.4, and the OPTIC capsule stays lit.
- Reviewed the wedge, thin top piece, lower lip and ridged control against the structure references. The lamp is distinguishable at phone size. The image offers a location to observe and leaves the timing of any response open.
- Output: `public/assets/mission-board/cnt-076-console.webp`. SHA-256 `b97bd2b09dafb5e30754114f1e84ef478cd3f9f46116bf67d50308d1aafcf081`.

> Single 4:3 image for a Mission Board illustrative reference. Input 1–3 = fixed structure references; 4 = fixed right OPTIC UI; 5 = the EDIT TARGET for exact scene, framing, device, material and lighting. Keep image 5's framing and composition, silent Kyoto bench workshop, wooden support, credible textures, orange thin plate, receding wedge, front silver surround, broad lower lip, precise left ridged control and both capsule screens. Change only central round screen content and the left readout digits as instructed. The new content is physically behind central glass; preserve exact round edge, blue rim, perspective and shell. No model redesign, camera shift, added objects, signage, branding or overlays. Keep right capsule UI exactly as image 5, with OPTIC. Retain sober low-key depth and real photo texture, but screen clue must be legible in a 294px-wide card. Central scene: one small warm lamp on the far side of a low weathered bridge at dusk and a small still human silhouette nearby, visible along the bridge railing, over still dark river; no response depicted. Left Frequency digits read exactly 112.4, no other numeric modifications.

## OBS-205 · Window signal

- Central screen source: `public/assets/mission-board/obs-window-reference.webp`, the existing generated concept frame for this mission.
- Right-front, looking slightly down from the corner of the wooden bench in soft daylight. The hardware is in focus and the central signal is faint. The left capsule shows 93.6, and the right capsule follows the OPTIC reference.
- Reviewed the right-side control, top slope, face proportions and glass edges. Window mullions and low horizontal shapes remain readable at phone size, with the purpose of the room still unresolved.
- Output: `public/assets/mission-board/obs-205-console.webp`. SHA-256 `5a6558e9f240ceb30200b79d02f0523a57d92987d3a77eae8cdda33f0cc5e7d7`.

> One photorealistic landscape 4:3 candid camera photograph of the exact Multiverse Console at the Kyoto workshop's wooden bench for OBS-205. Inputs in order: 1–3 lock the precise authentic hardware geometry and finish, 4 is the actual right OPTIC UI, 5 is the world image to put INSIDE the round screen. Refer directly to image 2 to shoot from FRONT RIGHT, 20 degrees off center and slightly looking down, standing person at the corner of the bench. Soft natural overcast morning window light, grain in old wood, a plain workshop with shelves only if natural/out of focus, a slightly asymmetrical natural frame with whole Console still large. Preserve the exact receding wedge, thin top orange plate, broad front lip, recessed silver outline, two side capsule screens, correct right silver knurled knob with orange sweep lever, central circular glass with real perspective and thin original blue ring. Focus crisp on body and rim. Inside the round glass alone, show deliberately faint low-detail signal of image 5: hazy window mullions and barely discernible rows of low rectangular silhouettes, ambiguity whether desks, sober grey. Clear enough to see there are shapes, but worlds remain hard to identify. Left capsule digits precisely 93.6 without added physical units. Right capsule obeys actual OPTIC reference. No branding, extra objects, overlays or random text. Real camera optical exposure and reflections, not shiny CGI.

## Weekly preparation

Evaluate image usefulness for every mission, then prepare Console images for two briefs in the upcoming edition. Choose distinct camera positions and keep the housing faithful to its design references. Set the center picture’s clarity according to the brief. REC and CNT images can show enough detail to identify a landmark or observation point. OBS images can preserve uncertainty without losing the clue. The weekly editorial work should update `weeklyMedia` by exact mission ID, so each attachment belongs to a single edition. Run `node --experimental-strip-types --input-type=module -e "import {getPublicMissionEdition} from './src/lib/mission-board.ts'; console.log(getPublicMissionEdition(Date.parse(process.argv[1])))" '2026-11-23T00:00:00+08:00'` with the intended Monday to inspect its public missions.
