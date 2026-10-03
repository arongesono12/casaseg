import { Platform } from 'react-native';

import { brand, colors } from './brand';

// Colores, degradados y paletas viven en brand.ts (derivados del logo).
export { actionGradient, brand, brandGlow, brandGradient, colors, darkPalette, exploreGradient, heroGradient, lightPalette, withAlpha } from './brand';
export type { AppPalette } from './brand';

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  hero: 32,
  pill: 999,
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
// Use one accessible interaction size across iOS and Android.
export const touchTarget = 48;

// Compatibility exports for the remaining Expo starter helpers.
export const Colors = {
  light: { text: colors.text, background: colors.background, backgroundElement: colors.subtle, backgroundSelected: brand.neutral[200], textSecondary: colors.textSecondary },
  dark: { text: colors.darkText, background: colors.darkBackground, backgroundElement: colors.darkSurface, backgroundSelected: colors.darkElevated, textSecondary: colors.darkTextSecondary },
} as const;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'system-ui', serif: 'Georgia', rounded: 'system-ui', mono: 'monospace' },
})!;
export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;
export const MaxContentWidth = 800;
