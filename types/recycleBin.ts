import { z } from 'zod';

export const recycleResourceTypeSchema = z.enum([
  'appointments',
  'clients',
  'services',
  'financial_records',
  'team_members',
]);

export const deletedItemSchema = z.object({
  id: z.string().min(1),
  resource_type: recycleResourceTypeSchema,
  name: z.string(),
  deleted_at: z.string(),
  days_until_permanent: z.number(),
});

export type RecycleResourceType = z.infer<typeof recycleResourceTypeSchema>;
export type DeletedItem = z.infer<typeof deletedItemSchema>;
