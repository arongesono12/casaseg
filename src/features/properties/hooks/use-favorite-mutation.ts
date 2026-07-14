import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addFavorite, removeFavorite } from '@/features/properties/api/property.mutations';
import { propertyKeys } from '@/features/properties/api/property.keys';

export function useFavoriteMutation(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'offlineFirst',
    mutationFn: ({ propertyId, favorite }: { propertyId: string; favorite: boolean }) => favorite ? addFavorite(userId, propertyId) : removeFavorite(userId, propertyId),
    onMutate: async ({ propertyId, favorite }) => {
      const key = propertyKeys.favorites(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key) ?? [];
      queryClient.setQueryData<string[]>(key, favorite ? [...new Set([...previous, propertyId])] : previous.filter((id) => id !== propertyId));
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(propertyKeys.favorites(userId), context?.previous ?? []),
    onSettled: () => queryClient.invalidateQueries({ queryKey: propertyKeys.favorites(userId) }),
  });
}
