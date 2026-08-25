import * as Crypto from 'expo-crypto';

type GoogleSignInModule = typeof import('react-native-nitro-google-signin');

/** Raw value for Supabase, SHA-256 hex for Google. */
export type GoogleSignInNonce = { raw: string; hashed: string };

// Nitro always embeds a nonce in the ID token: when `configure` receives none it
// generates one natively and never exposes the preimage. GoTrue then rejects the
// token with "Passed nonce and nonce in id_token should either both exist or not"
// because `signInWithIdToken` has no raw value to send. Owning both halves here
// keeps the replay protection instead of disabling the check in the dashboard.
export async function createGoogleSignInNonce(): Promise<GoogleSignInNonce> {
  const raw = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
  return { raw, hashed };
}

// Deliberately not memoized: the nonce must be fresh on every attempt, so the
// native configuration is rebuilt each time a sign-in starts.
export function configureGoogleSignIn({ GoogleOneTapSignIn }: GoogleSignInModule, nonce: GoogleSignInNonce) {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID?.trim();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  if (!webClientId) {
    throw new Error('Falta EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID para validar el token nativo de Google.');
  }
  if (process.env.EXPO_OS === 'ios' && !iosClientId) {
    throw new Error('Falta EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID. Configura el cliente OAuth iOS para com.casaseg.mobile y recompila la app.');
  }

  GoogleOneTapSignIn.configure({
    webClientId,
    iosClientId: iosClientId ?? null,
    autoSelectOnSignIn: false,
    offlineAccess: false,
    nonce: nonce.hashed,
  });
}
