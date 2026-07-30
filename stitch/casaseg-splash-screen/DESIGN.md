# CasaSeg onboarding — Stitch design reference

## Source

- Stitch project: `13004628213775289820`
- Mobile canvas: `768 × 1376`
- Screens: splash, property discovery, community trust, and get started
- The Stitch API exposes screenshots for these four screens, but their `htmlCode` entries are empty.

| Screen | Stitch ID | Downloaded reference |
| --- | --- | --- |
| Casaseg Splash Screen | `0dc60b68989f44f585eb3cb4e3551684` | `0dc60b68989f44f585eb3cb4e3551684/screen.png` |
| Onboarding: Discover Properties | `2e71ab85bc00415d9eeadc54f657ef4f` | `2e71ab85bc00415d9eeadc54f657ef4f/screen.png` |
| Onboarding: Community Trust | `739c0b88af614954b84dbde4a7eb8c90` | `739c0b88af614954b84dbde4a7eb8c90/screen.png` |
| Onboarding: Get Started | `d176e6fd6c8f493ab929eac32fc00db6` | `d176e6fd6c8f493ab929eac32fc00db6/screen.png` |

## Visual direction

CasaSeg uses a light, optimistic real-estate aesthetic. A very pale cyan-to-white-to-blush gradient connects every screen. The interface is editorial and spacious: small wordmark, oversized black headings, short supporting copy, one strong blue action, and generous open space.

## Tokens

- Background gradient: `#EEFCFC → #FFFCFA → #FFE9EC`
- Primary action gradient: `#2D72DE → #2698C7`
- Accent coral: `#E55E45`
- Display text: `#05090D`
- Body text: `#15191D`
- Muted blue-gray: `#AFC3CC`
- Corners: `12px` for property media; full-pill actions
- Typography: system sans, heavy display weight (`900`), compact negative tracking

## Screen structure

1. Splash: centered CasaSeg wordmark, compact circular loader, three small progress dots.
2. Discover: wordmark, two-line headline with coral location emphasis, real property image, explanatory copy, blue primary action, coral skip action.
3. Community: centered wordmark and headline, three equal metrics, real member avatar stack, page dots, quiet text action.
4. Get started: original illustrated neighborhood hero, high-contrast white heading and copy over blush, blue pill CTA, sign-in link.

## Motion

- Content enters with short staggered opacity, translate, and scale transitions.
- Property media uses a very subtle reversible zoom.
- Splash loader rotates continuously.
- Pagination changes with scale and opacity only.
- Reduced-motion users receive immediate states and no looping movement.

## Data rules

- The discover image must come from an active CasaSeg property returned by Supabase.
- Community counts and avatars must come from the public onboarding community query.
- No sample counts, fake avatars, or hard-coded property photography may replace live data.
