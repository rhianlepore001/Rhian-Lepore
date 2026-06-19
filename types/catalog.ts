import { z } from 'zod';

import { moneyAmountSchema, uuidSchema } from './shared';

export const productSchema = z.object({
  id: uuidSchema,
  company_id: uuidSchema,
  name: z.string().min(1),
  sale_price: moneyAmountSchema,
  cost_price: moneyAmountSchema,
  stock_quantity: z.number().int().min(0),
  min_stock_quantity: z.number().int().min(0),
  is_active: z.boolean(),
  created_at: z.string().optional(),
  updated_at: z.string().nullable().optional(),
});

export const productSaleSchema = z.object({
  id: uuidSchema,
  company_id: uuidSchema,
  product_id: uuidSchema,
  appointment_id: uuidSchema.nullable().optional(),
  finance_record_id: uuidSchema.nullable().optional(),
  sold_by: uuidSchema,
  quantity: z.number().int().positive(),
  unit_sale_price: moneyAmountSchema,
  unit_cost_price: moneyAmountSchema,
  total_revenue: moneyAmountSchema,
  total_cost: moneyAmountSchema,
  created_at: z.string().optional(),
});

export const listProductsInputSchema = z.object({
  companyId: uuidSchema,
  includeInactive: z.boolean().optional().default(false),
});

export const createProductInputSchema = z.object({
  companyId: uuidSchema,
  name: z.string().trim().min(1),
  salePrice: moneyAmountSchema,
  costPrice: moneyAmountSchema,
  stockQuantity: z.number().int().min(0),
  minStockQuantity: z.number().int().min(0),
});

export const updateProductInputSchema = createProductInputSchema.partial().extend({
  companyId: uuidSchema,
  productId: uuidSchema,
  isActive: z.boolean().optional(),
});

export const sellProductInputSchema = z.object({
  productId: uuidSchema,
  quantity: z.number().int().positive(),
  appointmentId: uuidSchema.nullable().optional(),
});

export type Product = z.infer<typeof productSchema>;
export type ProductSale = z.infer<typeof productSaleSchema>;
export type ListProductsInput = z.input<typeof listProductsInputSchema>;
export type CreateProductInput = z.input<typeof createProductInputSchema>;
export type UpdateProductInput = z.input<typeof updateProductInputSchema>;
export type SellProductInput = z.input<typeof sellProductInputSchema>;
