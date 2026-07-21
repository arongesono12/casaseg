export type NativeGoogleAuthResult =
  | { type: 'unsupported' }
  | { type: 'cancelled' }
  | { type: 'success'; idToken: string };

type GoogleSignInModule = typeof import('react-native-nitro-google-signin');

let configuredClientId: string | undefined;

function configureGoogleSignIn({ GoogleOneTapSignIn }: GoogleSignInModule) {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID?.trim();
  if (!webClientId) {
    throw new Error('Falta EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID para validar el token nativo de Google.');
  }

  if (configuredClientId === webClientId) return;

  GoogleOneTapSignIn.configure({
    webClientId,
    autoSelectOnSignIn: false,
  });
  configuredClientId = webClientId;
}

export async function getNativeGoogleAuthResult(): Promise<NativeGoogleAuthResult> {
  let googleSignIn: GoogleSignInModule;
  try {
    googleSignIn = await import('react-native-nitro-google-signin');
  } catch {
    // Expo Go does not contain this native module; use the browser fallback.
    return { type: 'unsupported' };
  }

  const { GoogleOneTapSignIn, isCancelledResponse, isSuccessResponse } = googleSignIn;
  configureGoogleSignIn(googleSignIn);
  await GoogleOneTapSignIn.checkPlayServices(true);

  // The explicit button flow always presents Google's account chooser instead
  // of silently reusing the credential most recently stored on the device.
  const response = await GoogleOneTapSignIn.presentExplicitSignIn();

  if (isCancelledResponse(response)) return { type: 'cancelled' };
  if (!isSuccessResponse(response)) {
    throw new Error('Google no devolvió una credencial válida para este dispositivo Android.');
  }

  return { type: 'success', idToken: response.data.idToken };
}
