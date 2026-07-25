import { Stack } from 'expo-router/stack';

import { useAppTheme } from '@/providers/theme-context';

export default function AuthLayout() {
  const { palette } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        animation: process.env.EXPO_OS === 'android' ? 'fade_from_bottom' : 'default',
        contentStyle: { backgroundColor: palette.background },
        fullScreenGestureEnabled: process.env.EXPO_OS === 'ios',
        gestureEnabled: true,
        headerShown: false,
      }}
    />
  );
}
