export type NativeAppleAuthResult =
  | { type: 'unsupported' }
  | { type: 'cancelled' }
  | { type: 'success'; identityToken: string };

export async function getNativeAppleAuthResult(): Promise<NativeAppleAuthResult> {
  return { type: 'unsupported' };
}
