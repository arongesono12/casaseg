import { isExpoGo } from '@/lib/execution-environment';
import { configureGoogleSignIn, createGoogleSignInNonce } from '@/features/auth/google-native-auth-config';

export type NativeGoogleAuthResult =
  | { type: 'unsupported' }
  | { type: 'cancelled' }
  | { type: 'success'; idToken: string; nonce: string };

type GoogleSignInModule = typeof import('react-native-nitro-google-signin');

export async function getNativeGoogleAuthResult(): Promise<NativeGoogleAuthResult> {
  // Chrome Custom Tabs cannot be closed reliably after an Android deep link.
  // Keep Google authentication native so the account chooser returns directly
  // to CasaSeg without leaving a browser session open.
  if (isExpoGo) return { type: 'unsupported' };

  let googleSignIn: GoogleSignInModule;
  try {
    googleSignIn = await import('react-native-nitro-google-signin');
  } catch {
    throw new Error(
      'No se encontró el módulo nativo de Google. Recompila el cliente Android con "npm run android:native".',
    );
  }

  const { GoogleOneTapSignIn, isCancelledResponse, isSuccessResponse } = googleSignIn;
  const nonce = await createGoogleSignInNonce();
  configureGoogleSignIn(googleSignIn, nonce);
  await GoogleOneTapSignIn.checkPlayServices(true);

  // The explicit button flow always presents Google's account chooser instead
  // of silently reusing the credential most recently stored on the device.
  const response = await GoogleOneTapSignIn.presentExplicitSignIn();

  if (isCancelledResponse(response)) return { type: 'cancelled' };
  if (!isSuccessResponse(response)) {
    throw new Error('Google no devolvió una credencial válida para este dispositivo Android.');
  }

  return { type: 'success', idToken: response.data.idToken, nonce: nonce.raw };
}
