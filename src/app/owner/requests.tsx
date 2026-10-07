import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { RouteScreen } from '@/components/route-screen';
import { Calendar, Clock, Inbox } from '@/components/ui/icons';
import { HeroBadge, PremiumEmptyState, PremiumErrorState } from '@/components/ui/premium';
import { VisitRequestCard, type VisitRequestAction } from '@/components/visits/visit-request-card';
import { useProfileId } from '@/features/auth/use-profile-id';
import { contractKeys, ensureActiveLeaseTemplate, generateLeaseContract } from '@/features/contracts/contracts.api';
import { fetchOwnerVisitRequests, visitRequestKeys, type VisitRequest } from '@/features/properties/api/visit-requests';
import { canTransition } from '@/features/visits/visit-schedule';
import { useVisitStatusMutation } from '@/features/visits/use-visit-status-mutation';
import { defineCopy, interpolate, useCopy } from '@/providers/i18n-context';
import { useAppTheme } from '@/providers/theme-context';

import { fontFamily } from '@/constants/theme';
const requestsCopy = defineCopy({
  es: { title: 'Solicitudes de visita', subtitle: 'Confirma o rechaza cada visita para que el cliente sepa a qué atenerse.', pendingCount: '{count} pendientes', loadingTitle: 'Preparando tu agenda', loadingBody: 'Estamos sincronizando las solicitudes de visita.', errorTitle: 'No pudimos abrir las solicitudes', errorBody: 'Comprueba tu conexión y vuelve a intentarlo.', emptyTitle: 'No hay solicitudes todavía', emptyBody: 'Cuando un cliente solicite visitar una propiedad, aparecerá aquí con la fecha propuesta.', accept: 'Confirmar', reject: 'Rechazar', cancel: 'Cancelar visita', contract: 'Generar contrato', contractConfirmTitle: 'Generar contrato', contractConfirmBody: 'Se usará la plantilla de contrato de esta vivienda. Si aún no tiene una, se activará con los términos estándar de CasaSeg. El cliente recibirá un aviso para firmar.', confirm: 'Generar', back: 'Volver', updateError: 'No se pudo actualizar la solicitud: {message}' },
  fr: { title: 'Demandes de visite', subtitle: 'Confirmez ou refusez chaque visite pour que le client sache à quoi s’en tenir.', pendingCount: '{count} en attente', loadingTitle: 'Préparation de votre agenda', loadingBody: 'Nous synchronisons les demandes de visite.', errorTitle: 'Impossible d’ouvrir les demandes', errorBody: 'Vérifiez votre connexion et réessayez.', emptyTitle: 'Aucune demande pour le moment', emptyBody: 'Lorsqu’un client demandera à visiter un logement, la demande apparaîtra ici avec la date proposée.', accept: 'Confirmer', reject: 'Refuser', cancel: 'Annuler la visite', contract: 'Générer le contrat', contractConfirmTitle: 'Générer le contrat', contractConfirmBody: 'Le modèle de contrat de ce logement sera utilisé. S’il n’en a pas encore, il sera activé avec les conditions standard de CasaSeg. Le client sera invité à signer.', confirm: 'Générer', back: 'Retour', updateError: 'Impossible de mettre à jour la demande : {message}' },
  en: { title: 'Visit requests', subtitle: 'Confirm or decline each visit so the client knows where they stand.', pendingCount: '{count} pending', loadingTitle: 'Preparing your schedule', loadingBody: 'We are syncing visit requests.', errorTitle: 'We could not open the requests', errorBody: 'Check your connection and try again.', emptyTitle: 'No requests yet', emptyBody: 'When a client asks to visit a property, it will appear here with the proposed date.', accept: 'Confirm', reject: 'Decline', cancel: 'Cancel visit', contract: 'Generate contract', contractConfirmTitle: 'Generate contract', contractConfirmBody: 'This home’s contract template will be used. If it has none yet, it will be activated with CasaSeg’s standard terms. The client will be asked to sign.', confirm: 'Generate', back: 'Back', updateError: 'The request could not be updated: {message}' },
});
type RequestsCopy = (typeof requestsCopy)['es'];

function ownerActions(request: VisitRequest, copy: RequestsCopy, update: (status: VisitRequest['status']) => void, generateContract: () => void): VisitRequestAction[] {
  const actions: VisitRequestAction[] = [];
  if (canTransition('owner', request.status, 'rejected')) actions.push({ label: copy.reject, variant: 'danger', onPress: () => update('rejected') });
  if (canTransition('owner', request.status, 'accepted')) actions.push({ label: copy.accept, variant: 'primary', onPress: () => update('accepted') });
  // Una visita confirmada por las dos partes es el acuerdo que habilita el contrato.
  if (request.status === 'accepted') actions.push({ label: copy.contract, variant: 'primary', onPress: generateContract });
  if (canTransition('owner', request.status, 'cancelled')) actions.push({ label: copy.cancel, variant: 'secondary', onPress: () => update('cancelled') });
  return actions;
}

export default function OwnerRequests() {
  const copy = useCopy(requestsCopy);
  const { palette } = useAppTheme();
  const profileId = useProfileId();
  const queryClient = useQueryClient();
  const requests = useQuery({
    queryKey: visitRequestKeys.owner(profileId ?? 'pending'),
    queryFn: () => fetchOwnerVisitRequests(profileId!),
    enabled: Boolean(profileId),
  });
  const statusMutation = useVisitStatusMutation();
  const contractMutation = useMutation({
    mutationFn: async (request: VisitRequest) => {
      if (!profileId) throw new Error(copy.loadingBody);
      await ensureActiveLeaseTemplate(request.propertyId, profileId);
      return generateLeaseContract(request.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: contractKeys.all });
      router.push('/owner/contracts');
    },
  });
  const pending = (requests.data ?? []).filter((request) => request.status === 'pending').length;
  const isLoading = !profileId || requests.isLoading;
  const mutationError = statusMutation.error ?? contractMutation.error;

  const confirmContract = (request: VisitRequest) => Alert.alert(copy.contractConfirmTitle, copy.contractConfirmBody, [
    { text: copy.back, style: 'cancel' },
    { text: copy.confirm, onPress: () => contractMutation.mutate(request) },
  ]);

  return (
    <RouteScreen
      title={copy.title}
      description={copy.subtitle}
      headerContent={pending ? <HeroBadge label={interpolate(copy.pendingCount, { count: pending })} icon={Clock} /> : undefined}
    >
      {isLoading && !requests.isError ? <PremiumEmptyState icon={Calendar} title={copy.loadingTitle} description={copy.loadingBody} loading /> : null}
      {requests.isError ? <PremiumErrorState title={copy.errorTitle} description={copy.errorBody} onRetry={() => void requests.refetch()} /> : null}
      {!isLoading && !requests.isError && !requests.data?.length ? <PremiumEmptyState icon={Inbox} title={copy.emptyTitle} description={copy.emptyBody} /> : null}
      {mutationError ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: palette.errorText }]}>
          {interpolate(copy.updateError, { message: mutationError.message })}
        </Text>
      ) : null}

      <View style={styles.list}>
        {requests.data?.map((request) => (
          <VisitRequestCard
            key={request.id}
            request={request}
            busy={statusMutation.isPending || contractMutation.isPending}
            actions={ownerActions(request, copy, (status) => statusMutation.mutate({ id: request.id, status }), () => confirmContract(request))}
            onOpenProperty={() => router.push({ pathname: '/property/[id]', params: { id: request.propertyId } })}
          />
        ))}
      </View>
    </RouteScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  error: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.semibold, textAlign: 'center' },
});
