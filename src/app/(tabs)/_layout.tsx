import { Tabs } from 'expo-router';
import { Compass, Heart, MessageCircle, UserRound } from '@/components/ui/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { useNotifications } from '@/providers/notification-context';
import { useAuth } from '@/providers/auth-context';

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
      tabBarActiveBackgroundColor: `${colors.primary}0D`,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '800', marginTop: 1 },
      tabBarItemStyle: { margin: 4, borderRadius: 18, paddingVertical: 3 },
      tabBarHideOnKeyboard: true,
      tabBarStyle: { position: 'absolute', left: 10, right: 10, bottom: 8, minHeight: 58 + bottomInset, paddingTop: 5, paddingBottom: bottomInset, paddingHorizontal: 4, backgroundColor: palette.surface, borderWidth: 1, borderTopWidth: 1, borderColor: palette.border, borderRadius: 26, borderCurve: 'continuous', boxShadow: '0 16px 34px rgba(15,23,42,0.14)' },
      sceneStyle: { backgroundColor: palette.background },
    }}>
      <Tabs.Screen name="explore" options={{ title: t('explore'), tabBarIcon: ({ color, focused }) => <Compass color={color} fill={focused ? colors.primary : 'transparent'} size={23} /> }} />
      <Tabs.Screen name="saved" options={{ title: t('saved'), tabBarIcon: ({ color, focused }) => <Heart color={color} fill={focused ? colors.primary : 'transparent'} size={23} /> }} />
      <Tabs.Screen name="messages" options={{ title: t('messages'), tabBarBadge: isAuthenticated && messageUnreadCount > 0 ? messageUnreadCount : undefined, tabBarBadgeStyle: { backgroundColor: colors.error, color: 'white' }, tabBarIcon: ({ color, focused }) => <MessageCircle color={color} fill={focused ? colors.primary : 'transparent'} size={23} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarIcon: ({ color, focused }) => <UserRound color={color} fill={focused ? colors.primary : 'transparent'} size={23} /> }} />
    </Tabs>
  );
}
