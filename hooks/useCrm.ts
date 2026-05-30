import { useMutation } from '@tanstack/react-query';
import { createClient, syncPublicClientsToCrm } from '@/services/crm';

export function useCreateClient() {
  return useMutation({
    mutationKey: ['crm', 'create-client'],
    mutationFn: createClient,
  });
}

export function useSyncPublicClientsToCrm() {
  return useMutation({
    mutationKey: ['crm', 'sync-public-clients'],
    mutationFn: syncPublicClientsToCrm,
  });
}
