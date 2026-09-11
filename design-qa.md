# Design QA — launch proportions and primary-tab loading

## Source of truth

- Selected direction: `/Users/will/.codex/generated_images/01a08878-8dc2-7d01-a752-da09efc4df3d/exec-9e0a0749-9136-49e1-afa5-9d15551b7570.png`
- Shared implementation: `src/components/primary-tab-loading.tsx`
- Launch implementation: `src/app/welcome/page.tsx` and `mobile/LaunchScreen.tsx`
- Review viewport: 390 × 844 CSS px at 1× browser density; secondary launch check at 844 × 390.
- Review state: Intel selected, first useful tab data pending; launch animation fully settled and inside the automatic hold.

## Full-view comparison

- Side-by-side evidence: `/private/tmp/putopia-loading-qa-comparison.png`
- Implementation capture: `/private/tmp/putopia-loading-route-final.png`
- The implementation keeps the selected direction's hierarchy: brand, retrieval label, three-part rail, lead media block, three content rows, and persistent primary navigation.
- Content spacing was deliberately compressed relative to the generated concept so the shell matches the denser production pages and avoids a large empty transition surface.
- Brand size follows the product header component rather than the oversized concept header. This is required by the current root-page logo rule.

## Focused checks

| Area | Result | Evidence |
| --- | --- | --- |
| Target-tab feedback | Pass | Intel becomes orange immediately through optimistic navigation state. |
| Layout stability | Pass | Media, metric, and registry variants reserve the final content shapes without shimmer or fake progress. |
| Bottom navigation | Pass | It remains fixed and visible on portrait routes; desktop and short landscape continue to use the sidebar. |
| Launch wordmark | Pass | 390 × 844: 280.44 × 70.31 px. 844 × 390: 492 × 123.35 px. |
| Launch symbol | Pass | 48 × 26.80 px in both tested orientations, with a 24 px visual gap. |
| Launch timing | Pass | Playback completed after 2.724 s; automatic navigation occurred 3.008 s later. |
| Reduced motion | Pass by implementation review | Static protected wordmark and symbol use the same sizing; the three-second hold starts after the static asset is ready. |
| Browser console | Pass | No warning or error entries on the UI Kit fixture. |

## Findings and iteration history

- P0: none.
- P1: none.
- P2 resolved: the first draft used an 88 px symbol and a wordmark that could occupy almost the entire viewport. The final values use a 48 px symbol, 82% of available wordmark width, a 520 px maximum, and a 24 px gap on web and iOS.
- P2 resolved: route fallbacks previously exposed generic blocks or an empty transition. The final shared shell is used by Dashboard, Intel, Devices, Worlds, and Voyagers; Intel and Voyagers also cover their client-fetch interval.
- P2 resolved: the loading concept initially depended on a shimmer. The final state is static, follows the design system's flat-surface rule, and avoids motion during an already transient state.

## Interaction verification

- Pointer and keyboard activation of the launch surface still enter Dashboard immediately.
- Without interaction, navigation begins only after the full flip/spread sequence and the subsequent three-second hold.
- Primary navigation retains 44 px-or-larger targets and exposes `aria-busy` while a destination is pending.
- The loading content announces one polite status and hides decorative skeleton geometry from assistive technology.

## Final result

passed
