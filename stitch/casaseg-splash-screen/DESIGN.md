# CasaSeg onboarding — Stitch design reference

## Source

- Stitch project: `13004628213775289820`
- Mobile canvas: `768 × 1376`
- Screens: splash, property discovery, community trust, and get started
- The Stitch API exposes screenshots for these four screens, but their `htmlCode` entries are empty.

| Screen | Stitch ID | Reference |
| --- | --- | --- |
| Casaseg Splash Screen (original) | `0dc60b68989f44f585eb3cb4e3551684` | `0dc60b68989f44f585eb3cb4e3551684/screen.png` |
| Casaseg Splash Screen (revisión azul actual) | `7cd86ad8ac0b4397977e17fdecf7c72d` | Consultada mediante MCP de Stitch |
| Onboarding: Discover Properties (original) | `2e71ab85bc00415d9eeadc54f657ef4f` | `2e71ab85bc00415d9eeadc54f657ef4f/screen.png` |
| Onboarding: Discover Properties (revisión azul actual) | `53439ca0bcbd401c9da2f5411b42f8eb` | Consultada mediante MCP de Stitch |
| Onboarding: Community Trust (original) | `739c0b88af614954b84dbde4a7eb8c90` | `739c0b88af614954b84dbde4a7eb8c90/screen.png` |
| Onboarding: Community Trust (revisión azul actual) | `53534dce33624906babd7deec1d6aa89` | Consultada mediante MCP de Stitch |
| Onboarding: Get Started (original) | `d176e6fd6c8f493ab929eac32fc00db6` | `d176e6fd6c8f493ab929eac32fc00db6/screen.png` |
| Onboarding: Get Started (revisión azul actual) | `5e538b51b0c84796b83494fa13504690` | Consultada mediante MCP de Stitch |

## Visual direction

All four onboarding screens follow Stitch's blue revision: clean white-to-pale-blue backgrounds, the house-and-key logo, navy typography, cool blue illustrations and actions. The original screenshots remain in this folder as earlier references. Native components keep text translatable and support the app's light/dark palettes. Discover and Get Started each have a separate night illustration selected when the resolved theme is dark.

## Tokens

- Splash background: `#FFFFFF → #F3F9FD → #EBF6FC`
- Splash wordmark: `#0D2E49` (light), `#F2F6F9` (dark)
- Blue indicator: `#2382BC`; icon: existing CasaSeg logo
- Native splash background: `#F3F9FD` (light), `#0B131B` (dark)
- Corners: `10px` for metric cards; full-pill primary actions
- Typography: Inter ExtraBold (`800`) for splash wordmark and headings

## Screen structure

1. Splash: centered uppercase CASASEG wordmark and icon, compact circular loader, three small progress dots. The native splash uses the same lockup as a static image; the onboarding splash adds the motion.
2. Discover: wordmark, two-line navy headline with blue location emphasis, blue house illustration, explanatory copy, blue pill action and skip link.
3. Community: centered wordmark, headline and subtitle, three pale-blue metric cards, real member avatar stack, page dots and quiet next action.
4. Get started: top wordmark, blue neighborhood illustration, navy heading and copy, blue pill CTA and sign-in link.

## Motion

- Content enters with short staggered opacity, translate, and scale transitions.
- Splash loader rotates continuously.
- Pagination changes with scale and opacity only.
- Reduced-motion users receive immediate states and no looping movement.

Regenerate the static native lockups on Windows with `pwsh -File scripts/generate-splash.ps1` after changing the icon or Inter font.

## Data rules

- Discover and Get Started illustrations are static, generic artwork derived from the corresponding Stitch screens; each has light and dark assets and does not represent an individual listing.
- Community property/owner/member counts and avatars come from the public onboarding community query.
- The available-plans metric uses active plans from `owner_plans`. If that catalog is unavailable, the third card shows the live member count instead.
- No sample counts, fake avatars, or hard-coded property photography replace live data.
