import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { FormField } from '@/components/form-field';
import { RouteScreen } from '@/components/route-screen';
import { PremiumButton } from '@/components/ui/premium';
import { colors } from '@/constants/theme';
import { createVisitRequest } from '@/features/properties/api/visit-requests';
import { useI18n } from '@/providers/i18n-context';

export default function VisitRequestScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [proposedAt, setProposedAt] = useState('');
  const [note, setNote] = useState('');
  const request = useMutation({
    mutationFn: () => createVisitRequest(propertyId, proposedAt, note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner', 'visit-requests'] });
      router.back();
    },
  });

  return (
    <RouteScreen title={t('visitTitle')} description={t('visitSubtitle')}>
      <FormField label={t('dateTime')} placeholder="2026-07-12 17:00" value={proposedAt} onChangeText={setProposedAt} />
      <FormField label={t('optionalMessage')} value={note} onChangeText={setNote} multiline />
      <PremiumButton label={request.isPending ? t('sending') : t('sendRequest')} loading={request.isPending} onPress={() => request.mutate()} />
      {request.error ? <Text style={{ color: colors.error }}>{request.error.message}</Text> : null}
    </RouteScreen>
  );
}
