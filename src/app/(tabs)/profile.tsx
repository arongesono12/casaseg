import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { UserAvatar } from '@/components/user-avatar';
import { ArrowRight, Bell, Building2, CreditCard, FileText, LogOut, Settings, ShieldCheck } from '@/components/ui/icons';
import { colors, radius } from '@/constants/theme';
import { isOwnerRole, isWebAdminRole } from '@/lib/access-control';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

export default function ProfileScreen() {
  const { user, role, signOut } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();

  if (!user) return <Redirect href="/(auth)/login" />;

  const roleLabel = role === 'owner' ? t('owner') : role === 'client' ? t('client') : String(role ?? '').replace(/^./, (letter) => letter.toUpperCase());

  return (
    <RouteScreen title={t('profile')} description={t('profileSubtitle')} showBack={false}>
      <View style={[styles.identityCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <UserAvatar name={user.name} uri={user.avatar} size={92} />
        <View style={styles.identityText}>
          <Text selectable style={[styles.name, { color: palette.text }]}>{user.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: palette.subtle }]}>
            <ShieldCheck color={colors.success} size={17} />
            <Text style={[styles.roleText, { color: palette.text }]}>{roleLabel}</Text>
          </View>
          <Text selectable style={[styles.email, { color: palette.textSecondary }]}>{user.email}</Text>
        </View>
      </View>

      {isWebAdminRole(role) && <Text selectable style={[styles.adminNote, { color: palette.textSecondary }]}>{t('adminWebNote')}</Text>}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{t('account')}</Text>
        <View style={[styles.actions, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Action title={t('notifications')} icon={<Bell color={palette.text} size={22} />} onPress={() => router.push('/notifications')} palette={palette} />
          <Action title={t('settings')} icon={<Settings color={palette.text} size={22} />} onPress={() => router.push('/settings')} palette={palette} />
        </View>
      </View>

      {isOwnerRole(role) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>{t('ownerPanel')}</Text>
          <View style={[styles.actions, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Action title={t('myProperties')} icon={<Building2 color={colors.brand} size={22} />} onPress={() => router.push('/owner')} palette={palette} />
            <Action title={t('contracts')} icon={<FileText color={palette.text} size={22} />} onPress={() => router.push('/owner/contracts')} palette={palette} />
            <Action title={t('payments')} icon={<CreditCard color={palette.text} size={22} />} onPress={() => router.push('/owner/payments')} palette={palette} />
          </View>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('signOut')}
        onPress={() => void signOut()}
        style={({ pressed }) => [styles.signOut, { backgroundColor: `${colors.error}12`, opacity: pressed ? 0.75 : 1 }]}
      >
        <LogOut color={colors.error} size={22} />
        <Text style={styles.signOutText}>{t('signOut')}</Text>
      </Pressable>
    </RouteScreen>
  );
}

function Action({ title, icon, onPress, palette }: { title: string; icon: React.ReactNode; onPress: () => void; palette: ReturnType<typeof useAppTheme>['palette'] }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.action, { backgroundColor: pressed ? palette.subtle : palette.surface }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: palette.subtle }]}>{icon}</View>
      <Text style={[styles.actionText, { color: palette.text }]}>{title}</Text>
      <ArrowRight color={palette.muted} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identityCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 22, flexDirection: 'row', alignItems: 'center', gap: 18, boxShadow: '0 10px 28px rgba(15,23,42,0.07)' },
  identityText: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 7 },
  name: { fontSize: 23, lineHeight: 29, fontWeight: '900' },
  roleBadge: { minHeight: 30, borderRadius: radius.pill, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleText: { fontSize: 12, fontWeight: '900' },
  email: { maxWidth: '100%', fontSize: 14, lineHeight: 20 },
  adminNote: { fontSize: 14, lineHeight: 21 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '900' },
  actions: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous' },
  action: { minHeight: 66, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionText: { flex: 1, fontSize: 15, fontWeight: '800' },
  signOut: { minHeight: 56, borderRadius: radius.md, borderCurve: 'continuous', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  signOutText: { color: colors.error, fontSize: 15, fontWeight: '900' },
});
