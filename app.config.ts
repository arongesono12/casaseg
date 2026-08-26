import type { ConfigContext, ExpoConfig } from 'expo/config';

// EAS project IDs are public identifiers and must be available before EAS can
// load environment variables or attempt to update this dynamic config.
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '7f3eebdd-5f27-4702-8fcc-10cce996380b';

// Local runs keep working with a partial .env so the offline demo mode stays
// usable. Remote builds must fail loudly instead: a missing EXPO_PUBLIC_* value
// is inlined as `undefined` and produces an installable app whose Supabase and
// Google clients are silently dead.
const isRemoteBuild = process.env.EAS_BUILD === 'true';
const buildPlatform = process.env.EAS_BUILD_PLATFORM;

function requireBuildEnv(name: string, hint: string) {
  const value = process.env[name]?.trim();
  if (value) return value;
  throw new Error(
    `[casaseg] Falta ${name} en el build de EAS. ${hint}\n` +
      `Créala con: eas env:create --name ${name} --environment <development|preview|production> --visibility plaintext`,
  );
}

if (isRemoteBuild) {
  requireBuildEnv('EXPO_PUBLIC_SUPABASE_URL', 'Sin ella el cliente apunta a un host inexistente.');
  requireBuildEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'Sin ella no hay sesión posible.');
  requireBuildEnv('EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID', 'Debe ser el client ID de tipo "Web application".');
  requireBuildEnv('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', 'Sin ella el mapa nativo se renderiza en blanco.');
}

const googleIosClientSuffix = '.apps.googleusercontent.com';
const googleIosClientId =
  isRemoteBuild && buildPlatform === 'ios'
    ? requireBuildEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', 'Sin ella el plugin nativo de Google no registra el URL scheme y el login iOS no puede volver a la app.')
    : process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

if (googleIosClientId && !googleIosClientId.endsWith(googleIosClientSuffix)) {
  throw new Error(
    `[casaseg] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID debe terminar en "${googleIosClientSuffix}". ` +
      'Copia el client ID del cliente OAuth de tipo iOS en Google Cloud Console.',
  );
}

const googleIosUrlScheme = googleIosClientId
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
    // Obligatorio aunque solo usemos Clerk desde JavaScript: el autolinking de
    // Expo compila igualmente su módulo nativo (@clerk/expo trae
    // expo-module.config.json), y sin este plugin falta la exclusión de
    // 'META-INF/versions/9/OSGI-INF/MANIFEST.MF' que okhttp y jspecify duplican,
    // lo que rompe :app:mergeDebugJavaResource.
    '@clerk/expo',
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
