import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Calendar, CheckCircle2, Clock, Mail, Phone, ShieldCheck } from '@/components/ui/icons';
import { StatusPill, type IconComponent } from '@/components/ui/premium';
import { UserAvatar } from '@/components/user-avatar';
import { actionGradient, colors, fontFamily, radius, type AppPalette } from '@/constants/theme';
import type { CurrentProfile } from '@/features/auth/use-current-profile';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';

const headerCopy = defineCopy({
  es: { email: 'Correo electrónico', phone: 'Teléfono', memberSince: 'Miembro desde', notAdded: 'Sin añadir', verified: 'Verificado', pending: 'Pendiente', loading: 'Cargando…' },
  fr: { email: 'E-mail', phone: 'Téléphone', memberSince: 'Membre depuis', notAdded: 'Non renseigné', verified: 'Vérifié', pending: 'En attente', loading: 'Chargement…' },
  en: { email: 'Email', phone: 'Phone', memberSince: 'Member since', notAdded: 'Not added', verified: 'Verified', pending: 'Pending', loading: 'Loading…' },
});

const AVATAR_SIZE = 96;
const AVATAR_RING = 4;
/** Alto visible de la portada; se le suma el inset superior porque la tarjeta va a sangre. */
const PROFILE_COVER_HEIGHT = 132;

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
  /** Inset de la barra de estado: la portada se extiende por detrás de ella. */
  topInset: number;
  /** Ancho máximo del contenido, alineado con el resto de la pantalla. */
  contentMaxWidth: number;
};

type DetailStatus = { label: string; tone: string };

function formatMemberSince(value: string | undefined, locale: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const label = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Cabecera del perfil: portada, avatar, identidad y datos de contacto de la cuenta. */
export function ProfileHeaderCard({ name, email, avatar, profile, profileLoading, roleLabel, roleTone, roleIcon, palette, wide, topInset, contentMaxWidth }: ProfileHeaderCardProps) {
  const { locale } = useI18n();
  const copy = useCopy(headerCopy);
  // Clerk solo deja entrar con el correo verificado; la ficha puede afinarlo.
  const emailVerified = profile?.emailVerified ?? true;
  const memberSince = formatMemberSince(profile?.createdAt, locale);
  const verification = (verified: boolean): DetailStatus => ({ label: verified ? copy.verified : copy.pending, tone: verified ? colors.success : colors.warning });

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={[styles.cover, { height: PROFILE_COVER_HEIGHT + topInset }]}>
        {profile?.coverPicture
          ? <Image source={{ uri: profile.coverPicture }} contentFit="cover" cachePolicy="disk" transition={180} style={StyleSheet.absoluteFill} />
          : <LinearGradient colors={actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
        <LinearGradient colors={['transparent', 'rgba(15,23,42,0.28)']} style={StyleSheet.absoluteFill} />
      </View>

      <View style={[styles.body, { maxWidth: contentMaxWidth }]}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatarRing, { backgroundColor: palette.surface }]}>
            <UserAvatar name={name} uri={avatar} size={AVATAR_SIZE} />
            {emailVerified ? (
              <View style={[styles.verifiedDot, { borderColor: palette.surface }]}>
                <ShieldCheck color="white" size={14} fill="white" />
              </View>
            ) : null}
          </View>
          <View style={styles.rolePill}>
            <StatusPill label={roleLabel} tone={roleTone} icon={roleIcon} />
          </View>
        </View>

        <View style={styles.identity}>
          <Text selectable numberOfLines={2} style={[styles.name, { color: palette.text }]}>{name}</Text>
          {profile?.about ? <Text style={[styles.about, { color: palette.textSecondary }]}>{profile.about}</Text> : null}
        </View>

        <View style={[styles.details, wide && styles.detailsWide, { borderColor: palette.border }]}>
          <DetailItem icon={Mail} label={copy.email} value={email} status={verification(emailVerified)} palette={palette} wide={wide} />
          <DetailItem
            icon={Phone}
            label={copy.phone}
            value={profile?.phone ?? (profileLoading ? copy.loading : copy.notAdded)}
            muted={!profile?.phone}
            status={profile?.phone ? verification(profile.phoneVerified) : undefined}
            palette={palette}
            wide={wide}
          />
          <DetailItem
            icon={Calendar}
            label={copy.memberSince}
            value={memberSince ?? (profileLoading ? copy.loading : '—')}
            muted={!memberSince}
            palette={palette}
            wide={wide}
          />
        </View>
      </View>
    </View>
  );
}

function DetailItem({ icon: Icon, label, value, status, muted = false, palette, wide }: {
  icon: IconComponent;
  label: string;
  value: string;
  status?: DetailStatus;
  muted?: boolean;
  palette: AppPalette;
  wide: boolean;
}) {
  const StatusIcon = status?.tone === colors.success ? CheckCircle2 : Clock;
  return (
    <View style={[styles.detail, wide && styles.detailWide]}>
      <View style={[styles.detailIcon, { backgroundColor: palette.brandSoft }]}>
        <Icon color={palette.brandIcon} size={18} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={[styles.detailLabel, { color: palette.textSecondary }]}>{label}</Text>
        <Text selectable numberOfLines={1} style={[styles.detailValue, { color: muted ? palette.muted : palette.text }]}>{value}</Text>
        {status ? (
          <View style={styles.detailStatus}>
            <StatusIcon color={status.tone} size={13} />
            <Text style={[styles.detailStatusText, { color: status.tone }]}>{status.label}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A sangre: ocupa todo el ancho desde el borde superior; solo se redondea abajo.
  card: { overflow: 'hidden', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: radius.hero, borderBottomRightRadius: radius.hero, borderCurve: 'continuous', boxShadow: '0 12px 30px rgba(15,23,42,0.07)' },
  cover: { backgroundColor: colors.brand },
  body: { width: '100%', alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 22, gap: 14 },
  avatarRow: { marginTop: -(AVATAR_SIZE / 2 + AVATAR_RING), flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  avatarRing: { padding: AVATAR_RING, borderRadius: AVATAR_SIZE / 2 + AVATAR_RING },
  verifiedDot: { position: 'absolute', right: 4, bottom: 6, width: 28, height: 28, borderRadius: 14, borderWidth: 3, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  rolePill: { paddingBottom: 6, flexShrink: 1 },
  identity: { gap: 4 },
  name: { fontSize: 24, lineHeight: 30, fontFamily: fontFamily.extrabold },
  about: { fontFamily: fontFamily.regular, marginTop: 6, fontSize: 14, lineHeight: 21 },
  details: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, gap: 14 },
  detailsWide: { flexDirection: 'row', gap: 12 },
  detail: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailWide: { flex: 1, minWidth: 0 },
  detailIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  detailCopy: { flex: 1, minWidth: 0, gap: 2 },
  detailLabel: { fontSize: 11, fontFamily: fontFamily.bold, letterSpacing: 0.4, textTransform: 'uppercase' },
  detailValue: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.semibold },
  detailStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  detailStatusText: { fontSize: 12, fontFamily: fontFamily.bold },
});
