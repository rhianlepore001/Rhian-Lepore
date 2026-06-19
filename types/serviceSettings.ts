import { z } from 'zod';

export const serviceCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  display_order: z.number(),
  user_id: z.string().min(1),
});

export const serviceItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional().transform(v => v ?? ''),
  price: z.number(),
  duration_minutes: z.number(),
  category_id: z.string().min(1),
  image_url: z.string().nullable().optional().transform(v => v ?? null),
  active: z.boolean(),
  user_id: z.string().min(1),
});

export const saveServiceInputSchema = z.object({
  companyId: z.string().min(1),
  serviceId: z.string().min(1).optional(),
  name: z.string().trim().min(1),
  description: z.string(),
  price: z.number().nonnegative(),
  durationMinutes: z.number().int().positive(),
  categoryId: z.string().min(1),
  active: z.boolean(),
  imageUrl: z.string().nullable().optional(),
  upsellIds: z.array(z.string().min(1)).default([]),
});

export const createCategoryInputSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().trim().min(1),
  displayOrder: z.number().int().nonnegative(),
});

export type ServiceCategory = z.infer<typeof serviceCategorySchema>;
export type ServiceItem = z.infer<typeof serviceItemSchema>;
export type SaveServiceInput = z.infer<typeof saveServiceInputSchema>;
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;
