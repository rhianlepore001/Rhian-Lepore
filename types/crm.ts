import { z } from 'zod';

export const loyaltyTierSchema = z.enum(['Bronze', 'Silver', 'Gold', 'Platinum']);

export const clientFilterSchema = z.enum(['Todos', 'VIP', 'Novos', 'Inativo']);

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
  birth_date: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});

export const createClientInputSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  photoUrl: z.string().nullable().optional(),
  birthDate: z.string().trim().optional().nullable(),
  /** @deprecated Preferência do sistema; mantido só para legado/importação. */
  origin: z.enum(['Novo', 'Recente', 'Antigo']).optional(),
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

export const appointmentStatRowSchema = z.object({
  client_id: z.string().min(1),
  appointment_time: z.string().min(1),
  price: z.number().nullable().optional(),
});

export type LoyaltyTier = z.infer<typeof loyaltyTierSchema>;
export type ClientFilter = z.infer<typeof clientFilterSchema>;
export type ClientRecord = z.infer<typeof clientRecordSchema>;
export type CreateClientInput = z.infer<typeof createClientInputSchema>;
export type PublicClientRecord = z.infer<typeof publicClientRecordSchema>;
export type AppointmentStatRow = z.infer<typeof appointmentStatRowSchema>;

export interface ClientStats {
  visitCount: number;
  lastVisitAt: string | null;
  firstVisitAt: string | null;
  ltv: number;
}

export interface EnrichedClient extends ClientRecord {
  visitCount: number;
  lastVisitAt: string | null;
  firstVisitAt: string | null;
  ltv: number;
  isVip: boolean;
  isInactive: boolean;
  isNew: boolean;
  birthdaySoon: boolean;
}
