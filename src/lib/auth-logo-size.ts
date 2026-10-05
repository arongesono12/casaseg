// Proporción del viewBox de public/logo/logo.svg (ancho / alto).
export const LOGO_ASPECT_RATIO = 779.14 / 648.88;

// El logo no es cuadrado, así que se acota por su lado largo (el ancho): nunca
// más de 160dp ni más del 30% de la pantalla, para que el formulario mande.
const MAX_WIDTH = 160;
const SCREEN_FRACTION = 0.3;
// En pantallas bajas cede algo de altura; con el teclado abierto cede más,
// porque cada dp que ocupa el logo es un dp menos para los campos.
const COMPACT_SCALE = 0.75;
const KEYBOARD_SCALE = 0.5;

export interface AuthLogoSizeOptions {
  compact?: boolean;
  keyboardVisible?: boolean;
}

export interface LogoSize {
  width: number;
  height: number;
}

export function authLogoSize(screenWidth: number, { compact = false, keyboardVisible = false }: AuthLogoSizeOptions = {}): LogoSize {
  const base = Math.min(MAX_WIDTH, screenWidth * SCREEN_FRACTION);
  const scale = keyboardVisible ? KEYBOARD_SCALE : compact ? COMPACT_SCALE : 1;
  const width = Math.round(base * scale);
  return { width, height: Math.round(width / LOGO_ASPECT_RATIO) };
}
