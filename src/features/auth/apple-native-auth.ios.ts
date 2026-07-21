import * as AppleAuthentication from 'expo-apple-authentication';
import type { NativeAppleAuthResult } from './apple-native-auth';

function isCancelledAppleRequest(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'ERR_REQUEST_CANCELED';
}

export async function getNativeAppleAuthResult(): Promise<NativeAppleAuthResult> {
  if (!await AppleAuthentication.isAvailableAsync()) return { type: 'unsupported' };

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple no devolvió un token de identidad válido.');
    }

    return { type: 'success', identityToken: credential.identityToken };
  } catch (error) {
    if (isCancelledAppleRequest(error)) return { type: 'cancelled' };
    throw error;
  }
}
