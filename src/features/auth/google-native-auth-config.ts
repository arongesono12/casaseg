type GoogleSignInModule = typeof import('react-native-nitro-google-signin');

let configuredSignature: string | undefined;

export function configureGoogleSignIn({ GoogleOneTapSignIn }: GoogleSignInModule) {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID?.trim();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  if (!webClientId) {
    throw new Error('Falta EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID para validar el token nativo de Google.');
  }
  if (process.env.EXPO_OS === 'ios' && !iosClientId) {
    throw new Error('Falta EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID. Configura el cliente OAuth iOS para com.casaseg.mobile y recompila la app.');
  }

  const signature = `${webClientId}:${iosClientId ?? ''}`;
  if (configuredSignature === signature) return;

  GoogleOneTapSignIn.configure({
    webClientId,
    iosClientId: iosClientId ?? null,
    autoSelectOnSignIn: false,
    offlineAccess: false,
  });
  configuredSignature = signature;
}
