import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Camera, CheckCircle2, Clock, ShieldCheck } from '@/components/ui/icons';
import { StatusPill, type IconComponent } from '@/components/ui/premium';
import { UserAvatar } from '@/components/user-avatar';
import { actionGradient, colors, fontFamily, radius, type AppPalette } from '@/constants/theme';
import type { CurrentProfile } from '@/features/auth/use-current-profile';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';

const headerCopy = defineCopy({
  es: { phone: 'Teléfono', memberSince: 'Miembro desde', notAdded: 'Sin añadir', verified: 'Verificado', pending: 'Sin verificar', loading: 'Cargando…' },
  fr: { phone: 'Téléphone', memberSince: 'Membre depuis', notAdded: 'Non renseigné', verified: 'Vérifié', pending: 'Non vérifié', loading: 'Chargement…' },
  en: { phone: 'Phone', memberSince: 'Member since', notAdded: 'Not added', verified: 'Verified', pending: 'Unverified', loading: 'Loading…' },
});

const AVATAR_SIZE = 72;
const AVATAR_RING = 3;
const PROFILE_COVER_HEIGHT = 82;

type ProfileHeaderCardProps = {
  name: string;
  email: string;
  avatar?: string;
  profile?: CurrentProfile | null;
  profileLoading: boolean;
  roleLabel: string;
  roleTone: string;
  roleIcon: IconComponent;
  palette: AppPalette;
  wide: boolean;
  topInset: number;
  contentMaxWidth: number;
  editing: boolean;
  mediaSaving: 'avatars' | 'covers' | null;
  avatarEditLabel: string;
  coverEditLabel: string;
  onChangeAvatar: () => void;
  onChangeCover: () => void;
};

function formatMemberSince(value: string | undefined, locale: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const label = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Identidad primero; los datos secundarios quedan en una fila compacta. */
export function ProfileHeaderCard({ name, email, avatar, profile, profileLoading, roleLabel, roleTone, roleIcon, palette, wide, topInset, contentMaxWidth, editing, mediaSaving, avatarEditLabel, coverEditLabel, onChangeAvatar, onChangeCover }: ProfileHeaderCardProps) {
  const { locale } = useI18n();
  const copy = useCopy(headerCopy);
  const emailVerified = profile?.emailVerified ?? true;
  const memberSince = formatMemberSince(profile?.createdAt, locale);
  const phone = profile?.phone ?? (profileLoading ? copy.loading : copy.notAdded);

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={[styles.cover, { height: PROFILE_COVER_HEIGHT + topInset }]}>
        {profile?.coverPicture
          ? <Image source={{ uri: profile.coverPicture }} contentFit="cover" cachePolicy="disk" transition={180} style={StyleSheet.absoluteFill} />
          : <LinearGradient colors={actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
        {editing ? (
          <Pressable accessibilityRole="button" accessibilityLabel={coverEditLabel} disabled={Boolean(mediaSaving)} onPress={onChangeCover} style={styles.coverEditTarget}>
            <View style={styles.coverEditBadge}>
              {mediaSaving === 'covers' ? <ActivityIndicator color="white" size="small" /> : <Camera color="white" size={16} />}
              <Text style={styles.coverEditText}>{coverEditLabel}</Text>
            </View>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.body, { maxWidth: contentMaxWidth }]}>
        <View style={styles.topLine}>
          <View style={[styles.avatarRing, { backgroundColor: palette.surface }]}>
            <UserAvatar name={name} uri={avatar} size={AVATAR_SIZE} />
            {emailVerified ? (
              <View style={[styles.verifiedDot, editing && styles.verifiedDotEditing, { borderColor: palette.surface }]}>
                <ShieldCheck color="white" size={12} fill="white" />
              </View>
            ) : null}
            {editing ? (
              <Pressable accessibilityRole="button" accessibilityLabel={avatarEditLabel} disabled={Boolean(mediaSaving)} onPress={onChangeAvatar} style={styles.avatarEditTarget}>
                <View style={styles.avatarEditBadge}>
                  {mediaSaving === 'avatars' ? <ActivityIndicator color="white" size="small" /> : <Camera color="white" size={16} />}
                </View>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.rolePill}><StatusPill label={roleLabel} tone={roleTone} icon={roleIcon} /></View>
        </View>

        <View style={styles.identity}>
          <Text selectable numberOfLines={2} style={[styles.name, { color: palette.text }]}>{name}</Text>
          <View style={styles.emailLine}>
            <Text selectable numberOfLines={1} style={[styles.email, { color: palette.textSecondary }]}>{email}</Text>
            <View style={styles.inlineStatus}>
              {emailVerified ? <CheckCircle2 color={colors.success} size={14} /> : <Clock color={colors.warning} size={14} />}
              <Text style={[styles.inlineStatusText, { color: emailVerified ? colors.success : colors.warning }]}>{emailVerified ? copy.verified : copy.pending}</Text>
            </View>
          </View>
          {profile?.about ? <Text numberOfLines={wide ? 3 : 2} style={[styles.about, { color: palette.textSecondary }]}>{profile.about}</Text> : null}
        </View>

        <View style={[styles.details, { borderColor: palette.border }]}>
          <View style={styles.detail}>
            <Text style={[styles.detailLabel, { color: palette.muted }]}>{copy.phone}</Text>
            <View style={styles.detailValueLine}>
              <Text selectable numberOfLines={1} style={[styles.detailValue, { color: profile?.phone ? palette.text : palette.textSecondary }]}>{phone}</Text>
            </View>
            {profile?.phone ? <Text style={[styles.phoneStatus, { color: profile.phoneVerified ? colors.success : colors.warning }]}>{profile.phoneVerified ? copy.verified : copy.pending}</Text> : null}
          </View>
          <View style={[styles.detail, styles.memberDetail, { borderColor: palette.border }]}>
            <Text style={[styles.detailLabel, { color: palette.muted }]}>{copy.memberSince}</Text>
            <Text numberOfLines={1} style={[styles.detailValue, { color: memberSince ? palette.text : palette.textSecondary }]}>{memberSince ?? (profileLoading ? copy.loading : '—')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, borderCurve: 'continuous' },
  cover: { backgroundColor: colors.brand },
  coverEditTarget: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'flex-end', justifyContent: 'flex-end', padding: 12, backgroundColor: 'rgba(0,0,0,0.12)' },
  coverEditBadge: { minHeight: 34, borderRadius: radius.pill, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.62)' },
  coverEditText: { color: 'white', fontSize: 12, fontFamily: fontFamily.bold },
  body: { width: '100%', alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 19 },
  topLine: { marginTop: -(AVATAR_SIZE / 2 + AVATAR_RING), flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  avatarRing: { padding: AVATAR_RING, borderRadius: AVATAR_SIZE / 2 + AVATAR_RING },
  avatarEditTarget: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'flex-end', justifyContent: 'flex-end', borderRadius: AVATAR_SIZE / 2 + AVATAR_RING },
  avatarEditBadge: { width: 29, height: 29, borderRadius: 15, backgroundColor: colors.brand, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  verifiedDot: { position: 'absolute', right: 2, bottom: 4, width: 24, height: 24, borderRadius: 12, borderWidth: 2, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  verifiedDotEditing: { right: undefined, left: 2 },
  rolePill: { paddingBottom: 6, flexShrink: 1 },
  identity: { marginTop: 10, gap: 3 },
  name: { fontSize: 25, lineHeight: 31, fontFamily: fontFamily.extrabold, letterSpacing: -0.5 },
  emailLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  email: { minWidth: 0, flexShrink: 1, fontSize: 14, lineHeight: 20, fontFamily: fontFamily.medium },
  inlineStatus: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
  inlineStatusText: { fontSize: 11, lineHeight: 16, fontFamily: fontFamily.semibold },
  about: { marginTop: 5, fontSize: 13, lineHeight: 19, fontFamily: fontFamily.regular },
  details: { marginTop: 16, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row' },
  detail: { flex: 1, minWidth: 0, gap: 4 },
  memberDetail: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 16, marginLeft: 16 },
  detailLabel: { fontSize: 10, lineHeight: 14, fontFamily: fontFamily.bold, letterSpacing: 0.6, textTransform: 'uppercase' },
  detailValueLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailValue: { minWidth: 0, fontSize: 13, lineHeight: 18, fontFamily: fontFamily.semibold },
  phoneStatus: { fontSize: 11, lineHeight: 15, fontFamily: fontFamily.semibold },
});
