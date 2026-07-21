import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { isExpoGo } from '@/lib/execution-environment';
import { supabase } from '@/lib/supabase';

const OAUTH_CALLBACK_PATH = 'auth/callback';
const APP_SCHEME = 'casaseg';
const codeExchanges = new Map<string, Promise<void>>();

export function createOAuthRedirectUrl() {
  if (Platform.OS === 'web' || isExpoGo) {
    return Linking.createURL(OAUTH_CALLBACK_PATH);
  }

  return `${APP_SCHEME}://${OAUTH_CALLBACK_PATH}`;
}

export function getOAuthCode(callbackUrl: string) {
  const url = new URL(callbackUrl);
  const oauthError = url.searchParams.get('error_description') ?? url.searchParams.get('error');

  if (oauthError) throw new Error(oauthError);

  const code = url.searchParams.get('code');
  if (!code) throw new Error('El proveedor OAuth no devolvió el código de autorización.');
  return code;
}

export function exchangeOAuthCode(code: string) {
  const existingExchange = codeExchanges.get(code);
  if (existingExchange) return existingExchange;

  const exchange = supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
    if (error) throw error;
  });

  codeExchanges.set(code, exchange);
  void exchange.catch(() => codeExchanges.delete(code));
  return exchange;
}
