import type { PlatformOSType } from 'react-native';

export type GoogleAuthStrategy = 'native' | 'oauth' | 'unavailable';

/** Expo Go cannot load CasaSeg's native Nitro module. Development and store builds can. */
export function getGoogleAuthStrategy(platform: PlatformOSType, expoGo: boolean): GoogleAuthStrategy {
  if (platform === 'web') return 'oauth';
  if (expoGo) return 'unavailable';
  return platform === 'android' || platform === 'ios' ? 'native' : 'oauth';
}
