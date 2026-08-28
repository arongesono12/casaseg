import { Platform } from 'react-native';

export const colors = {
  brand: '#2563EB',
  brandDark: '#1D4ED8',
  primary: '#3B82F6',
  // Equivalente azul de accentSoft, para los fondos de selección y foco.
  brandSoft: '#EFF6FF',
  accent: '#14B8A6',
  accentDark: '#0F766E',
  accentSoft: '#ECFDF5',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  subtle: '#EEF2F7',
  text: '#0F172A',
  textSecondary: '#475569',
  muted: '#94A3B8',
  border: 'rgba(15,23,42,0.12)',
  darkBackground: '#0A0A0A',
  darkSurface: '#141414',
  darkElevated: '#1E1E1E',
  darkText: '#F8FAFC',
  darkTextSecondary: '#CBD5E1',
  darkBorder: 'rgba(255,255,255,0.12)',
  success: '#059669',
  warning: '#F59E0B',
  error: '#EF4444',
  favorite: '#F43F5E',
} as const;

// El azul abre todo gradiente de marca y es el color dominante de la interfaz.
// El teal queda de apoyo: cierra el degradado y marca la confianza (verificado,
// disponible, reserva segura), pero ya no lidera nada.
export const actionGradient = ['#2563EB', '#0E7490'] as const;
export const brandGradient = actionGradient;
export const exploreGradient = actionGradient;

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

export type AppPalette = {
  background: string;
  surface: string;
  elevated: string;
  subtle: string;
  text: string;
  textSecondary: string;
  muted: string;
  border: string;
  brand: string;
  primary: string;
};

export const lightPalette: AppPalette = {
  background: colors.background,
  surface: colors.surface,
  elevated: colors.surface,
  subtle: colors.subtle,
  text: colors.text,
  textSecondary: colors.textSecondary,
  muted: colors.muted,
  border: colors.border,
  brand: colors.brand,
  primary: colors.primary,
};

export const darkPalette: AppPalette = {
  background: colors.darkBackground,
  surface: colors.darkSurface,
  elevated: colors.darkElevated,
  subtle: colors.darkElevated,
  text: colors.darkText,
  textSecondary: colors.darkTextSecondary,
  muted: colors.muted,
  border: colors.darkBorder,
  brand: colors.brand,
  primary: '#60A5FA',
};

// Compatibility exports for the remaining Expo starter helpers.
export const Colors = {
  light: { text: colors.text, background: colors.background, backgroundElement: colors.subtle, backgroundSelected: '#E2E8F0', textSecondary: colors.textSecondary },
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
