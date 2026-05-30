import { z } from 'zod';

export const loyaltyTierSchema = z.enum(['Bronze', 'Silver', 'Gold', 'Platinum']);

export const clientRecordSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  loyalty_tier: loyaltyTierSchema.nullable().optional(),
  total_visits: z.number().nullable().optional(),
  rating: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
});

export const createClientInputSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  photoUrl: z.string().nullable().optional(),
  origin: z.enum(['Novo', 'Recente', 'Antigo']).default('Novo'),
  source: z.string().optional(),
});

export const publicClientRecordSchema = z.object({
  id: z.string().min(1),
  business_id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
});

export type LoyaltyTier = z.infer<typeof loyaltyTierSchema>;
export type ClientRecord = z.infer<typeof clientRecordSchema>;
export type CreateClientInput = z.infer<typeof createClientInputSchema>;
export type PublicClientRecord = z.infer<typeof publicClientRecordSchema>;
