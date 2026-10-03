import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { PlatformPressable } from 'expo-router/react-navigation';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Heart, HomeTab, MessagesSquare, UserRound, type AppIcon } from '@/components/ui/icons';
import { actionGradient, colors, withAlpha } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useNotifications } from '@/providers/notification-context';
import { useAppTheme } from '@/providers/theme-context';

type PremiumTabIconProps = {
  Icon: AppIcon;
  label: string;
  width: number;
  focused: boolean;
  mutedColor: string;
};

// Icono y nombre van dentro de la misma cápsula: la selección rellena ambos,
// como la barra flotante de iPhone, en lugar de resaltar solo el icono.
function PremiumTabIcon({ Icon, label, width, focused, mutedColor }: PremiumTabIconProps) {
  const tint = focused ? 'white' : mutedColor;
  return (
    <View style={[styles.iconContainer, { width }, focused && styles.iconContainerSelected]}>
      {focused ? (
        <LinearGradient
          colors={actionGradient}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Icon color={tint} size={22} strokeWidth={focused ? 2 : 1.6} />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        numberOfLines={1}
        style={[styles.tabLabel, { color: tint }, focused && styles.tabLabelSelected]}
      >
        {label}
      </Text>
    </View>
  );
}

// El botón de pestaña de React Navigation ocupa todo el alto de la barra pero
// alinea su contenido arriba (justifyContent: 'flex-start'), pensando en el
// texto debajo del icono. Sin texto, el icono quedaba por encima del centro.
function CenteredTabButton({ style, ...props }: ComponentProps<typeof PlatformPressable>) {
  return <PlatformPressable {...props} style={[style, styles.tabButton]} />;
}

export default function AndroidTabsLayout() {
  const { t } = useI18n();
  const { palette, resolvedMode } = useAppTheme();
  const { messageUnreadCount } = useNotifications();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  // En pantallas estrechas la cápsula se ajusta al hueco de cada pestaña.
  const pillWidth = Math.min(TAB_PILL_WIDTH, Math.floor((screenWidth - BAR_INSET * 2 - BAR_PADDING * 2) / TAB_COUNT) - 4);
  const bottomOffset = Math.max(insets.bottom, 10);
  const barBackground = resolvedMode === 'dark' ? '#171A21' : '#FFFFFF';
  const barBorder = resolvedMode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)';

  return (
    <Tabs
      backBehavior="history"
      screenListeners={{
        tabPress: () => {
          haptics.selection();
        },
      }}
      screenOptions={{
        animation: 'none',
        headerShown: false,
        sceneStyle: { backgroundColor: palette.background },
        tabBarButton: (props) => <CenteredTabButton {...props} />,
        tabBarHideOnKeyboard: true,
        // El contenedor del icono mide lo mismo que la píldora activa.
        tabBarIconStyle: [styles.tabIcon, { width: pillWidth }],
        tabBarItemStyle: styles.tabItem,
        // El nombre se dibuja dentro de la cápsula (PremiumTabIcon), no con la etiqueta nativa.
        tabBarShowLabel: false,
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
              Icon={HomeTab}
              label={t('homeTab')}
              width={pillWidth}
              focused={focused}
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
              Icon={Heart}
              label={t('saved')}
              width={pillWidth}
              focused={focused}
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
              Icon={MessagesSquare}
              label={t('messages')}
              width={pillWidth}
              focused={focused}
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
              Icon={UserRound}
              label={isAuthenticated ? t('profile') : t('accessShort')}
              width={pillWidth}
              focused={focused}
              mutedColor={palette.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}

// La cápsula seleccionada deja 5 px de aire arriba y abajo dentro de la barra.
const TAB_BAR_HEIGHT = 66;
const TAB_PILL_HEIGHT = 56;
const TAB_PILL_WIDTH = 74;
const TAB_COUNT = 4;
const BAR_INSET = 16;
const BAR_PADDING = 10;

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
    borderCurve: 'continuous',
    borderRadius: TAB_PILL_HEIGHT / 2,
    gap: 2,
    height: TAB_PILL_HEIGHT,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 4,
  },
  iconContainerSelected: { boxShadow: `0 6px 14px ${withAlpha(colors.brand, 0.28)}` },
  // Cápsula completa (radio = alto / 2) con curva continua, como la barra flotante de iPhone.
  tabBar: {
    borderCurve: 'continuous',
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderTopWidth: 1,
    borderWidth: 1,
    boxShadow: '0 14px 28px rgba(2,6,23,0.20)',
    height: TAB_BAR_HEIGHT,
    marginHorizontal: BAR_INSET,
    paddingBottom: 0,
    paddingHorizontal: BAR_PADDING,
    paddingTop: 0,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  tabIcon: { height: TAB_PILL_HEIGHT },
  tabLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },
  tabLabelSelected: { fontWeight: '700' },
  tabItem: {
    borderCurve: 'continuous',
    borderRadius: 30,
  },
});
