/** The route owns its scroll on phones; the shared shell owns it on desktop. */
export function getRouteScrollContainer(route?: HTMLElement | null): Element | null {
  const candidates = route
    ? [route, route.closest<HTMLElement>('.app-shell')]
    : [...document.querySelectorAll<HTMLElement>('main, .main'), document.querySelector<HTMLElement>('.app-shell')]

  return candidates.find(element => element && /auto|scroll/.test(getComputedStyle(element).overflowY))
    ?? document.scrollingElement
}
