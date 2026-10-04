import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { Calendar, Search } from '@/components/ui/icons';
import { PremiumEmptyState, PremiumErrorState, SectionTitle } from '@/components/ui/premium';
import { VisitRequestCard } from '@/components/visits/visit-request-card';
import { useProfileId } from '@/features/auth/use-profile-id';
import { fetchMyVisitRequests, visitRequestKeys, type VisitRequest } from '@/features/properties/api/visit-requests';
import { canTransition } from '@/features/visits/visit-schedule';
import { useVisitStatusMutation } from '@/features/visits/use-visit-status-mutation';
import { defineCopy, interpolate, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

import { fontFamily } from '@/constants/theme';
const myVisitsCopy = defineCopy({
  es: { title: 'Mis visitas', subtitle: 'Sigue el estado de las visitas que has solicitado.', upcoming: 'Próximas', upcomingDetail: 'Pendientes de respuesta o ya confirmadas.', history: 'Historial', historyDetail: 'Visitas pasadas, rechazadas o canceladas.', loadingTitle: 'Cargando tus visitas', loadingBody: 'Estamos consultando tus solicitudes.', errorTitle: 'No pudimos cargar tus visitas', errorBody: 'Comprueba tu conexión y vuelve a intentarlo.', emptyTitle: 'Aún no has pedido ninguna visita', emptyBody: 'Abre una vivienda y pulsa «Reservar visita» para proponer día y hora.', explore: 'Explorar viviendas', cancel: 'Cancelar visita', updateError: 'No se pudo cancelar la visita: {message}' },
  fr: { title: 'Mes visites', subtitle: 'Suivez l’état des visites que vous avez demandées.', upcoming: 'À venir', upcomingDetail: 'En attente de réponse ou déjà confirmées.', history: 'Historique', historyDetail: 'Visites passées, refusées ou annulées.', loadingTitle: 'Chargement de vos visites', loadingBody: 'Nous consultons vos demandes.', errorTitle: 'Impossible de charger vos visites', errorBody: 'Vérifiez votre connexion et réessayez.', emptyTitle: 'Aucune visite demandée', emptyBody: 'Ouvrez un logement et touchez « Réserver une visite » pour proposer une date.', explore: 'Explorer les logements', cancel: 'Annuler la visite', updateError: 'Impossible d’annuler la visite : {message}' },
  en: { title: 'My visits', subtitle: 'Track the status of the visits you have requested.', upcoming: 'Upcoming', upcomingDetail: 'Awaiting a reply or already confirmed.', history: 'History', historyDetail: 'Past, declined or cancelled visits.', loadingTitle: 'Loading your visits', loadingBody: 'We are checking your requests.', errorTitle: 'We could not load your visits', errorBody: 'Check your connection and try again.', emptyTitle: 'You have not requested any visits yet', emptyBody: 'Open a home and tap “Book a visit” to propose a date and time.', explore: 'Explore homes', cancel: 'Cancel visit', updateError: 'The visit could not be cancelled: {message}' },
});

function isUpcoming(request: VisitRequest, now: number) {
  return (request.status === 'pending' || request.status === 'accepted') && new Date(request.proposedAt).getTime() >= now;
}

export default function MyVisitsScreen() {
  const copy = useCopy(myVisitsCopy);
  const { palette } = useAppTheme();
  const profileId = useProfileId();
  const requests = useQuery({
    queryKey: visitRequestKeys.mine(profileId ?? 'pending'),
    queryFn: () => fetchMyVisitRequests(profileId!),
    enabled: Boolean(profileId),
  });
  const statusMutation = useVisitStatusMutation();
  const isLoading = !profileId || requests.isLoading;
  // Referencia temporal de la última carga: llamar a Date.now() en el render lo
  // haría impuro, y la lista solo cambia cuando llegan datos nuevos.
  const now = requests.dataUpdatedAt;
  const upcoming = (requests.data ?? []).filter((request) => isUpcoming(request, now));
  // El historial va del más reciente al más antiguo; la consulta llega en orden ascendente.
  const history = (requests.data ?? []).filter((request) => !isUpcoming(request, now)).reverse();

  const renderCard = (request: VisitRequest) => (
    <VisitRequestCard
      key={request.id}
      request={request}
      busy={statusMutation.isPending}
      actions={canTransition('requester', request.status, 'cancelled') && isUpcoming(request, now)
        ? [{ label: copy.cancel, variant: 'danger', onPress: () => statusMutation.mutate({ id: request.id, status: 'cancelled' }) }]
        : []}
      onOpenProperty={() => router.push({ pathname: '/property/[id]', params: { id: request.propertyId } })}
    />
  );

  return (
    <RouteScreen title={copy.title} description={copy.subtitle}>
      {isLoading && !requests.isError ? <PremiumEmptyState icon={Calendar} title={copy.loadingTitle} description={copy.loadingBody} loading /> : null}
      {requests.isError ? <PremiumErrorState title={copy.errorTitle} description={copy.errorBody} onRetry={() => void requests.refetch()} /> : null}
      {!isLoading && !requests.isError && !requests.data?.length ? (
        <PremiumEmptyState icon={Search} title={copy.emptyTitle} description={copy.emptyBody} actionLabel={copy.explore} onAction={() => router.push('/(tabs)/explore')} />
      ) : null}
      {statusMutation.error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>
          {interpolate(copy.updateError, { message: statusMutation.error.message })}
        </Text>
      ) : null}

      {upcoming.length ? (
        <View style={styles.group}>
          <SectionTitle title={copy.upcoming} detail={copy.upcomingDetail} />
          <View style={styles.list}>{upcoming.map(renderCard)}</View>
        </View>
      ) : null}
      {history.length ? (
        <View style={styles.group}>
          <SectionTitle title={copy.history} detail={copy.historyDetail} />
          <View style={styles.list}>{history.map(renderCard)}</View>
        </View>
      ) : null}
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: 12 },
  list: { gap: 12 },
  error: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.semibold, textAlign: 'center' },
});
