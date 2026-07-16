import { router } from 'expo-router';
import { Building2, CreditCard, FileText, LogOut, Settings } from '@/components/ui/icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteScreen } from '@/components/route-screen';
import { colors, radius } from '@/constants/theme';
import { isOwnerRole, isWebAdminRole } from '@/lib/access-control';
import { useAuth } from '@/providers/auth-context';
import { useAppTheme } from '@/providers/theme-context';
import { useI18n } from '@/providers/i18n-context';

export default function ProfileScreen() {
  const { user, role, signOut } = useAuth();
  const { palette } = useAppTheme(); const { t } = useI18n();
  if (!user) return <RouteScreen title={t('profile')} description={t('loginSubtitle')} showBack={false}>
    <View style={styles.actions}>
      <Action title={t('signIn')} icon={<Settings color={colors.brand} size={22} />} onPress={() => router.push('/(auth)/login')} palette={palette} />
      <Action title={t('createAccount')} icon={<Building2 color={colors.brandDark} size={22} />} onPress={() => router.push('/(auth)/register')} palette={palette} />
    </View>
  </RouteScreen>;
  return <RouteScreen title={user?.name ?? 'Perfil'} description={`${user?.email ?? ''} · ${role ?? ''}`} showBack={false}>
    {isWebAdminRole(role) && <Text style={[styles.adminNote, { color: palette.textSecondary }]}>{t('adminWebNote')}</Text>}
    <View style={styles.actions}>
      {isOwnerRole(role) && <Action title={t('ownerPanel')} icon={<Building2 color={colors.brandDark} size={22} />} onPress={() => router.push('/owner')} palette={palette} />}
      <Action title={t('contracts')} icon={<FileText color={palette.text} size={22} />} onPress={() => router.push('/owner/contracts')} palette={palette} />
      <Action title={t('payments')} icon={<CreditCard color={palette.text} size={22} />} onPress={() => router.push('/owner/payments')} palette={palette} />
      <Action title={t('settings')} icon={<Settings color={palette.text} size={22} />} onPress={() => router.push('/settings')} palette={palette} />
      <Action title={t('signOut')} icon={<LogOut color={colors.error} size={22} />} onPress={() => void signOut()} palette={palette} />
    </View>
  </RouteScreen>;
}
function Action({ title, icon, onPress, palette }: { title: string; icon: React.ReactNode; onPress: () => void; palette: ReturnType<typeof useAppTheme>['palette'] }) { return <Pressable onPress={onPress} style={[styles.action, { backgroundColor: palette.surface }]}>{icon}<Text style={[styles.actionText, { color: palette.text }]}>{title}</Text></Pressable>; }
const styles = StyleSheet.create({ actions: { gap: 10 }, action: { minHeight: 56, borderRadius: radius.md, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, actionText: { fontSize: 15, fontWeight: '700' }, adminNote: { fontSize: 14, lineHeight: 21 }, });
