import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors } from '@/constants/theme';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useNotifications } from '@/providers/notification-context';
import { useAppTheme } from '@/providers/theme-context';

export default function TabsLayout() {
  const { t } = useI18n();
  const { palette, resolvedMode } = useAppTheme();
  const { messageUnreadCount } = useNotifications();
  const { isAuthenticated } = useAuth();
  const messageBadge = isAuthenticated && messageUnreadCount > 0
    ? (messageUnreadCount > 99 ? '99+' : String(messageUnreadCount))
    : null;

  return (
    <NativeTabs
      backgroundColor={process.env.EXPO_OS === 'ios' ? undefined : palette.surface}
      badgeBackgroundColor={colors.error}
      badgeTextColor="white"
      blurEffect={resolvedMode === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      disableTransparentOnScrollEdge={false}
      iconColor={{ default: palette.muted, selected: colors.brand }}
      indicatorColor={colors.brandSoft}
      labelStyle={{
        default: { color: palette.muted, fontSize: 11, fontWeight: '600' },
        selected: { color: colors.brandDark, fontSize: 11, fontWeight: '800' },
      }}
      labelVisibilityMode="labeled"
      minimizeBehavior="never"
      rippleColor={`${colors.brand}20`}
      shadowColor={palette.border}
      tintColor={colors.brand}
    >
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'safari', selected: 'safari.fill' }}
          md="explore"
        />
        <NativeTabs.Trigger.Label>{t('homeTab')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'heart', selected: 'heart.fill' }}
          md="favorite"
        />
        <NativeTabs.Trigger.Label>{t('saved')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="messages">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }}
          md="chat"
        />
        <NativeTabs.Trigger.Label>{t('messages')}</NativeTabs.Trigger.Label>
        {messageBadge ? <NativeTabs.Trigger.Badge>{messageBadge}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
        <NativeTabs.Trigger.Label>{isAuthenticated ? t('profile') : t('accessShort')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
