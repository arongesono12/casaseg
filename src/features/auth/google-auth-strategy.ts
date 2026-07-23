import type { PlatformOSType } from 'react-native';

export type GoogleAuthStrategy = 'native' | 'oauth';

/** Expo Go cannot load CasaSeg's native Nitro module. Gradle builds can. */
export function getGoogleAuthStrategy(platform: PlatformOSType, expoGo: boolean): GoogleAuthStrategy {
  return platform === 'android' && !expoGo ? 'native' : 'oauth';
}
