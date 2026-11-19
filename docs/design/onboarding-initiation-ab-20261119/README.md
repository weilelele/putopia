# Onboarding Initiation A/B UI verification

Reference: the user-approved local prototype, finalized with
`Your initiation starts here.`, `START INITIATION`, and
`Activation email sent to`. No extra activation/spam reminders in test.

The fixture uses the exact shared production success component and the same
bundled Console film. Production retains campaign-selected onboarding videos.
Control was extracted from the original component without changing its text,
mailbox primary action or Console bypass. Only the test receives the new layout.

| Viewport | Evidence | Result |
| --- | --- | --- |
| 390×844 portrait | `test-390.jpg`, `control-390.jpg` | Readable 24px heading / 16px body / 12px metadata; main action and mailbox action visible. |
| 320×740 portrait | `test-320.jpg` | Natural wrapping, full labels, no horizontal overflow. |
| 1280×900 desktop | `test-desktop.jpg` | Centered 432px column, no horizontal overflow. |
| Briefing transition | `briefing-390.jpg` | START INITIATION opens briefing page 1 of 9 without an activation detour. |

Palette, font, spacing and button styles use existing design-system tokens and
shared Archive controls. The primary/secondary hierarchy matches the approved
prototype. Mailbox-provider selection and email correction are retained; an
unknown provider does not point to Gmail.

Verified local-only email edit/confirmation with normalization, test/control
switching, button navigation, loaded briefing, and the three viewport sizes.
All fixture submissions stay in React state, without production applications,
email sends, experiment enrollment or payments.

Release checks: design check, TypeScript, full ESLint (0 errors; existing
warnings), 1,100 pure tests, and the production build with placeholder service
configuration passed. React review: no SDK initialization duplication, hooks
remain unconditional, async restoration cancels after cleanup, flag waits are
bounded, and preview/production reuse the same success component.
