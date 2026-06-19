import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createProduct, listProducts, sellProduct, updateProduct } from '@/services/catalog';
import type { CreateProductInput, ListProductsInput, SellProductInput, UpdateProductInput } from '@/types/catalog';

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
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}
