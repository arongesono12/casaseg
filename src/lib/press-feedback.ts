import { colors, withAlpha } from '@/constants/brand';
import { Platform, type PressableAndroidRippleConfig, type ViewStyle } from 'react-native';

// Cada plataforma confirma una pulsación a su manera: Android con la onda
// (ripple) de Material, iOS atenuando el elemento. Usar la opacidad también en
// Android hacía que la app se sintiera como una web dentro de un marco nativo.
//
// El ripple solo se recorta a las esquinas redondeadas si el Pressable tiene
// `overflow: 'hidden'`; sin eso se dibuja como un rectángulo.

export const usesRipple = Platform.OS === 'android';

/**
 * Recorte solo para Android, para elementos con sombra: en iOS `overflow:
 * 'hidden'` no hace falta (no hay ripple) y no conviene arriesgar la sombra.
 */
export const rippleClip: ViewStyle | null = usesRipple ? { overflow: 'hidden' } : null;

/** Onda neutra con tinte de marca, legible sobre superficies claras y oscuras. */
export const pressRipple: PressableAndroidRippleConfig = { color: withAlpha(colors.brand, 0.14), foreground: true };

/** Onda clara para botones rellenos del color de marca o con degradado. */
export const onBrandRipple: PressableAndroidRippleConfig = { color: 'rgba(255,255,255,0.24)', foreground: true };

/** Onda circular sin límites para botones de icono. */
export function iconRipple(size: number): PressableAndroidRippleConfig {
  return { color: withAlpha(colors.brand, 0.18), borderless: true, radius: size / 2 };
}
