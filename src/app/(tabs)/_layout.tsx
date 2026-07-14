import { Tabs } from 'expo-router';
import { Compass, Heart, MessageCircle, UserRound } from '@/components/ui/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useI18n } from '@/providers/i18n-provider';
import { useAppTheme } from '@/providers/theme-provider';
import { useNotifications } from '@/providers/notification-provider';
import { useAuth } from '@/providers/auth-provider';

export default function TabsLayout() {
  const { t } = useI18n();
  const { palette } = useAppTheme();
  const { messageUnreadCount } = useNotifications();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: palette.muted,
      tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginTop: 1 },
      tabBarItemStyle: { paddingVertical: 4 },
      tabBarStyle: { minHeight: 60 + bottomInset, paddingTop: 6, paddingBottom: bottomInset, backgroundColor: palette.surface, borderTopColor: palette.border },
      sceneStyle: { backgroundColor: palette.background },
    }}>
      <Tabs.Screen name="explore" options={{ title: t('explore'), tabBarIcon: ({ color, focused }) => <Compass color={color} fill={focused ? colors.primary : 'transparent'} size={23} /> }} />
      <Tabs.Screen name="saved" options={{ title: t('saved'), tabBarIcon: ({ color, focused }) => <Heart color={color} fill={focused ? colors.primary : 'transparent'} size={23} /> }} />
      <Tabs.Screen name="messages" options={{ title: t('messages'), tabBarBadge: isAuthenticated && messageUnreadCount > 0 ? messageUnreadCount : undefined, tabBarBadgeStyle: { backgroundColor: colors.error, color: 'white' }, tabBarIcon: ({ color, focused }) => <MessageCircle color={color} fill={focused ? colors.primary : 'transparent'} size={23} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarIcon: ({ color, focused }) => <UserRound color={color} fill={focused ? colors.primary : 'transparent'} size={23} /> }} />
    </Tabs>
  );
}
