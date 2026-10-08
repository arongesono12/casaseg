// Fuente única de los colores de CasaSeg, derivada del logo (public/logo/logo.svg).
//
// El logo usa cuatro azules en degradado. De ellos sale todo lo demás:
// - `deep` es el color de acción: botones, enlaces, selección. Es el único azul
//   del logo que admite texto blanco encima (6:1).
// - `mid` y `sky` son los tonos de apoyo: finales de degradado, iconos
//   secundarios y el modo oscuro. `sky` NO sirve para texto ni para iconos sobre
//   blanco (2,6:1); solo como decoración.
// - El gris del logo es el neutro del texto.
//
// tests/unit/brand-palette.test.ts comprueba el contraste de cada combinación y
// que nadie vuelva a escribir a mano colores de la identidad anterior.

export const brand = {
  logo: {
    deep: '#1D66A3',
    mid: '#2898D1',
    sky: '#36A9E1',
    cyan: '#009FE3',
    graphite: '#3C3F3F',
  },
  /** Escala de azules derivada de `deep`, de más claro a más oscuro. */
  blue: {
    50: '#F3F9FD',
    100: '#EBF6FC',
    200: '#CFE8F6',
    300: '#8FCBEE',
    400: '#5CB8EA',
    500: '#2382BC',
    600: '#1D66A3',
    700: '#164D7A',
    800: '#113B5E',
    900: '#0D2E49',
  },
  /** Neutros con el matiz del gris del logo. */
  neutral: {
    0: '#FFFFFF',
    50: '#F7FAFC',
    100: '#EDF3F8',
    200: '#DCE5EC',
    300: '#C3CDD5',
    400: '#7A8084',
    500: '#61676A',
    700: '#3C3F3F',
    900: '#1F2224',
  },
  dark: {
    background: '#0B131B',
    surface: '#121C26',
    elevated: '#1A2733',
    text: '#F2F6F9',
    textSecondary: '#B6C3CE',
    muted: '#7F8D99',
  },
} as const;

/** El mismo color con transparencia: `withAlpha(colors.brand, 0.12)`. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

export const colors = {
  brand: brand.logo.deep,
  brandDark: brand.blue[700],
  /** Segundo azul de marca: finales de degradado e iconos de apoyo. */
  primary: brand.logo.mid,
  brandSoft: brand.blue[100],
  // El turquesa desapareció con el logo nuevo. `accent*` se mantiene como alias
  // para los elementos de confianza (verificado, disponible), ahora en azul.
  accent: brand.logo.mid,
  accentDark: brand.logo.deep,
  accentSoft: brand.blue[100],
  /** Texto e iconos sobre superficies de marca (botones, cabeceras). */
  onBrand: '#FFFFFF',
  onBrandMuted: brand.blue[100],
  background: brand.neutral[50],
  surface: brand.neutral[0],
  subtle: brand.neutral[100],
  text: brand.logo.graphite,
  textSecondary: brand.neutral[500],
  muted: brand.neutral[400],
  border: 'rgba(60,63,63,0.14)',
  darkBackground: brand.dark.background,
  darkSurface: brand.dark.surface,
  darkElevated: brand.dark.elevated,
  darkText: brand.dark.text,
  darkTextSecondary: brand.dark.textSecondary,
  darkBorder: 'rgba(255,255,255,0.12)',
  success: '#059669',
  warning: '#F59E0B',
  error: '#EF4444',
  errorDark: '#DC2626',
  favorite: '#F43F5E',
} as const;

// Los degradados empiezan siempre en `deep`: se leen desde su inicio, y así
// todo lo que es "marca" arranca con el mismo azul. El final se queda en
// blue[500] y no en `mid` porque la etiqueta centrada necesita 4,5:1.
export const actionGradient = [brand.logo.deep, brand.blue[500]] as const;
export const brandGradient = actionGradient;
export const exploreGradient = actionGradient;
/** Cabeceras grandes: del azul más profundo al de acción. */
export const heroGradient = [brand.blue[900], brand.blue[800], brand.logo.deep] as const;
/** Brillos decorativos sobre superficies de marca (no llevan texto). */
export const brandGlow = 'rgba(54,169,225,0.22)';

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
  /** Texto de marca (enlaces, etiquetas seleccionadas) legible en este tema. */
  brandText: string;
  /** Iconos de marca legibles en este tema. */
  brandIcon: string;
  /** Fondo suave de selección en este tema. */
  brandSoft: string;
  /** Error text, contrasted for the current surface. */
  errorText: string;
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
  brandText: colors.brand,
  brandIcon: colors.brand,
  brandSoft: colors.brandSoft,
  errorText: '#B91C1C',
};

export const darkPalette: AppPalette = {
  background: colors.darkBackground,
  surface: colors.darkSurface,
  elevated: colors.darkElevated,
  subtle: colors.darkElevated,
  text: colors.darkText,
  textSecondary: colors.darkTextSecondary,
  muted: brand.dark.muted,
  border: colors.darkBorder,
  brand: colors.brand,
  primary: brand.blue[400],
  // En oscuro el azul de acción no se lee como texto (3:1); se aclara.
  brandText: brand.blue[400],
  brandIcon: brand.blue[400],
  brandSoft: 'rgba(54,169,225,0.16)',
  errorText: '#FCA5A5',
};
