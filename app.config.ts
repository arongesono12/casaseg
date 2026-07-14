import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'CasaSeg',
  slug: config.slug ?? 'casaseg',
  scheme: 'casaseg',
  ios: {
    ...config.ios,
    bundleIdentifier: 'com.casaseg.mobile',
    supportsTablet: true,
    usesAppleSignIn: true,
    config: {
      ...config.ios?.config,
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
    infoPlist: {
      ...config.ios?.infoPlist,
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
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY },
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'POST_NOTIFICATIONS'],
  },
  extra: {
    ...config.extra,
    eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID },
  },
});
