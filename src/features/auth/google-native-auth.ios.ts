import { configureGoogleSignIn, createGoogleSignInNonce } from '@/features/auth/google-native-auth-config';
import { isExpoGo } from '@/lib/execution-environment';

export type NativeGoogleAuthResult =
  | { type: 'unsupported' }
  | { type: 'cancelled' }
  | { type: 'success'; idToken: string; nonce: string };

type GoogleSignInModule = typeof import('react-native-nitro-google-signin');

export async function getNativeGoogleAuthResult(): Promise<NativeGoogleAuthResult> {
  if (isExpoGo) return { type: 'unsupported' };

  let googleSignIn: GoogleSignInModule;
  try {
    googleSignIn = await import('react-native-nitro-google-signin');
  } catch {
    throw new Error('No se encontró el módulo nativo de Google. Recompila el cliente iOS con "npm run ios:native".');
  }

  const { GoogleOneTapSignIn, isCancelledResponse, isSuccessResponse } = googleSignIn;
  const nonce = await createGoogleSignInNonce();
  configureGoogleSignIn(googleSignIn, nonce);
  const response = await GoogleOneTapSignIn.presentExplicitSignIn();

  if (isCancelledResponse(response)) return { type: 'cancelled' };
  if (!isSuccessResponse(response)) {
    throw new Error('Google no devolvió una credencial válida para este dispositivo iOS.');
  }

  return { type: 'success', idToken: response.data.idToken, nonce: nonce.raw };
}
