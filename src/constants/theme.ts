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

/**
 * Inter, cargada con expo-font en src/app/_layout.tsx. Cada peso es una familia
 * propia: con fuentes personalizadas el peso se elige con la familia, no con
 * fontWeight (Android y web sintetizarían una negrita encima de la real).
 */
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

// Escala tipográfica del rediseño B (docs/redesign-v2-plan.md §3, Fase 1): la
// jerarquía se apoya en tamaño y color; 800 queda para display y el cuerpo en 400.
export const typography = {
  display: { fontFamily: fontFamily.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  title: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  heading: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26 },
  subheading: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fontFamily.semibold, fontSize: 12, lineHeight: 16 },
} as const;

// Compatibility exports for the remaining Expo starter helpers.
export const Colors = {
  light: { text: colors.text, background: colors.background, backgroundElement: colors.subtle, backgroundSelected: brand.neutral[200], textSecondary: colors.textSecondary },
  dark: { text: colors.darkText, background: colors.darkBackground, backgroundElement: colors.darkSurface, backgroundSelected: colors.darkElevated, textSecondary: colors.darkTextSecondary },
} as const;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export const Fonts = Platform.select({
  ios: { sans: 'Inter_400Regular', serif: 'ui-serif', rounded: 'Inter_400Regular', mono: 'ui-monospace' },
  default: { sans: 'Inter_400Regular', serif: 'serif', rounded: 'Inter_400Regular', mono: 'monospace' },
  web: { sans: 'Inter_400Regular', serif: 'Georgia', rounded: 'Inter_400Regular', mono: 'monospace' },
})!;
export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;
export const MaxContentWidth = 800;
