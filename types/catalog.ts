import { z } from 'zod';

import { moneyAmountSchema, uuidSchema } from './shared';

export const productSchema = z.object({
  id: uuidSchema,
  company_id: uuidSchema,
  name: z.string().min(1),
  sale_price: z.coerce.number().finite().nonnegative(),
  cost_price: z.coerce.number().finite().nonnegative(),
  stock_quantity: z.coerce.number().int().min(0),
  min_stock_quantity: z.coerce.number().int().min(0),
  commission_percent: z.coerce.number().min(0).max(100).default(0),
  show_in_public: z.boolean().default(true),
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
  professional_id: uuidSchema.nullable().optional(),
  client_id: uuidSchema.nullable().optional(),
  quantity: z.number().int().positive(),
  unit_sale_price: moneyAmountSchema,
  unit_cost_price: moneyAmountSchema,
  total_revenue: moneyAmountSchema,
  total_cost: moneyAmountSchema,
  commission_percent: z.coerce.number().min(0).max(100).default(0),
  commission_value: z.coerce.number().finite().nonnegative().default(0),
  created_at: z.string().optional(),
});

export const appointmentProductLineSchema = z.object({
  id: uuidSchema,
  company_id: uuidSchema,
  appointment_id: uuidSchema,
  product_id: uuidSchema,
  quantity: z.number().int().positive(),
  unit_sale_price: moneyAmountSchema,
  created_at: z.string().optional(),
});

export const publicProductCatalogItemSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  sale_price: moneyAmountSchema,
  stock_quantity: z.number().int().min(0),
});

export const productLineInputSchema = z.object({
  productId: uuidSchema,
  quantity: z.number().int().positive(),
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
  commissionPercent: z.number().min(0).max(100).optional(),
  showInPublic: z.boolean().optional(),
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
  clientId: uuidSchema.nullable().optional(),
  professionalId: uuidSchema.nullable().optional(),
  paymentMethod: z.string().trim().min(1).nullable().optional(),
});

export const setAppointmentProductLinesInputSchema = z.object({
  companyId: uuidSchema,
  appointmentId: uuidSchema,
  lines: z.array(productLineInputSchema),
});

export type Product = z.infer<typeof productSchema>;
export type ProductSale = z.infer<typeof productSaleSchema>;
export type AppointmentProductLine = z.infer<typeof appointmentProductLineSchema>;
export type PublicProductCatalogItem = z.infer<typeof publicProductCatalogItemSchema>;
export type ProductLineInput = z.infer<typeof productLineInputSchema>;
export type ListProductsInput = z.input<typeof listProductsInputSchema>;
export type CreateProductInput = z.input<typeof createProductInputSchema>;
export type UpdateProductInput = z.input<typeof updateProductInputSchema>;
export type SellProductInput = z.input<typeof sellProductInputSchema>;
export type SetAppointmentProductLinesInput = z.input<typeof setAppointmentProductLinesInputSchema>;
