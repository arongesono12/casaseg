import { Redirect } from 'expo-router';

import { appStorage } from '@/lib/local-storage';

/**
 * ⚠️ TEMPORAL — AYUDA DE DESARROLLO, NO DEBE LLEGAR A PRODUCCIÓN ⚠️
 *
 * Con este interruptor en `true` la app arranca SIEMPRE en el onboarding,
 * ignorando si el usuario ya lo completó. Está puesto para poder revisar cómo
 * se ve esa pantalla en distintos tamaños de dispositivo sin tener que borrar
 * los datos de la app entre pruebas.
 *
 * Para volver al comportamiento normal: poner `false`. Es el único cambio
 * necesario, el resto del archivo ya está preparado.
 *
 * Mientras esté en `true`, un usuario real vería el onboarding en cada
 * apertura de la app y nunca llegaría directo al explorador.
 */
const FORZAR_ONBOARDING_AL_ARRANCAR = true;

if (FORZAR_ONBOARDING_AL_ARRANCAR && __DEV__) {
  console.warn(
    '[casaseg] FORZAR_ONBOARDING_AL_ARRANCAR está activo en src/app/index.tsx: ' +
      'la app arrancará siempre en el onboarding. Ponlo a false antes de publicar.',
  );
}

export default function Index() {
  // Read on render, not at module scope: a module-level snapshot keeps sending
  // the user back to onboarding after they have already completed it.
  const hasSeenOnboarding = appStorage.getItem('casaseg.onboarding.seen') === 'true';

  if (FORZAR_ONBOARDING_AL_ARRANCAR || !hasSeenOnboarding) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/explore" />;
}
