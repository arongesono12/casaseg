import * as WebBrowser from 'expo-web-browser';

import { isSupabaseConfigured } from '@/lib/supabase';
import { invokePaymentFunction } from '@/features/payments/payments.api';
import { mapWalletBalance, walletLinkOutcome, type WalletBalance, type WalletLinkOutcome } from '@/features/payments/wallet-link-state';

// Vínculo de solo lectura con la billetera FondosEG del usuario, con la misma
// Edge Function que la web (fondoseg-wallet-link). El token de FondosEG nunca
// llega a la app: la función lo guarda cifrado.

const FUNCTION_NAME = 'fondoseg-wallet-link';
/** A donde redirige la función al terminar (ver buildAppLinkResultUrl en la web). */
const APP_RETURN_URL = 'casaseg://wallet-link';
const FALLBACK = 'No se pudo consultar tu billetera FondosEG.';

export const walletLinkKeys = {
  balance: (profileId: string) => ['fondoseg-wallet', profileId] as const,
};

export async function fetchWalletBalance(): Promise<WalletBalance> {
  if (!isSupabaseConfigured) return { linked: false };
  return mapWalletBalance(await invokePaymentFunction(FUNCTION_NAME, { action: 'balance' }, FALLBACK));
}

/**
 * Abre la autorización en fondoseg.com. Con `client: "app"` FondosEG vuelve a
 * la función, que completa el vínculo en el servidor y redirige a la app: no
 * hace falta canjear nada aquí.
 */
export async function linkWallet(): Promise<WalletLinkOutcome> {
  if (!isSupabaseConfigured) throw new Error('Configura Supabase para vincular tu billetera.');
  const data = await invokePaymentFunction(FUNCTION_NAME, { action: 'start', client: 'app' }, 'FondosEG no pudo iniciar la vinculación.');
  const authorizeUrl = typeof data.authorizeUrl === 'string' ? data.authorizeUrl : '';
  if (!authorizeUrl.startsWith('https://')) throw new Error('FondosEG no devolvió un enlace de autorización válido.');
  return walletLinkOutcome(await WebBrowser.openAuthSessionAsync(authorizeUrl, APP_RETURN_URL));
}

export async function unlinkWallet(): Promise<void> {
  await invokePaymentFunction(FUNCTION_NAME, { action: 'unlink' }, 'No se pudo desvincular la billetera.');
}
