import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { UserAvatar } from '@/components/user-avatar';
import { ArrowRight, Bell, Building2, CreditCard, FileText, Heart, HomeCheck, Lock, LogOut, MessageCircle, Settings, ShieldCheck, Sparkles, UsersRound } from '@/components/ui/icons';
import { IconTile, StatusPill } from '@/components/ui/premium';
import { colors, radius, type AppPalette } from '@/constants/theme';
import { isAdminRole, isClientRole, isOwnerRole } from '@/lib/access-control';
import { useAuth } from '@/providers/auth-context';
import { useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

export default function ProfileScreen() {
  const { user, role, isRoleLoading, roleError, signOut } = useAuth();
  const { palette } = useAppTheme();
  const { t } = useI18n();

  if (!user) return <Redirect href="/(auth)/login" />;

  const roleLabel = isRoleLoading ? 'Verificando rol' : role === 'owner' ? t('owner') : role === 'client' ? t('client') : role === 'superadmin' ? 'Superadministrador' : role === 'admin' ? 'Administrador' : 'Rol no disponible';
  const roleTone = isAdminRole(role) ? '#7C3AED' : isOwnerRole(role) ? colors.brand : role === 'client' ? colors.success : palette.muted;
  const RoleIcon = isAdminRole(role) ? ShieldCheck : isOwnerRole(role) ? Building2 : role === 'client' ? HomeCheck : Lock;

  return (
    <RouteScreen title={t('profile')} description={t('profileSubtitle')} showBack={false}>
      <View style={[styles.identityCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.avatarWrap}>
          <UserAvatar name={user.name} uri={user.avatar} size={92} />
          <View style={styles.verifiedDot}><ShieldCheck color="white" size={15} fill="white" /></View>
        </View>
        <View style={styles.identityText}>
          <Text selectable style={[styles.name, { color: palette.text }]}>{user.name}</Text>
          <StatusPill label={roleLabel} tone={roleTone} icon={RoleIcon} />
          <Text selectable numberOfLines={1} style={[styles.email, { color: palette.textSecondary }]}>{user.email}</Text>
        </View>
      </View>

      {roleError ? (
        <View style={[styles.roleWarning, { backgroundColor: `${colors.error}0E`, borderColor: `${colors.error}26` }]}>
          <Lock color={colors.error} size={20} />
          <View style={styles.trustCopy}>
            <Text style={[styles.trustTitle, { color: palette.text }]}>No se pudo verificar tu responsabilidad</Text>
            <Text style={[styles.trustDescription, { color: palette.textSecondary }]}>Cierra sesión y vuelve a entrar. Si continúa, un administrador debe revisar el perfil asociado.</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.trustStrip, { backgroundColor: `${colors.success}0E`, borderColor: `${colors.success}26` }]}>
        <IconTile icon={Lock} tone={colors.success} size={42} />
        <View style={styles.trustCopy}>
          <Text style={[styles.trustTitle, { color: palette.text }]}>Cuenta protegida</Text>
          <Text style={[styles.trustDescription, { color: palette.textSecondary }]}>Tus datos y conversaciones se gestionan con acceso seguro.</Text>
        </View>
      </View>

      {isAdminRole(role) ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/admin' as Href)} style={({ pressed }) => [styles.ownerCta, pressed && styles.pressed]}>
          <LinearGradient colors={role === 'superadmin' ? ['#3B0764', '#7C3AED'] : ['#172554', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ownerGradient}>
            <View style={styles.ownerCopy}>
              <View style={styles.ownerEyebrow}><ShieldCheck color="#DDD6FE" size={15} /><Text style={styles.ownerEyebrowText}>RESPONSABILIDAD ADMINISTRATIVA</Text></View>
              <Text style={styles.ownerTitle}>Panel de administración</Text>
              <Text style={styles.ownerDescription}>Supervisa usuarios, roles, publicaciones y revisiones pendientes.</Text>
            </View>
            <View style={styles.ownerArrow}><ArrowRight color="white" size={22} /></View>
          </LinearGradient>
        </Pressable>
      ) : null}

      {isOwnerRole(role) ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/owner')} style={({ pressed }) => [styles.ownerCta, pressed && styles.pressed]}>
          <LinearGradient colors={['#0B1F4D', '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ownerGradient}>
            <View style={styles.ownerCopy}>
              <View style={styles.ownerEyebrow}><Sparkles color="#BFDBFE" size={15} /><Text style={styles.ownerEyebrowText}>ESPACIO PROFESIONAL</Text></View>
              <Text style={styles.ownerTitle}>{t('ownerPanel')}</Text>
              <Text style={styles.ownerDescription}>{t('ownerPanelSubtitle')}</Text>
            </View>
            <View style={styles.ownerArrow}><ArrowRight color="white" size={22} /></View>
          </LinearGradient>
        </Pressable>
      ) : null}

      {isClientRole(role) ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Tu búsqueda</Text>
          <View style={[styles.actions, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Action title={t('saved')} description="Propiedades que quieres comparar" icon={<Heart color={colors.favorite} size={21} />} tone={colors.favorite} onPress={() => router.push('/(tabs)/saved')} palette={palette} />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <Action title={t('messages')} description="Conversaciones con propietarios" icon={<MessageCircle color={colors.brand} size={21} />} tone={colors.brand} onPress={() => router.push('/(tabs)/messages')} palette={palette} />
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{t('account')}</Text>
        <View style={[styles.actions, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Action title={t('notifications')} description="Alertas, mensajes y actividad" icon={<Bell color={colors.brand} size={21} />} tone={colors.brand} onPress={() => router.push('/notifications')} palette={palette} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <Action title={t('settings')} description="Tema, idioma y preferencias" icon={<Settings color="#7C3AED" size={21} />} tone="#7C3AED" onPress={() => router.push('/settings')} palette={palette} />
        </View>
      </View>

      {isOwnerRole(role) ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Gestión rápida</Text>
          <View style={[styles.actions, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Action title={t('myProperties')} description="Publicaciones y borradores" icon={<Building2 color={colors.brand} size={21} />} tone={colors.brand} onPress={() => router.push('/owner/properties')} palette={palette} />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <Action title={t('contracts')} description="Documentos y firmas" icon={<FileText color={colors.success} size={21} />} tone={colors.success} onPress={() => router.push('/owner/contracts')} palette={palette} />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <Action title={t('payments')} description="Cobros y operaciones" icon={<CreditCard color="#D97706" size={21} />} tone="#D97706" onPress={() => router.push('/owner/payments')} palette={palette} />
          </View>
        </View>
      ) : null}

      {isAdminRole(role) ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Gestión administrativa</Text>
          <View style={[styles.actions, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Action title="Usuarios y roles" description="Directorio, estados y responsabilidades" icon={<UsersRound color={colors.brand} size={21} />} tone={colors.brand} onPress={() => router.push('/admin/users')} palette={palette} />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <Action title="Supervisión de propiedades" description="Verificaciones y publicaciones pendientes" icon={<Building2 color="#7C3AED" size={21} />} tone="#7C3AED" onPress={() => router.push('/admin/properties')} palette={palette} />
          </View>
        </View>
      ) : null}

      <Pressable accessibilityRole="button" accessibilityLabel={t('signOut')} onPress={() => void signOut()} style={({ pressed }) => [styles.signOut, { backgroundColor: `${colors.error}0E`, borderColor: `${colors.error}26` }, pressed && styles.pressed]}>
        <LogOut color={colors.error} size={21} />
        <Text style={styles.signOutText}>{t('signOut')}</Text>
      </Pressable>
      <View style={styles.tabSpacer} />
    </RouteScreen>
  );
}

function Action({ title, description, icon, tone, onPress, palette }: { title: string; description: string; icon: ReactNode; tone: string; onPress: () => void; palette: AppPalette }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.action, { backgroundColor: pressed ? palette.subtle : palette.surface }]}>
      <View style={[styles.actionIcon, { backgroundColor: `${tone}14` }]}>{icon}</View>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionText, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.actionDescription, { color: palette.textSecondary }]}>{description}</Text>
      </View>
      <ArrowRight color={palette.muted} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identityCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 18, boxShadow: '0 12px 30px rgba(15,23,42,0.07)' },
  avatarWrap: { position: 'relative' },
  verifiedDot: { position: 'absolute', right: -1, bottom: 1, width: 27, height: 27, borderRadius: 14, backgroundColor: colors.success, borderWidth: 3, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  identityText: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 8 },
  name: { fontSize: 23, lineHeight: 29, fontWeight: '900' },
  email: { maxWidth: '100%', fontSize: 14, lineHeight: 20 },
  trustStrip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleWarning: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  trustCopy: { flex: 1, gap: 3 },
  trustTitle: { fontSize: 14, fontWeight: '900' },
  trustDescription: { fontSize: 12, lineHeight: 17 },
  ownerCta: { borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', boxShadow: '0 14px 30px rgba(29,78,216,0.20)' },
  ownerGradient: { minHeight: 164, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  ownerCopy: { flex: 1, gap: 8 },
  ownerEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ownerEyebrowText: { color: '#BFDBFE', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  ownerTitle: { color: 'white', fontSize: 22, fontWeight: '900' },
  ownerDescription: { color: '#DBEAFE', fontSize: 13, lineHeight: 19 },
  ownerArrow: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 19, lineHeight: 24, fontWeight: '900' },
  actions: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: '0 10px 24px rgba(15,23,42,0.05)' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 70 },
  action: { minHeight: 76, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, minWidth: 0, gap: 3 },
  actionText: { fontSize: 15, fontWeight: '900' },
  actionDescription: { fontSize: 12, lineHeight: 17 },
  signOut: { minHeight: 56, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, borderCurve: 'continuous', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  signOutText: { color: colors.error, fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
  tabSpacer: { height: 92 },
});
