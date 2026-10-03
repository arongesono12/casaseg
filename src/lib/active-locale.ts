import type { Locale } from '@/providers/i18n-context';

// Idioma activo para el código que vive fuera de React (errores de
// autenticación, mensajes de validación de zod). I18nProvider lo mantiene
// sincronizado; los componentes deben seguir usando useI18n.
let activeLocale: Locale = 'es';

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getActiveLocale(): Locale {
  return activeLocale;
}
