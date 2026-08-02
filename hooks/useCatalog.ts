import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createProduct,
  fetchPublicProductsCatalog,
  listAppointmentProductLines,
  listProducts,
  sellProduct,
  setAppointmentProductLines,
  updateProduct,
} from '@/services/catalog';
import type {
  CreateProductInput,
  ListProductsInput,
  SellProductInput,
  SetAppointmentProductLinesInput,
  UpdateProductInput,
} from '@/types/catalog';

export function useProducts(input: ListProductsInput) {
  return useQuery({
    queryKey: ['catalog', 'products', input.companyId, input.includeInactive ?? false],
    queryFn: () => listProducts(input),
    enabled: !!input.companyId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['catalog', 'product', 'create'],
    mutationFn: (input: CreateProductInput) => createProduct(input),
    onSuccess: product => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'products', product.company_id] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['catalog', 'product', 'update'],
    mutationFn: (input: UpdateProductInput) => updateProduct(input),
    onSuccess: product => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'products', product.company_id] });
    },
  });
}

export function useSellProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['catalog', 'product', 'sell'],
    mutationFn: (input: SellProductInput) => sellProduct(input),
    onSuccess: sale => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'products', sale.company_id] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'appointment-lines'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}

export function useAppointmentProductLines(companyId: string, appointmentId: string | null | undefined) {
  return useQuery({
    queryKey: ['catalog', 'appointment-lines', companyId, appointmentId],
    queryFn: () => listAppointmentProductLines(companyId, appointmentId!),
    enabled: !!companyId && !!appointmentId,
  });
}

export function useSetAppointmentProductLines() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['catalog', 'appointment-lines', 'set'],
    mutationFn: (input: SetAppointmentProductLinesInput) => setAppointmentProductLines(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['catalog', 'appointment-lines', variables.companyId, variables.appointmentId],
      });
    },
  });
}

export function usePublicProductsCatalog(businessId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['catalog', 'public-products', businessId],
    queryFn: () => fetchPublicProductsCatalog(businessId!),
    enabled: !!businessId && enabled,
  });
}
