import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchBusinessSettings,
  updateBusinessSettings,
  fetchProfileFields,
  updateProfileFields,
} from '@/services/settings';
import type { BusinessSettingsUpdate, ProfileFields } from '@/types/settings';

export function useBusinessSettings() {
  const { companyId } = useAuth();

  return useQuery({
    queryKey: ['settings', companyId, 'business'],
    queryFn: () => fetchBusinessSettings(companyId!),
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateBusinessSettings() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: BusinessSettingsUpdate) =>
      updateBusinessSettings(companyId!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', companyId, 'business'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', companyId] });
    },
  });
}

export function useProfileFields() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['settings', user?.id, 'profile'],
    queryFn: () => fetchProfileFields(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfileFields() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: ProfileFields) =>
      updateProfileFields(user!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', user?.id, 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'profile', user?.id] });
    },
  });
}