import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { onlineManager, QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Network from 'expo-network';
import { Stack } from 'expo-router';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { type PropsWithChildren, useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';


import { ErrorBoundary } from '@/components/error-boundary';
import { NetworkStatusBanner } from '@/components/network-status-banner';
import { canAccessAdminPanel, canAccessOwnerPanel } from '@/lib/access-control';
import { appStorage } from '@/lib/local-storage';
import { AuthContext, useAuth } from '@/providers/auth-context';
import { guestAuth } from '@/features/auth/guest-auth';
import { AuthProvider } from '@/providers/auth-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import { NotificationProvider } from '@/providers/notification-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { useAppTheme } from '@/providers/theme-context';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? '';

if (!publishableKey && !__DEV__) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Configure it before building the app.');
}

function AuthenticationProvider({ children }: PropsWithChildren) {
  if (!publishableKey) {
    return <AuthContext.Provider value={guestAuth}>{children}</AuthContext.Provider>;
  }
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      // Clerk's browser telemetry coerces idle callback handles to numbers.
      // React Native 0.86 uses native objects for these handles.
      telemetry={Platform.OS === 'web' ? undefined : false}
    >
      <AuthProvider>{children}</AuthProvider>
    </ClerkProvider>
  );
}

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
  const { isAuthenticated, isLoading: isAuthLoading, role } = useAuth();
  // Inter es la tipografía de toda la interfaz: el splash nativo se mantiene
  // hasta tenerla, para no pintar un primer fotograma con la fuente del sistema.
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const isLoading = isAuthLoading || (!fontsLoaded && !fontError);
  const { resolvedMode, palette } = useAppTheme();

  useEffect(() => {
    if (!isLoading) void SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) {
    return <View style={[styles.loading, { backgroundColor: palette.background }]}><ActivityIndicator color={palette.brandIcon} size="large" /></View>;
  }

  return (
    <>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background }, keyboardHandlingEnabled: Platform.OS !== 'web' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="property/[id]" />
        <Stack.Screen name="map" />
        <Stack.Screen name="legal/terms" />
        <Stack.Screen name="legal/privacy" />
        <Stack.Screen name="legal/help" />
        <Stack.Screen name="auth/callback" />
        {/* Recovery links create a session, so this screen must stay reachable
            from both sides of the authentication guard. */}
        <Stack.Protected guard={Boolean(publishableKey)}>
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="become-owner" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="chat/[conversationId]" />
          <Stack.Screen name="encounters/[conversationId]" />
          <Stack.Screen name="visit/[propertyId]" />
          <Stack.Screen name="visits/index" />
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
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <PersistQueryClientProvider client={queryClient} persistOptions={{
            persister: queryPersister,
            maxAge: 1000 * 60 * 60 * 24,
            buster: 'public-catalog-v2',
            dehydrateOptions: {
              shouldDehydrateQuery: (query) => query.state.status === 'success'
                && query.queryKey[0] === 'properties'
                && query.queryKey[1] === 'list',
            },
          }}>
            <ThemeProvider>
              <I18nProvider>
                <AuthenticationProvider>
                  <NotificationProvider>
                    <BottomSheetModalProvider>
                      <ErrorBoundary>
                        <RootNavigator />
                      </ErrorBoundary>
                    </BottomSheetModalProvider>
                  </NotificationProvider>
                </AuthenticationProvider>
              </I18nProvider>
            </ThemeProvider>
          </PersistQueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
