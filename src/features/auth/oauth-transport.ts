import type { PlatformOSType } from 'react-native';

export type OAuthTransport = 'native' | 'browser';

/**
 * Decide si el acceso con Google o Apple pasa por el navegador interno o por
 * los diálogos nativos del sistema.
 *
 * Tres razones distintas llevan al navegador, y conviene no confundirlas:
 *
 * 1. En web no hay módulo nativo que valga.
 * 2. Expo Go no embebe módulos nativos de terceros: aunque quisiéramos, ahí el
 *    camino nativo no existe.
 * 3. En desarrollo se usa el navegador a propósito, para poder probar el flujo
 *    completo desde Expo Go sin recompilar el cliente en cada cambio.
 *
 * Solo una build de producción usa los diálogos nativos, que son los que dan la
 * experiencia que espera el usuario final.
 */
export function getOAuthTransport({
  platform,
  expoGo,
  dev,
}: {
  platform: PlatformOSType;
  expoGo: boolean;
  dev: boolean;
}): OAuthTransport {
  if (platform === 'web') return 'browser';
  if (expoGo) return 'browser';
  if (dev) return 'browser';
  return 'native';
}
