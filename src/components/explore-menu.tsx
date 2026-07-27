import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Check,
  ChevronRight,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  Translate,
  UserRound,
  X,
  type IconProps,
} from '@/components/ui/icons';
import { actionGradient, colors, radius, touchTarget } from '@/constants/theme';
import { useAuth } from '@/providers/auth-context';
import { useI18n, type Locale } from '@/providers/i18n-context';
import { useAppTheme, type ThemeMode } from '@/providers/theme-context';

type ExploreMenuProps = {
  onClose: () => void;
  visible: boolean;
};

type OptionValue = Locale | ThemeMode;
type OptionIcon = React.ComponentType<IconProps>;

const languageOptions: { value: Locale; label: string; flag: string }[] = [
  { value: 'es', label: 'Español', flag: '🇬🇶' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
];

function Choice({
  icon: Icon,
  label,
  onPress,
  selected,
  value,
}: {
  icon?: OptionIcon;
  label: string;
  onPress: (value: OptionValue) => void;
  selected: boolean;
  value: OptionValue;
}) {
  const { palette } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => onPress(value)}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: selected ? colors.accentSoft : palette.surface,
          borderColor: selected ? `${colors.accent}66` : palette.border,
        },
        pressed && styles.pressed,
      ]}
    >
      {Icon ? <Icon color={selected ? colors.accentDark : palette.textSecondary} size={17} /> : null}
      <Text style={[styles.choiceLabel, { color: selected ? colors.accentDark : palette.textSecondary }]}>{label}</Text>
      {selected ? <Check color={colors.accentDark} size={16} /> : null}
    </Pressable>
  );
}

export function ExploreMenu({ onClose, visible }: ExploreMenuProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, isAuthenticated, signOut } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const { mode, palette, setMode } = useAppTheme();
  const panelWidth = Math.min(width - 24, 380);
  const themeOptions: { value: ThemeMode; label: string; icon: OptionIcon }[] = [
    { value: 'light', label: t('light'), icon: Sun },
    { value: 'dark', label: t('dark'), icon: Moon },
    { value: 'system', label: t('system'), icon: Monitor },
  ];

  const navigate = (path: '/(auth)/login' | '/(tabs)/profile' | '/settings') => {
    onClose();
    router.push(path);
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={t('cancel')}
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <SafeAreaView
          accessibilityViewIsModal
          edges={['top', 'bottom']}
          style={[styles.panel, { backgroundColor: palette.background, width: panelWidth }]}
        >
          <View style={styles.menuHeader}>
            <View>
              <Text style={[styles.menuEyebrow, { color: colors.accentDark }]}>CASASEG</Text>
              <Text accessibilityRole="header" style={[styles.menuTitle, { color: palette.text }]}>{t('menu')}</Text>
            </View>
            <Pressable
              accessibilityLabel={t('cancel')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, { backgroundColor: palette.subtle }, pressed && styles.pressed]}
            >
              <X color={palette.text} size={22} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.menuContent} showsVerticalScrollIndicator={false}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate(isAuthenticated ? '/(tabs)/profile' : '/(auth)/login')}
              style={({ pressed }) => [
                styles.accountCard,
                { backgroundColor: palette.surface, borderColor: palette.border },
                pressed && styles.pressed,
              ]}
            >
              <LinearGradient colors={actionGradient} style={styles.avatar}>
                {isAuthenticated ? <UserRound color="white" fill="white" size={25} /> : <LogIn color="white" size={24} />}
              </LinearGradient>
              <View style={styles.accountCopy}>
                <Text numberOfLines={1} style={[styles.accountTitle, { color: palette.text }]}>
                  {isAuthenticated ? user?.name || t('profile') : t('signIn')}
                </Text>
                <Text numberOfLines={1} style={[styles.accountSubtitle, { color: palette.textSecondary }]}>
                  {isAuthenticated ? user?.email : t('loginSubtitle')}
                </Text>
              </View>
              <ChevronRight color={palette.muted} size={20} />
            </Pressable>

            <View accessibilityRole="radiogroup" style={styles.section}>
              <View style={styles.sectionTitle}>
                <Translate color={palette.textSecondary} size={19} />
                <Text style={[styles.sectionLabel, { color: palette.text }]}>{t('language')}</Text>
              </View>
              <View style={styles.choices}>
                {languageOptions.map((option) => (
                  <Choice
                    key={option.value}
                    label={`${option.flag} ${option.label}`}
                    onPress={(value) => setLocale(value as Locale)}
                    selected={locale === option.value}
                    value={option.value}
                  />
                ))}
              </View>
            </View>

            <View accessibilityRole="radiogroup" style={styles.section}>
              <View style={styles.sectionTitle}>
                <Sun color={palette.textSecondary} size={19} />
                <Text style={[styles.sectionLabel, { color: palette.text }]}>{t('theme')}</Text>
              </View>
              <View style={styles.choices}>
                {themeOptions.map((option) => (
                  <Choice
                    key={option.value}
                    icon={option.icon}
                    label={option.label}
                    onPress={(value) => setMode(value as ThemeMode)}
                    selected={mode === option.value}
                    value={option.value}
                  />
                ))}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: palette.border }]} />

            <Pressable
              accessibilityRole="button"
              onPress={() => navigate('/settings')}
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
            >
              <View style={[styles.rowIcon, { backgroundColor: palette.subtle }]}>
                <Settings color={palette.textSecondary} size={20} />
              </View>
              <Text style={[styles.rowLabel, { color: palette.text }]}>{t('settings')}</Text>
              <ChevronRight color={palette.muted} size={20} />
            </Pressable>

            {isAuthenticated ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void handleSignOut()}
                style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
              >
                <View style={[styles.rowIcon, { backgroundColor: `${colors.error}12` }]}>
                  <LogOut color={colors.error} size={20} />
                </View>
                <Text style={[styles.rowLabel, { color: colors.error }]}>{t('signOut')}</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  accountCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    padding: 12,
  },
  accountCopy: { flex: 1, gap: 3, minWidth: 0 },
  accountSubtitle: { fontSize: 12, lineHeight: 16 },
  accountTitle: { fontSize: 15, fontWeight: '900' },
  avatar: { alignItems: 'center', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  backdrop: {
    backgroundColor: 'rgba(2,6,23,0.48)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  choice: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  choiceLabel: { fontSize: 12, fontWeight: '800' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  closeButton: { alignItems: 'center', borderRadius: touchTarget / 2, height: touchTarget, justifyContent: 'center', width: touchTarget },
  divider: { height: StyleSheet.hairlineWidth },
  menuContent: { gap: 24, paddingBottom: 24 },
  menuEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  menuHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 20 },
  menuRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 54 },
  menuTitle: { fontSize: 27, fontWeight: '900', lineHeight: 32 },
  overlay: { alignItems: 'flex-end', flex: 1 },
  panel: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#020617',
    shadowOffset: { height: 0, width: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  pressed: { opacity: 0.76 },
  rowIcon: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '800' },
  section: { gap: 11 },
  sectionLabel: { fontSize: 14, fontWeight: '900' },
  sectionTitle: { alignItems: 'center', flexDirection: 'row', gap: 8 },
});
