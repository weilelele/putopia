# Voyager Briefing media

Media for the first-visit Voyager Initiation briefing (`src/app/voyager-initiation/briefing/`). Re-encoded copies of existing approved project media, plus one original soundtrack synthesised in-repo.

| File | Source |
| --- | --- |
| console-film.mp4 | Page 1's single 12 s loop, 3 s per shot in this order: `public/assets/device-reel-v2-20261016.mp4` 4.9–7.9s (static to a tuned world); `public/assets/device-reel.mp4` 14–17s (real footage of the physical Console); `output/console-imagery/2026-10-16-fairy-full-regenerated/fairy-full-regenerated-v1-final20s.mp4` 6.5–9.5s; `output/console-imagery/2026-10-16-world-tuning-v2/world-C-starry-v3-tuning-fix-final.mp4` 7.5–10.5s. Each shot rises from and falls to black over 1.14 s (smoothstep, baked in), so cuts and the loop seam are hidden. 960×720 centre crop for page 1's 4:3 frame, H.264 High CRF 29, no audio, keyframe per shot, faststart. The whole file downloads before the briefing opens (`briefing-receive.tsx`), so keep it under about 1 MB |
| console-real.jpg | Still of the real footage (`device-reel.mp4`). Poster for console-film.mp4 and the reduced-motion view of page 1 |
| console-press.mp4 / .jpg | `device-reel-v2-20261016.mp4` 13.4–18s (top button press) |
| console-reel.mp4 | `device-reel-v2-20261016.mp4`, 960px, no audio |
| london-device.mp4 / .jpg | Worlds Explore live room `london-01` clip (cosmo asset 6a8566e041b16262cb633bb9) |
| world-bunker.jpg | `output/console-imagery/2026-10-21-libtv-wasteland/world-B-desert-relay-v1.png` (built-in ImageGen world reference, sha256 a721774f…), 720px JPEG. Parallax Array example, illustrative |
| world-flooded.jpg | `output/console-imagery/2026-10-21-libtv-wasteland/world-C-flooded-city-v1.png` (sha256 f23206c9…), 720px JPEG. Parallax Array example, illustrative |
| intel-questions.jpg, robot-library.jpg, console-workshop.jpg, voyager-badge.jpg, pack-*.jpg | JPEG copies of existing `public/` images for canvas drawing and smaller payloads |
| console-unboxing.mp4 / .jpg | Owner footage `IMG_8621.MOV` (via `orientation-reel/public/media/b8621.mp4`) 0–7.8s, the opening scene of the Speedrun orientation film: same speed ramp (0.4× → 0.6× → 0.8× → 1×, 10.8 s), 1080² crop at x=320, 540² H.264 CRF 28, no audio (the on-screen static barely compresses; 720² was 2.9 MB). Closing-page clip |
| console-desk.jpg | Owner-supplied Console poster (sha256 8a64a3fe…, 1122×1402) recomposed to portrait with its overlaid title and caption removed by a Codex image edit (`gpt-6-astra`, delegated image model reported as gpt-image-2), 948×1659 JPEG. Closing-page still |
| briefing-theme.mp3 | Original 96 s seamless loop "Signal From Elsewhere" (D minor, 80 BPM), synthesised by `scripts/audio/briefing-theme.py`; no samples or third-party audio |
