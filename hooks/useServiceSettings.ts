import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createServiceCategory,
  deleteService,
  deleteServiceCategory,
  fetchServiceCategories,
  fetchServices,
  fetchServiceUpsellIds,
  saveService,
  uploadServiceImage,
} from '@/services/serviceSettings';
import type { CreateCategoryInput, SaveServiceInput } from '@/types/serviceSettings';

function serviceSettingsKey(companyId: string) {
  return ['serviceSettings', companyId] as const;
}

export function useServiceCategories(companyId: string | null | undefined) {
  return useQuery({
    queryKey: [...serviceSettingsKey(companyId ?? ''), 'categories'],
    queryFn: () => fetchServiceCategories(companyId!),
    enabled: !!companyId,
  });
}

export function useServices(companyId: string | null | undefined) {
  return useQuery({
    queryKey: [...serviceSettingsKey(companyId ?? ''), 'services'],
    queryFn: () => fetchServices(companyId!),
    enabled: !!companyId,
  });
}

export function useServiceSettings(companyId: string | null | undefined) {
  const categoriesQuery = useServiceCategories(companyId);
  const servicesQuery = useServices(companyId);

  return {
    categories: categoriesQuery.data ?? [],
    services: servicesQuery.data ?? [],
    loading: categoriesQuery.isLoading || servicesQuery.isLoading,
    refetch: () => Promise.all([categoriesQuery.refetch(), servicesQuery.refetch()]),
  };
}

export function useCreateServiceCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['serviceSettings', 'category', 'create'],
    mutationFn: (input: CreateCategoryInput) => createServiceCategory(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: serviceSettingsKey(variables.companyId) });
    },
  });
}

export function useDeleteServiceCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['serviceSettings', 'category', 'delete'],
    mutationFn: ({ companyId, categoryId }: { companyId: string; categoryId: string }) =>
      deleteServiceCategory(companyId, categoryId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: serviceSettingsKey(variables.companyId) });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['serviceSettings', 'service', 'delete'],
    mutationFn: ({ companyId, serviceId }: { companyId: string; serviceId: string }) =>
      deleteService(companyId, serviceId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: serviceSettingsKey(variables.companyId) });
    },
  });
}

export function useServiceUpsellIds(serviceId: string | undefined) {
  return useQuery({
    queryKey: ['serviceSettings', 'upsells', serviceId],
    queryFn: () => fetchServiceUpsellIds(serviceId!),
    enabled: !!serviceId,
  });
}

export function useSaveService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['serviceSettings', 'service', 'save'],
    mutationFn: (input: SaveServiceInput) => saveService(input),
    onSuccess: (_serviceId, variables) => {
      queryClient.invalidateQueries({ queryKey: serviceSettingsKey(variables.companyId) });
    },
  });
}

export function useUploadServiceImage() {
  return useMutation({
    mutationKey: ['serviceSettings', 'service', 'uploadImage'],
    mutationFn: ({ companyId, file }: { companyId: string; file: File }) =>
      uploadServiceImage(companyId, file),
  });
}
