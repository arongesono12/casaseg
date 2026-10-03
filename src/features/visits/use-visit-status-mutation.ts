import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateVisitRequestStatus, visitRequestKeys } from '@/features/properties/api/visit-requests';
import type { VisitRequestStatus } from '@/features/visits/visit-schedule';
import { haptics } from '@/lib/haptics';

/** Cambia el estado de una solicitud y refresca las listas del propietario y del inquilino. */
export function useVisitStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: VisitRequestStatus }) => updateVisitRequestStatus(id, status),
    onSuccess: async () => {
      haptics.success();
      await queryClient.invalidateQueries({ queryKey: visitRequestKeys.all });
    },
    onError: () => haptics.error(),
  });
}
