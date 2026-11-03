# Voyager Initiation: inline Intel links

User reference: the two orange links beneath Classified Intel & Votes should occupy one row. Preserve the existing featured image and copy.

Keep `Explore intel`; shorten `See current votes` to `View votes`. Destinations remain `/intel?tab=classified` and `/vote?tab=classified`.

Use the existing Courier Prime, orange, 16px text, 20px arrows, and minimum 44px link height. Change only the link group's column gap to `--s-2` (8px) and the label/arrow gap to `--s-1` (4px). Individual labels do not wrap. The group may wrap if enlarged text requires it.

Verified in the local unpaid fixture with no service credentials or payment writes:

| Viewport | Document / scroll width | Link widths | Same row | Text / height |
| --- | --- | --- | --- | --- |
| 390×844 | 390 / 390 | 148.72px + 119.94px | yes | 16px / 44px |
| 320×844 | 320 / 320 | 148.72px + 119.94px | yes | 16px / 44px |
| 1280×900 | 1280 / 1280 | 148.72px + 119.94px | yes | 16px / 44px |

Screenshot: [mobile-390.png](mobile-390.png).

Validation: design check, TypeScript, ESLint (0 errors, 26 pre-existing warnings), 940 tests, production build, and diff whitespace check.
