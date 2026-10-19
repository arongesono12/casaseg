import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Building2, Calendar, CheckCircle2, Clock, Home, Search, Star, UsersRound } from '@/components/ui/icons';
import { MetricCard, PremiumEmptyState, PremiumErrorState, SectionTitle, StatusPill } from '@/components/ui/premium';
import { VisitRequestCard } from '@/components/visits/visit-request-card';
import { colors, fontFamily, radius, touchTarget, type AppPalette } from '@/constants/theme';
import { fetchAdminOverview } from '@/features/admin/admin.api';
import { useProfileId } from '@/features/auth/use-profile-id';
import { useOwnerProperties } from '@/features/owner/use-owner-properties';
import { latestVisitRequests, summarizeOwnerProperties } from '@/features/profile/profile-activity';
import { fetchMyVisitRequests, visitRequestKeys } from '@/features/properties/api/visit-requests';
import { isAdminRole, isOwnerRole } from '@/lib/access-control';
import { pressRipple, usesRipple } from '@/lib/press-feedback';
import { defineCopy, useCopy, useI18n } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';
import type { Property, UserRole } from '@/types';

const RECENT_PROPERTIES = 5;
const RECENT_VISITS = 3;

const activityCopy = defineCopy({
  es: { seeAll: 'Ver todo', loading: 'Cargando actividad', loadingBody: 'Estamos reuniendo tus datos más recientes.', error: 'No pudimos cargar tu actividad', errorBody: 'Comprueba la conexión y vuelve a intentarlo.', myProperties: 'Mis propiedades', published: 'Publicadas', averageRating: 'Valoración media', latestProperties: 'Tus viviendas', latestPropertiesDetail: 'Las más recientes y su estado de publicación.', noProperties: 'Aún no has publicado viviendas', noPropertiesBody: 'Cuando publiques tu primera vivienda verás aquí su estado.', publish: 'Publicar vivienda', verified: 'Publicada', pending: 'En revisión', restricted: 'Restringida', users: 'Usuarios', properties: 'Propiedades', pendingReview: 'Por revisar', latestVisits: 'Tus últimas visitas', latestVisitsDetail: 'Las visitas que has solicitado, de la más reciente a la más antigua.', noVisits: 'Aún no has pedido ninguna visita', noVisitsBody: 'Abre una vivienda y pulsa «Reservar visita» para proponer día y hora.', explore: 'Explorar viviendas' },
  fr: { seeAll: 'Tout voir', loading: 'Chargement de l’activité', loadingBody: 'Nous rassemblons vos données les plus récentes.', error: 'Impossible de charger votre activité', errorBody: 'Vérifiez la connexion et réessayez.', myProperties: 'Mes logements', published: 'Publiés', averageRating: 'Note moyenne', latestProperties: 'Vos logements', latestPropertiesDetail: 'Les plus récents et leur statut de publication.', noProperties: 'Vous n’avez pas encore publié de logement', noPropertiesBody: 'Dès votre premier logement publié, son statut apparaîtra ici.', publish: 'Publier un logement', verified: 'Publié', pending: 'En vérification', restricted: 'Restreint', users: 'Utilisateurs', properties: 'Logements', pendingReview: 'À vérifier', latestVisits: 'Vos dernières visites', latestVisitsDetail: 'Les visites demandées, de la plus récente à la plus ancienne.', noVisits: 'Aucune visite demandée', noVisitsBody: 'Ouvrez un logement et touchez « Réserver une visite » pour proposer une date.', explore: 'Explorer les logements' },
  en: { seeAll: 'See all', loading: 'Loading activity', loadingBody: 'We are gathering your latest data.', error: 'We could not load your activity', errorBody: 'Check your connection and try again.', myProperties: 'My properties', published: 'Published', averageRating: 'Average rating', latestProperties: 'Your homes', latestPropertiesDetail: 'The most recent ones and their publication status.', noProperties: 'You have not listed any homes yet', noPropertiesBody: 'Once you publish your first home, its status will show here.', publish: 'List a home', verified: 'Published', pending: 'Under review', restricted: 'Restricted', users: 'Users', properties: 'Properties', pendingReview: 'To review', latestVisits: 'Your latest visits', latestVisitsDetail: 'The visits you requested, newest first.', noVisits: 'You have not requested any visits yet', noVisitsBody: 'Open a home and tap “Book a visit” to propose a date and time.', explore: 'Explore homes' },
});
type ActivityCopy = (typeof activityCopy)['es'];

/** «Actividad reciente» de la web, adaptada a cada rol con datos reales. */
export function ActivityPanel({ role }: { role?: UserRole }) {
  if (isAdminRole(role)) return <AdminActivity />;
  if (isOwnerRole(role)) return <OwnerActivity />;
  return <ClientActivity />;
}

function SeeAll({ label, href }: { label: string; href: Href }) {
  const { palette } = useAppTheme();
  return (
    <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push(href)} style={styles.seeAll}>
      <Text style={[styles.seeAllText, { color: palette.brandText }]}>{label}</Text>
    </Pressable>
  );
}

function OwnerActivity() {
  const copy = useCopy(activityCopy);
  const { locale } = useI18n();
  const { palette } = useAppTheme();
  const properties = useOwnerProperties();

  if (properties.isPending) return <PremiumEmptyState icon={Building2} title={copy.loading} description={copy.loadingBody} loading />;
  if (properties.isError) return <PremiumErrorState title={copy.error} description={copy.errorBody} onRetry={() => void properties.refetch()} />;

  const summary = summarizeOwnerProperties(properties.data);
  const rating = summary.averageRating === null ? '—' : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(summary.averageRating);

  return (
    <View style={styles.panel}>
      <View style={styles.metrics}>
        <MetricCard label={copy.myProperties} value={summary.total} icon={Building2} />
        <MetricCard label={copy.published} value={summary.published} icon={CheckCircle2} tone={colors.success} />
        <MetricCard label={copy.averageRating} value={rating} icon={Star} tone={colors.warning} />
      </View>
      <View style={styles.section}>
        <SectionTitle title={copy.latestProperties} detail={copy.latestPropertiesDetail} action={summary.total > RECENT_PROPERTIES ? <SeeAll label={copy.seeAll} href="/owner/properties" /> : undefined} />
        {properties.data.length ? (
          <View style={[styles.list, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            {properties.data.slice(0, RECENT_PROPERTIES).map((property, index) => (
              <PropertyRow key={property.id} property={property} copy={copy} palette={palette} divided={index > 0} />
            ))}
          </View>
        ) : (
          <PremiumEmptyState icon={Home} title={copy.noProperties} description={copy.noPropertiesBody} actionLabel={copy.publish} onAction={() => router.push('/owner/property/create')} />
        )}
      </View>
    </View>
  );
}

function PropertyRow({ property, copy, palette, divided }: { property: Property; copy: ActivityCopy; palette: AppPalette; divided: boolean }) {
  const status = property.legalStatus === 'verified'
    ? { label: copy.verified, tone: colors.success }
    : property.legalStatus === 'pending'
      ? { label: copy.pending, tone: colors.warning }
      : { label: copy.restricted, tone: colors.error };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${property.title}, ${status.label}`}
      android_ripple={pressRipple}
      onPress={() => router.push({ pathname: '/owner/property/[id]', params: { id: property.id } })}
      style={({ pressed }) => [styles.row, divided && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border }, pressed && !usesRipple && styles.pressed]}
    >
      {property.imageUrls[0]
        ? <Image source={{ uri: property.imageUrls[0] }} contentFit="cover" cachePolicy="disk" style={styles.thumb} />
        : <View style={[styles.thumb, { backgroundColor: palette.subtle }]} />}
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={[styles.rowTitle, { color: palette.text }]}>{property.title}</Text>
        <Text numberOfLines={1} style={[styles.rowDetail, { color: palette.textSecondary }]}>{property.location || property.city}</Text>
      </View>
      <StatusPill label={status.label} tone={status.tone} />
    </Pressable>
  );
}

function AdminActivity() {
  const copy = useCopy(activityCopy);
  // Misma clave que el panel de administración: comparten caché.
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: fetchAdminOverview });

  if (overview.isPending) return <PremiumEmptyState icon={UsersRound} title={copy.loading} description={copy.loadingBody} loading />;
  if (overview.isError) return <PremiumErrorState title={copy.error} description={copy.errorBody} onRetry={() => void overview.refetch()} />;

  const { metrics } = overview.data;
  return (
    <View style={styles.metrics}>
      <MetricCard label={copy.users} value={metrics.users} icon={UsersRound} />
      <MetricCard label={copy.properties} value={metrics.properties} icon={Building2} tone={colors.primary} />
      <MetricCard label={copy.pendingReview} value={metrics.pendingProperties} icon={Clock} tone={colors.warning} />
    </View>
  );
}

function ClientActivity() {
  const copy = useCopy(activityCopy);
  const profileId = useProfileId();
  const requests = useQuery({
    queryKey: visitRequestKeys.mine(profileId ?? 'pending'),
    queryFn: () => fetchMyVisitRequests(profileId!),
    enabled: Boolean(profileId),
  });

  if (!profileId || requests.isPending) return <PremiumEmptyState icon={Calendar} title={copy.loading} description={copy.loadingBody} loading />;
  if (requests.isError) return <PremiumErrorState title={copy.error} description={copy.errorBody} onRetry={() => void requests.refetch()} />;
  if (!requests.data.length) return <PremiumEmptyState icon={Search} title={copy.noVisits} description={copy.noVisitsBody} actionLabel={copy.explore} onAction={() => router.push('/(tabs)/explore')} />;

  return (
    <View style={styles.section}>
      <SectionTitle title={copy.latestVisits} detail={copy.latestVisitsDetail} action={requests.data.length > RECENT_VISITS ? <SeeAll label={copy.seeAll} href="/visits" /> : undefined} />
      {latestVisitRequests(requests.data, RECENT_VISITS).map((request) => (
        <VisitRequestCard key={request.id} request={request} onOpenProperty={() => router.push({ pathname: '/property/[id]', params: { id: request.propertyId } })} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 24 },
  section: { gap: 12 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden' },
  row: { minHeight: 72, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 44, borderRadius: radius.sm },
  rowCopy: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: { fontSize: 14, fontFamily: fontFamily.bold },
  rowDetail: { fontSize: 12, fontFamily: fontFamily.regular },
  seeAll: { minHeight: touchTarget, justifyContent: 'center' },
  seeAllText: { fontSize: 13, fontFamily: fontFamily.extrabold },
  pressed: { opacity: 0.76 },
});
