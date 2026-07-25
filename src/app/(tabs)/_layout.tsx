import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Badge, Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';

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
      backgroundColor={process.env.EXPO_OS === 'ios' ? null : palette.surface}
      badgeBackgroundColor={colors.error}
      badgeTextColor="white"
      blurEffect={resolvedMode === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      disableTransparentOnScrollEdge={false}
      iconColor={{ default: palette.muted, selected: colors.accent }}
      indicatorColor={colors.accentSoft}
      labelStyle={{
        default: { color: palette.muted, fontSize: 11, fontWeight: '600' },
        selected: { color: colors.accentDark, fontSize: 11, fontWeight: '800' },
      }}
      labelVisibilityMode="labeled"
      minimizeBehavior="never"
      rippleColor={`${colors.accent}20`}
      shadowColor={palette.border}
      tintColor={colors.accent}
    >
      <NativeTabs.Trigger name="explore">
        <Icon
          sf={{ default: 'safari', selected: 'safari.fill' }}
          androidSrc={<VectorIcon family={MaterialCommunityIcons} name="compass-outline" />}
        />
        <Label>{t('homeTab')}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="saved">
        <Icon
          sf={{ default: 'heart', selected: 'heart.fill' }}
          androidSrc={<VectorIcon family={MaterialCommunityIcons} name="heart-outline" />}
        />
        <Label>{t('saved')}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="messages">
        <Icon
          sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }}
          androidSrc={<VectorIcon family={MaterialCommunityIcons} name="message-text-outline" />}
        />
        <Label>{t('messages')}</Label>
        {messageBadge ? <Badge>{messageBadge}</Badge> : null}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          androidSrc={<VectorIcon family={MaterialCommunityIcons} name="account-circle-outline" />}
        />
        <Label>{isAuthenticated ? t('profile') : t('accessShort')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
