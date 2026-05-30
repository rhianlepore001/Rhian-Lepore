import { z } from 'zod';
import { uuidSchema } from './shared';

export const teamMemberSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  business_id: uuidSchema.nullable().optional(),
  name: z.string().min(1),
  slug: z.string().nullable().optional(),
  role: z.string().default('staff'),
  bio: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  active: z.boolean().default(true),
  display_order: z.number().int().default(0),
  commission_rate: z.number().min(0).max(100).nullable().optional(),
  commission_percent: z.number().min(0).max(100).nullable().optional(),
  cpf: z.string().nullable().optional(),
  staff_user_id: uuidSchema.nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  is_owner: z.boolean().default(false),
});

export const teamMemberInputSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório'),
  role: z.string().trim().min(1).default('staff'),
  slug: z.string().trim().min(1).optional(),
  bio: z.string().trim().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  active: z.boolean().default(true),
  commission_rate: z.number().min(0).max(100).nullable().optional(),
  commission_percent: z.number().min(0).max(100).nullable().optional(),
});

export const teamMemberUpdateSchema = teamMemberInputSchema.partial();

export type TeamMember = z.infer<typeof teamMemberSchema>;
export type TeamMemberInput = z.infer<typeof teamMemberInputSchema>;
export type TeamMemberUpdate = z.infer<typeof teamMemberUpdateSchema>;