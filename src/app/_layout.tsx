import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { onlineManager, QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Network from 'expo-network';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { NetworkStatusBanner } from '@/components/network-status-banner';
import { canAccessAdminPanel, canAccessOwnerPanel } from '@/lib/access-control';
import { appStorage } from '@/lib/local-storage';
import { useAuth } from '@/providers/auth-context';
import { AuthProvider } from '@/providers/auth-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import { NotificationProvider } from '@/providers/notification-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { useAppTheme } from '@/providers/theme-context';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { networkMode: 'offlineFirst', retry: 1 },
  },
});
const queryPersister = createSyncStoragePersister({ storage: appStorage, key: 'casaseg.query-cache' });
onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => setOnline(Boolean(state.isConnected && state.isInternetReachable !== false)));
  return () => subscription.remove();
});

function RootNavigator() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const { resolvedMode, palette } = useAppTheme();

  useEffect(() => {
    if (!isLoading) void SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) {
    return <View style={[styles.loading, { backgroundColor: palette.background }]}><ActivityIndicator color={colors.brand} size="large" /></View>;
  }

  return (
    <>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="property/[id]" />
        <Stack.Screen name="map" />
        <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
        <Stack.Screen name="legal/terms" />
        <Stack.Screen name="legal/privacy" />
        <Stack.Screen name="legal/help" />
        <Stack.Screen name="auth/callback" />

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="notifications" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="chat/[conversationId]" />
          <Stack.Screen name="visit/[propertyId]" />
          <Stack.Screen name="payment/success" />
          <Stack.Screen name="payment/failed" />
        </Stack.Protected>

        <Stack.Protected guard={isAuthenticated && canAccessOwnerPanel(role)}>
          <Stack.Screen name="owner" />
        </Stack.Protected>

        <Stack.Protected guard={isAuthenticated && canAccessAdminPanel(role)}>
          <Stack.Screen name="admin" />
        </Stack.Protected>
      </Stack>
      <NetworkStatusBanner />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister, maxAge: 1000 * 60 * 60 * 24 }}>
          <ThemeProvider>
            <I18nProvider>
              <AuthProvider>
                <NotificationProvider>
                  <BottomSheetModalProvider>
                    <RootNavigator />
                  </BottomSheetModalProvider>
                </NotificationProvider>
              </AuthProvider>
            </I18nProvider>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
