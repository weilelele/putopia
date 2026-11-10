import { activationLightFrame } from './activation-light'

type Rect = { x: number; y: number; w: number; h: number }

/** Canvas resources and listeners belong to a single mounted welcome, never to the shared app shell. */
export function mountActivationScene(root: HTMLElement, canvas: HTMLCanvasElement, frame?: number) {
  const ctx = canvas.getContext('2d')
  const composite = document.createElement('canvas')
  const beam = document.createElement('canvas')
  const cc = composite.getContext('2d')
  const bc = beam.getContext('2d')
  if (!ctx || !cc || !bc) return () => {}
  const paint = ctx, source = cc, light = bc
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'))
  const tiles = Array.from(root.querySelectorAll<HTMLElement>('[data-pack]'))
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let alive = true, loaded = false, visible = false
  let width = 0, height = 0, elapsed = frame ?? 0, last = 0, request = 0
  let anchors: { x: number; y: number }[] = []
  const positions = [[.5, .55], [.5, .58], [.55, .5], [.5, .5]] as const
  const background = getComputedStyle(root).getPropertyValue('--color-deep').trim() || '#080C20'

  function cover(image: HTMLImageElement, rect: Rect, index: number) {
    const [cx, cy, cw, ch] = index === 1 ? [0, .30, 1, .62] : [0, 0, 1, 1]
    const iw = image.naturalWidth * cw, ih = image.naturalHeight * ch
    const zoom = Number.parseFloat(getComputedStyle(tiles[index]).getPropertyValue('--image-zoom')) || 1
    const factor = Math.max(rect.w / iw, rect.h / ih) * zoom
    const dw = iw * factor, dh = ih * factor
    source.drawImage(image, image.naturalWidth * cx, image.naturalHeight * cy, iw, ih,
      rect.x + (rect.w - dw) * positions[index][0], rect.y + (rect.h - dh) * positions[index][1], dw, dh)
  }

  function draw() {
    if (!loaded || !width || anchors.length !== 4) return
    paint.fillStyle = background
    paint.fillRect(0, 0, width, height)
    paint.globalAlpha = reduced.matches ? .62 : .19
    paint.drawImage(composite, 0, 0, width, height)
    paint.globalAlpha = 1
    if (reduced.matches) return
    const state = activationLightFrame(elapsed)
    const a = anchors[state.index], b = anchors[state.next]
    const x = a.x + (b.x - a.x) * state.progress + Math.sin(elapsed / 1900) * 6
    const y = a.y + (b.y - a.y) * state.progress + Math.cos(elapsed / 2200) * 4
    const radius = width * state.radius * (1 + Math.sin(elapsed / 2700) * .025)
    light.clearRect(0, 0, width, height)
    light.globalCompositeOperation = 'source-over'
    light.drawImage(composite, 0, 0, width, height)
    // Approved photographic reveal for this screen; no surrounding UI lighting or gradients.
    light.globalCompositeOperation = 'destination-in'
    const mask = light.createRadialGradient(x, y, radius * .08, x, y, radius)
    mask.addColorStop(0, 'rgba(255,255,255,.94)')
    mask.addColorStop(.36, 'rgba(255,255,255,.82)')
    mask.addColorStop(.73, 'rgba(255,255,255,.3)')
    mask.addColorStop(1, 'rgba(255,255,255,0)')
    light.fillStyle = mask
    light.fillRect(0, 0, width, height)
    paint.drawImage(beam, 0, 0, width, height)
  }

  function resize() {
    if (!alive) return
    const box = root.getBoundingClientRect()
    width = box.width; height = box.height
    const dpr = Math.min(2, devicePixelRatio || 1)
    for (const surface of [canvas, composite, beam]) {
      surface.width = Math.max(1, Math.round(width * dpr))
      surface.height = Math.max(1, Math.round(height * dpr))
    }
    for (const context of [paint, source, light]) context.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (!loaded || !width || !height) return
    source.fillStyle = background
    source.fillRect(0, 0, width, height)
    const rectangles = tiles.map(tile => {
      const rect = tile.getBoundingClientRect()
      return { x: rect.x - box.x, y: rect.y - box.y, w: rect.width, h: rect.height }
    })
    images.forEach((image, index) => {
      const rect = rectangles[index]
      if (!rect?.w || !rect.h || !image.naturalWidth) return
      source.save()
      source.beginPath(); source.rect(rect.x, rect.y, rect.w, rect.h); source.clip()
      if (index === 2 || index === 3) {
        const polygon = index === 2
          ? [[0, 0], [rect.w, 0], [rect.w * .22768, rect.h], [0, rect.h]]
          : [[rect.w * .79908 + 6, 0], [rect.w, 0], [rect.w, rect.h], [6, rect.h]]
        source.beginPath()
        polygon.forEach(([x, y], i) => i ? source.lineTo(rect.x + x, rect.y + y) : source.moveTo(rect.x + x, rect.y + y))
        source.closePath(); source.clip()
      }
      cover(image, rect, index)
      source.restore()
    })
    anchors = rectangles.map((rect, index) => ({ x: rect.x + rect.w * (index === 0 ? .55 : .5), y: rect.y + rect.h * (index === 0 ? .5 : .52) }))
    draw()
  }

  function tick(now: number) {
    request = 0
    if (!alive || document.hidden || !visible || reduced.matches || frame !== undefined) return
    if (last) elapsed += Math.min(now - last, 80)
    last = now
    draw()
    request = requestAnimationFrame(tick)
  }
  function sync() {
    if (request) cancelAnimationFrame(request)
    request = 0; last = 0
    if (alive && loaded && visible && !document.hidden && !reduced.matches && frame === undefined) request = requestAnimationFrame(tick)
    else draw()
  }
  function motionChanged() { resize(); sync() }
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }, { threshold: .08 })
  const sizing = new ResizeObserver(resize)
  visibility.observe(root); sizing.observe(root)
  document.addEventListener('visibilitychange', sync)
  reduced.addEventListener('change', motionChanged)
  Promise.all(images.map(image => image.decode())).then(() => {
    if (!alive) return
    loaded = true; resize(); root.dataset.ready = 'true'; sync()
  }).catch(() => { /* Keep the linked HTML images visible if any canvas source cannot decode. */ })
  return () => {
    alive = false
    if (request) cancelAnimationFrame(request)
    visibility.disconnect(); sizing.disconnect()
    document.removeEventListener('visibilitychange', sync)
    reduced.removeEventListener('change', motionChanged)
    delete root.dataset.ready
  }
}
