export type NativeGoogleAuthResult =
  | { type: 'unsupported' }
  | { type: 'cancelled' }
  | { type: 'success'; idToken: string };

export async function getNativeGoogleAuthResult(): Promise<NativeGoogleAuthResult> {
  return { type: 'unsupported' };
}
