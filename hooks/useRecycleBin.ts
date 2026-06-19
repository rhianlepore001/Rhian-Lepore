import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchDeletedItems, restoreDeletedItem } from '@/services/recycleBin';

export function useDeletedItems(resourceType?: string) {
  return useQuery({
    queryKey: ['recycleBin', resourceType ?? 'all'],
    queryFn: () => fetchDeletedItems(resourceType || null),
  });
}

export function useRestoreDeletedItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['recycleBin', 'restore'],
    mutationFn: ({ resourceType, itemId }: { resourceType: string; itemId: string }) =>
      restoreDeletedItem(resourceType, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycleBin'] });
    },
  });
}
