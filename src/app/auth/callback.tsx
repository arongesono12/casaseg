import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { exchangeOAuthCode } from '@/features/auth/oauth-session';
import { useAppTheme } from '@/providers/theme-context';

const browserCompletion = WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });

export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const { palette } = useAppTheme();
  const [error, setError] = useState('');
  const completedPopup = Platform.OS === 'web' && browserCompletion.type === 'success';

  useEffect(() => {
    if (completedPopup) return;

    let active = true;
    const exchange = async () => {
      if (Platform.OS !== 'web') {
        await WebBrowser.dismissBrowser().catch(() => undefined);
        if (!active) return;
      }

      const oauthError = params.error_description ?? params.error;
      if (oauthError) {
        setError(oauthError);
        return;
      }
      if (!params.code) {
        router.replace('/(auth)/login');
        return;
      }

      try {
        await exchangeOAuthCode(params.code);
        if (active) router.replace('/(tabs)/explore');
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo completar el acceso.');
      }
    };

    void exchange();
    return () => { active = false; };
  }, [completedPopup, params.code, params.error, params.error_description]);

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.brand} size="large" />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: colors.error, textAlign: 'center' },
});
