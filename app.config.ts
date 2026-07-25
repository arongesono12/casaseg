import type { ConfigContext, ExpoConfig } from 'expo/config';

// EAS project IDs are public identifiers and must be available before EAS can
// load environment variables or attempt to update this dynamic config.
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '7f3eebdd-5f27-4702-8fcc-10cce996380b';
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
const googleIosClientSuffix = '.apps.googleusercontent.com';
const googleIosUrlScheme = googleIosClientId?.endsWith(googleIosClientSuffix)
  ? `com.googleusercontent.apps.${googleIosClientId.slice(0, -googleIosClientSuffix.length)}`
  : undefined;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'CasaSeg',
  slug: config.slug ?? 'casaseg',
  scheme: 'casaseg',
  jsEngine: 'hermes',
  newArchEnabled: true,
  plugins: [
    ...(config.plugins ?? []),
    ...(googleIosUrlScheme
      ? [['react-native-nitro-google-signin', { iosUrlScheme: googleIosUrlScheme }] as [string, { iosUrlScheme: string }]]
      : []),
  ],
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    ...config.updates,
    url: `https://u.expo.dev/${easProjectId}`,
  },
  ios: {
    ...config.ios,
    bundleIdentifier: 'com.casaseg.mobile',
    supportsTablet: true,
    usesAppleSignIn: true,
    config: {
      ...config.ios?.config,
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      ...config.ios?.infoPlist,
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription: 'CasaSeg usa tu ubicación solo cuando lo solicitas para mostrar viviendas cercanas.',
      NSPhotoLibraryUsageDescription: 'CasaSeg necesita acceso a tus fotos para publicar imágenes de una propiedad.',
    },
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
      ],
    },
  },
  android: {
    ...config.android,
    package: 'com.casaseg.mobile',
    softwareKeyboardLayoutMode: 'resize',
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY },
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'POST_NOTIFICATIONS'],
  },
  extra: {
    ...config.extra,
    eas: { projectId: easProjectId },
  },
});
