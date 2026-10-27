# Activation welcome media · 2026-10-27

Scope: only the approved account-activation welcome. Original public product assets remain unchanged.

| Delivered WebP | Source | Processing |
| --- | --- | --- |
| console.webp | public/assets/kyoto-one-20260910/01-warehouse-hero.png | Same source, 1200px wide, quality 88; runtime zoom 1.06 |
| welcome-pack.webp | public/voyager-pack/pack-email.png | Same source, 420px wide, quality 88; runtime crop/zoom from the approved prototype |
| antenna.webp | Built-in ImageGen edit exec-9ca1e5e2-ba18-4541-819b-8702c85113b0.png | Existing antenna-still-life-v1.jpg reference, expanded tabletop; WebP 1200px, quality 88 |
| fourth-delivery.webp | Built-in ImageGen edit exec-4a0b44c9-c32e-41be-8fd6-271597d4d537.png | Existing fourth-delivery.png, then edit exec-ba57ad24-85b4-4b95-9862-36212d77901b.png as final reference; expanded tabletop; WebP 1200px, quality 88 |

User approved making the Antenna group smaller and the sealed envelope smaller still, without altering the layout or adding black margins. The wider-framed variants fill the original masked regions naturally. They were reviewed for photo realism, original object types/materials, continuous desktop, sealed/unrevealed envelope, and source family consistency. These are illustrative variants rather than photographs of confirmed delivered goods; small source details can vary. Antenna remains design studies, not promised quantities/finishes. No new Console hardware was generated.

The exact final prompts are retained below. Built-in tool used throughout, no CLI generation fallback. SHA-256 values of delivered assets are in media-hashes.json.

## Antenna reference edit

Reference: public/assets/voyager-initiation/antenna-still-life-v1.jpg

```text
Edit the attached Antenna product still-life photograph for a website tile. Preserve EXACTLY the same three objects, their concentric ring geometry, materials (brass gold rear, ivory silver left, navy with orange rim foreground right), their relative arrangement, photographic perspective, colors, warm natural lighting and contact shadows. The ONLY change is a wider camera framing: uniformly reduce the ENTIRE three-object group to 85% of its current linear size, centered at the same group centroid, and extend the existing walnut desktop naturally around it to fill every edge of the same 3:2 landscape frame. All three objects must remain intact. Object shapes must not be redesigned or simplified. The desk must cover the entire frame, with coherent organic wood grain, no repeating or mirrored edge texture, no new props, no extra objects, no lettering. Photorealistic, same scene viewed from slightly farther away, no lighting change, no blur or stylization, no borders, no flat empty bars or letterboxing. This is a surgical reframing of an existing concept asset, not a new product design.
```

## Envelope first edit

Reference: public/assets/voyager-initiation/fourth-delivery.png

```text
Edit the attached sealed-envelope still-life photograph for a website tile. Preserve the EXACT SAME single matte deep navy envelope, flap shape, orange circular wax seal and its existing embossed concentric-ring symbol, faint embossed orbital lines, paper grain, warm sidelight, camera perspective, and closed unrevealed state. ONLY widen the framing: make the ENTIRE sealed envelope uniformly about70% of its present linear size within the SAME 3:2 landscape frame, keeping its center around the center of the image. Reveal more of the existing walnut desk naturally all around; the envelope must remain fully closed and no contents may appear. Preserve the existing antique map and partial compass as peripheral background elements only; do not add any new props, words, typography or symbols. Every edge of the output must be filled by continuous photographic desktop/background, no borders, no black bars or letterboxing. Photograph should look like the same scene from a little farther away. Natural coherent wood grain without tiled or mirrored patterns. Do not redesign, distort or restyle the envelope or seal. Photorealistic source-preserving reframing, no stylization, no new lighting effects.
```

## Envelope final edit

Actual reference: the first envelope edit listed above.

```text
Refine the attached photograph by zooming out the sealed envelope further. This is a precise scale/framing edit: keep the single navy sealed envelope identical in shape, paper texture, subtle embossed orbit details, orange round wax seal and existing seal emblem, preserve the same perspective and lighting. In the output, the envelope's bounding box must occupy only about42% of the full image width and about43% of full image height, with its center around52% across and55% down. It is currently about57% of image width; make it appreciably smaller. Keep the same landscape3:2 frame. Fill all newly exposed area with naturally continuous walnut desktop and the same peripheral map/partial compass. No letterboxing, no frames, no flat empty strips, no new objects, no new lettering, no duplicate seals, no open flap or revealed contents. Organic coherent wood grain and natural photography, not a render. The entire purpose is a smaller envelope surrounded by more of its existing tabletop.
```
