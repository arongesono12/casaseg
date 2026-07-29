import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actionGradient, colors } from '@/constants/theme';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useNotifications } from '@/providers/notification-context';
import { useAppTheme } from '@/providers/theme-context';

type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type PremiumTabIconProps = {
  activeName: MaterialIconName;
  focused: boolean;
  inactiveName: MaterialIconName;
  mutedColor: string;
};

function PremiumTabIcon({ activeName, focused, inactiveName, mutedColor }: PremiumTabIconProps) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerSelected]}>
      {focused ? (
        <LinearGradient
          colors={actionGradient}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <MaterialCommunityIcons
        color={focused ? 'white' : mutedColor}
        name={focused ? activeName : inactiveName}
        size={22}
      />
    </View>
  );
}

export default function AndroidTabsLayout() {
  const { t } = useI18n();
  const { palette, resolvedMode } = useAppTheme();
  const { messageUnreadCount } = useNotifications();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 10);
  const activeLabelColor = resolvedMode === 'dark' ? '#5EEAD4' : colors.accentDark;
  const barBackground = resolvedMode === 'dark' ? '#171A21' : '#FFFFFF';
  const barBorder = resolvedMode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)';

  return (
    <Tabs
      backBehavior="history"
      screenListeners={{
        tabPress: () => {
          void Haptics.selectionAsync();
        },
      }}
      screenOptions={{
        animation: 'shift',
        headerShown: false,
        sceneStyle: { backgroundColor: palette.background },
        tabBarActiveTintColor: activeLabelColor,
        tabBarAllowFontScaling: true,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: palette.muted,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: barBackground,
            borderColor: barBorder,
            marginBottom: bottomOffset,
          },
        ],
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: t('homeTab'),
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              activeName="compass"
              focused={focused}
              inactiveName="compass-outline"
              mutedColor={palette.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: t('saved'),
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              activeName="heart"
              focused={focused}
              inactiveName="heart-outline"
              mutedColor={palette.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('messages'),
          tabBarBadge: isAuthenticated && messageUnreadCount > 0
            ? (messageUnreadCount > 99 ? '99+' : messageUnreadCount)
            : undefined,
          tabBarBadgeStyle: [
            styles.badge,
            { borderColor: barBackground },
          ],
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              activeName="message-text"
              focused={focused}
              inactiveName="message-text-outline"
              mutedColor={palette.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isAuthenticated ? t('profile') : t('accessShort'),
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              activeName="account-circle"
              focused={focused}
              inactiveName="account-circle-outline"
              mutedColor={palette.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.error,
    borderWidth: 2,
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
    height: 18,
    lineHeight: 14,
    minWidth: 18,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: 14,
    height: 34,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
  iconContainerSelected: { boxShadow: '0 6px 14px rgba(15,118,110,0.28)' },
  tabBar: {
    borderRadius: 26,
    borderTopWidth: 1,
    borderWidth: 1,
    boxShadow: '0 14px 28px rgba(2,6,23,0.20)',
    height: 76,
    marginHorizontal: 16,
    paddingBottom: 8,
    paddingHorizontal: 8,
    paddingTop: 7,
  },
  tabItem: {
    borderRadius: 20,
    paddingHorizontal: 2,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
    marginTop: 1,
  },
});
