import { Tabs } from 'expo-router';

import { Compass, Heart, MessageCircle, UserRound } from '@/components/ui/icons';
import { colors, fontFamily } from '@/constants/theme';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useNotifications } from '@/providers/notification-context';
import { useAppTheme } from '@/providers/theme-context';

export default function WebTabsLayout() {
  const { t } = useI18n();
  const { palette } = useAppTheme();
  const { messageUnreadCount } = useNotifications();
  const { isAuthenticated } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontFamily: fontFamily.bold },
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          minHeight: 68,
          paddingTop: 7,
          paddingBottom: 8,
          backgroundColor: palette.surface,
          borderTopWidth: 1,
          borderColor: palette.border,
          boxShadow: '0 -8px 24px rgba(15,23,42,0.08)',
        },
        sceneStyle: { backgroundColor: palette.background },
      }}
    >
      <Tabs.Screen name="explore" options={{ title: t('homeTab'), tabBarIcon: ({ color, focused }) => <Compass color={color} fill={focused ? colors.brand : 'transparent'} size={23} /> }} />
      <Tabs.Screen name="saved" options={{ title: t('saved'), tabBarIcon: ({ color, focused }) => <Heart color={color} fill={focused ? colors.brand : 'transparent'} size={23} /> }} />
      <Tabs.Screen name="messages" options={{ title: t('messages'), tabBarBadge: isAuthenticated && messageUnreadCount > 0 ? messageUnreadCount : undefined, tabBarBadgeStyle: { backgroundColor: colors.error, color: 'white' }, tabBarIcon: ({ color, focused }) => <MessageCircle color={color} fill={focused ? colors.brand : 'transparent'} size={23} /> }} />
      <Tabs.Screen name="profile" options={{ title: isAuthenticated ? t('profile') : t('accessShort'), tabBarIcon: ({ color, focused }) => <UserRound color={color} fill={focused ? colors.brand : 'transparent'} size={23} /> }} />
    </Tabs>
  );
}
