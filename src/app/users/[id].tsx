import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { PropertyCard } from '@/components/property/property-card';
import { CoverSocialLinks } from '@/components/profile/cover-social-links';
import { RouteScreen } from '@/components/route-screen';
import { Building2, Lock, UserRound } from '@/components/ui/icons';
import { PremiumButton, PremiumEmptyState, PremiumErrorState, StatusPill } from '@/components/ui/premium';
import { UserAvatar } from '@/components/user-avatar';
import { actionGradient, fontFamily, radius } from '@/constants/theme';
import { fetchVisibleUserProfile, fetchVisibleUserProperties } from '@/features/profile/public-profile.api';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import { formatDate } from '@/utils/formatters';

const copy = defineCopy({
  es: { title: 'Perfil público', subtitle: 'Conoce a la persona detrás de cada conversación.', loading: 'Cargando perfil…', unavailable: 'Perfil no disponible', unavailableBody: 'Este perfil no existe o su propietario decidió mantenerlo privado.', error: 'No pudimos abrir el perfil', errorBody: 'Comprueba tu conexión e inténtalo de nuevo.', retry: 'Reintentar', about: 'Sobre esta persona', listings: 'Viviendas publicadas', noListings: 'Este usuario todavía no tiene viviendas publicadas.', memberSince: 'Miembro desde', owner: 'Propietario', client: 'Cliente', admin: 'Equipo CasaSeg' },
  fr: { title: 'Profil public', subtitle: 'Découvrez la personne derrière chaque conversation.', loading: 'Chargement du profil…', unavailable: 'Profil indisponible', unavailableBody: 'Ce profil n’existe pas ou son propriétaire a choisi de le garder privé.', error: 'Impossible d’ouvrir le profil', errorBody: 'Vérifiez votre connexion et réessayez.', retry: 'Réessayer', about: 'À propos', listings: 'Logements publiés', noListings: 'Cet utilisateur n’a pas encore publié de logement.', memberSince: 'Membre depuis', owner: 'Propriétaire', client: 'Client', admin: 'Équipe CasaSeg' },
  en: { title: 'Public profile', subtitle: 'Meet the person behind the conversation.', loading: 'Loading profile…', unavailable: 'Profile unavailable', unavailableBody: 'This profile does not exist or its owner chose to keep it private.', error: 'Could not open profile', errorBody: 'Check your connection and try again.', retry: 'Retry', about: 'About', listings: 'Published homes', noListings: 'This user has not published any homes yet.', memberSince: 'Member since', owner: 'Owner', client: 'Client', admin: 'CasaSeg team' },
});

export default function VisibleUserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = typeof id === 'string' ? id : '';
  const { locale } = useI18n();
  const text = useCopy(copy);
  const { palette } = useAppTheme();
  const { width } = useWindowDimensions();
  const profile = useQuery({
    queryKey: ['visible-user-profile', userId],
    queryFn: () => fetchVisibleUserProfile(userId),
    enabled: Boolean(userId),
  });
  const listings = useQuery({
    queryKey: ['visible-user-properties', userId],
    queryFn: () => fetchVisibleUserProperties(userId),
    enabled: Boolean(profile.data?.id),
  });
  const user = profile.data;
  const roleLabel = user?.role === 'owner' ? text.owner : user?.role === 'admin' || user?.role === 'superadmin' ? text.admin : text.client;
  const cardWidth = width >= 720 ? '48%' : '100%';
  const coverImage = user?.coverPicture || listings.data?.[0]?.imageUrls[0];

  return (
    <RouteScreen title={text.title} description={text.subtitle} maxWidth={760}>
      {!userId || (profile.isSuccess && !user) ? (
        <PremiumEmptyState icon={Lock} title={text.unavailable} description={text.unavailableBody} />
      ) : profile.isError && !user ? (
        <PremiumErrorState title={text.error} description={text.errorBody} onRetry={() => void profile.refetch()} />
      ) : !user ? (
        <PremiumEmptyState icon={UserRound} title={text.loading} description="" loading />
      ) : (
        <>
          <View style={[styles.profileCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.cover, { backgroundColor: palette.brandSoft }]}>
              {coverImage ? (
                <Image source={{ uri: coverImage }} contentFit="cover" cachePolicy="disk" style={StyleSheet.absoluteFill} />
              ) : (
                <LinearGradient colors={actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              )}
              <CoverSocialLinks links={user.socialLinks} />
            </View>
            <View style={styles.identity}>
              <View style={[styles.avatarFrame, { borderColor: palette.surface }]}>
                <UserAvatar name={user.name} uri={user.avatar} size={88} />
              </View>
              <StatusPill label={roleLabel} tone={palette.brandIcon} />
              <Text selectable style={[styles.name, { color: palette.text }]}>{user.name}</Text>
              {user.createdAt ? (
                <Text style={[styles.memberSince, { color: palette.textSecondary }]}>{text.memberSince} {formatDate(user.createdAt, locale)}</Text>
              ) : null}
            </View>
          </View>

          {user.about ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>{text.about}</Text>
              <Text selectable style={[styles.about, { color: palette.textSecondary }]}>{user.about}</Text>
            </View>
          ) : null}

          {listings.isError ? (
            <View style={styles.section}>
              <Text style={[styles.about, { color: palette.textSecondary }]}>{text.errorBody}</Text>
              <PremiumButton label={text.retry} variant="secondary" size="sm" onPress={() => void listings.refetch()} />
            </View>
          ) : listings.data?.length ? (
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Building2 color={palette.brandIcon} size={22} />
                <Text style={[styles.sectionTitle, { color: palette.text }]}>{text.listings}</Text>
              </View>
              <View style={styles.listings}>
                {listings.data.map((property) => (
                  <View key={property.id} style={{ width: cardWidth }}>
                    <PropertyCard property={property} compact={width >= 720} />
                  </View>
                ))}
              </View>
            </View>
          ) : listings.isSuccess && user.role === 'owner' ? (
            <Text style={[styles.about, { color: palette.textSecondary }]}>{text.noListings}</Text>
          ) : null}
        </>
      )}
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  profileCard: { borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden' },
  cover: { height: 160 },
  identity: { alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  avatarFrame: { marginTop: -48, borderWidth: 4, borderRadius: 50 },
  name: { fontFamily: fontFamily.extrabold, fontSize: 26, lineHeight: 32 },
  memberSince: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  section: { gap: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26 },
  about: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 23 },
  listings: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
});
